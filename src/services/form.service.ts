import { ActionRowBuilder, AttachmentBuilder, ChannelType, Guild, Message, MessageComponentInteraction, ModalSubmitInteraction, TextChannel, User } from 'discord.js';
import { FormQuestionType, UserResponseStatus } from '@prisma/client';

import Ajv from 'ajv';
import path from 'path';
import fs from 'fs';

import prisma from '../prisma';
import Schemas from '../misc/ajv/index';
import pickmeParser from 'misc/pickme-parser';
import { InteractionManager } from '@interfaces/InteractionProps';
import FormQuestionSelect from 'interactions/form-question-select';
import FormQuestionButton from 'interactions/form-question-button';
import QuestionHeaderMessage from 'messages/QuestionHeaderMessage';
import ResultService from './result.service';

const ajv = new Ajv();
const validate = ajv
    .addSchema(Schemas.coordsSchema, 'coords')
    .addSchema(Schemas.questionSchema, 'question')
    .addSchema(Schemas.categorySchema, 'category')
    .compile(Schemas.baseSchema)

export default class FormService {

    public static async Create(form_name: string, file_loc: string, guildId: string) {

        const fform = await prisma.form.findFirst({
            where: {
                title: form_name,
            },
        });

        if (fform) throw 'Form already exists.';
        let filedata: any = null;

        if (file_loc.startsWith('http://') || file_loc.startsWith('https://')) {
            const fetchRes = await fetch(file_loc);
            filedata = await fetchRes.json();
        } else {
            const filePath = path.join(process.env.TEMPLATE_FOLDER || 'templates', `/${file_loc}.json`);

            if (!fs.existsSync(filePath))
                throw `File ${file_loc}.json does not exist.`;


            filedata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }
    
        // Check if file is valid
        const valid = validate(filedata);
        if (!valid) {
            throw validate.errors?.map((error: any) => error.message).join('\n') || 'Invalid file.'
        }

        // Count number of forms in guild
        const numberForms = await prisma.form.count() ?? 0;

        // Create empty form
        let form = null;
        try {
            form = await prisma.form.create({
                data: {
                    title: form_name!,
                    active: numberForms === 0,
                },
            });

            await pickmeParser(form.id, filedata as any);
        } catch (error) {
            // Delete form if error
            if (form) {
                await prisma.form.delete({
                    where: {
                        id: form.id,
                    },
                });
            }

            throw error;
        }

        return form;
    }

    public static async InvokeNextQuestion({
        user,
        channel,
        interaction,
        imanager
    }: {
        user: User,
        channel?: TextChannel,
        interaction?: MessageComponentInteraction | ModalSubmitInteraction,
        imanager: InteractionManager,
    }): Promise<any> {

        let gChannel = interaction ? interaction.channel as TextChannel : channel;

        try {
            const userResponse = await prisma.userResponse.findFirst({
                where: {
                    userId: user.id,
                },
                include: {
                    category: true,
                    submissions: {
                        orderBy: {
                            createdAt: 'asc'
                        }
                    },
                }
            })

            if (!userResponse) throw 'ERR L001 - An error occured, please contact an admin.';

            if (interaction && userResponse?.status === UserResponseStatus.COMPLETED) {
                return interaction.reply({
                    content: 'You have already completed this form.',
                    ephemeral: true,
                })
            }

            if (interaction && (!interaction.channel || !(interaction.channel instanceof TextChannel))) {
                return interaction.reply({
                    content: 'This command can only be used in a text channel.',
                    ephemeral: true,
                })
            }


            const form = await prisma.form.findFirst({
                where: {
                    active: true,
                },
                include: {
                    categories: true,
                    questions: {
                        include: {
                            choices: true,
                            questions: true,
                        }
                    },
                },
            });

            if (!form) throw 'ERR L002 - An error occured, please contact an admin.';

            const nextQuestion = form?.questions.at(userResponse.nextIndex);
            if (!nextQuestion) {
                // Update the status to COMPLETE For UserResponse
                await prisma.userResponse.update({
                    where: {
                        id: userResponse?.id,
                        userId: user.id,
                    },
                    data: {
                        status: UserResponseStatus.COMPLETED,
                    },
                });

                if (interaction && !userResponse?.submissions) {
                    return await interaction.reply({
                        content: 'An error has occured !',
                        ephemeral: true,
                    })
                }

                console.log(userResponse?.submissions);
                return await ResultService.Create(interaction!, user, userResponse, userResponse.submissions);
            }

            if (interaction) await interaction.deferUpdate();
            const nextQuestionCategory = nextQuestion.categoryId;
            if (nextQuestionCategory !== userResponse?.category?.id) {
                // Send category image
                const tcategory = form?.categories.find((c: any) => c.id === nextQuestionCategory);
                if (!tcategory) {
                    return await gChannel!.send({
                        content: 'ERR L008 - An error occured, please contact an admin.',
                    })
                }

                await gChannel!.send({
                    files: [new AttachmentBuilder(`assets/images/${tcategory.icon}`)],
                });

                await prisma.userResponse.update({
                    where: {
                        id: userResponse?.id,
                        userId: user.id,
                    },
                    data: {
                        categoryId: nextQuestionCategory,
                    },
                });
            }

            let payload: any = QuestionHeaderMessage(nextQuestion, userResponse?.score || 0, userResponse.nextIndex, form.questions.filter(q => q.type !== FormQuestionType.MULTIPART).length);

            if (nextQuestion.type !== FormQuestionType.MULTIPART) {
                imanager.Set(`pickem_form_question_${user.id}`, nextQuestion.type == FormQuestionType.SELECT ? FormQuestionSelect : FormQuestionButton, {
                    key: 'question',
                    value: nextQuestion
                }, {
                    key: 'last_submissions',
                    value: userResponse?.submissions
                });

                payload = {
                    ...payload,
                    components: [
                        new ActionRowBuilder<any>().addComponents(imanager.Get(`pickem_form_question_${user.id}`)!.unwrap())
                    ]
                }
            }

            let handleMultipart = (message: Promise<Message<true>>) =>
                message.then(async (message) => {
                    if (nextQuestion.type !== FormQuestionType.MULTIPART) return;

                    await prisma.userResponse.update({
                        where: {
                            id: userResponse?.id,
                            userId: user.id,
                        },
                        data: {
                            nextIndex: { increment: 1 }
                        },
                    });

                    return await prisma.userSubmission.create({
                        data: {
                            questionId: nextQuestion.id,
                            userRespId: userResponse?.id,
                            done: true,
                        },
                    });
                })
                    .then(async () => {
                        if (nextQuestion.type !== FormQuestionType.MULTIPART) return;
                        return await FormService.InvokeNextQuestion({ user, channel: gChannel, imanager })
                    }).catch(async (error) => {
                        console.log(error);
                        return await gChannel!.send({
                            content: 'ERR L007 - An error occured, please contact an admin.',
                        })
                    })

            if (nextQuestion.linkedId) {
                const linkSubmissionMessage = userResponse?.submissions?.find((s: any) => s.questionId === nextQuestion.linkedId);
                if (!linkSubmissionMessage) {
                    return await gChannel!.send({
                        content: 'ERR L009 - An error occured, please contact an admin.',
                    })
                }

                return gChannel!.messages.fetch(linkSubmissionMessage.messageId).then((message) => handleMultipart(message.edit(payload)));
            }

            return handleMultipart(gChannel!.send(payload));
        } catch (error: any) {
            if (interaction)
                return await interaction.reply({
                    content: 'An error occured, please contact an admin.',
                    ephemeral: true,
                })

            return await gChannel!.send({
                content: 'An error occured, please contact an admin.'
            })
        }
    }

    public static async Switch(name: string, guild: Guild) {
        const config = await prisma.config.findFirst();
        if (!config) throw 'ERR L003 - An error occured, please contact an admin.';

        // Get current active form
        const currentActiveForm = await prisma.form.findFirst({
            where: {
                active: true,
            },
        });

        if (currentActiveForm && currentActiveForm.title === name) return;

        // Deactivate all forms
        await prisma.form.updateMany({
            where: {
                active: true,
            },
            data: {
                active: false,
            },
        });

        // Delete all responses
        await prisma.userResponse.deleteMany();

        const categoryForm = await guild.channels.fetch(config?.formCategoryId);
        const resultCategory = await guild.channels.fetch(config?.resultCategoryId);

        if (!categoryForm || categoryForm.type !== ChannelType.GuildCategory || !resultCategory || resultCategory.type !== ChannelType.GuildCategory)
            throw 'ERR L004 - An error occured, please contact an admin.';

        categoryForm.children.cache.forEach(async (channel: any) => {
            await channel.delete();
        });

        resultCategory.children.cache.forEach(async (channel: any) => {
            await channel.delete();
        });

        return await prisma.form.update({
            where: {
                title: name,
            },
            data: {
                active: true,
            },
        });
    }

    public static async Delete(name: string) {
        await prisma.form.delete({
            where: {
                title: name,
            },
        });
    }

    public static async GetAll() {
        return await prisma.form.findMany({
            include: {
                cron: true,
            }
        });
    }
}