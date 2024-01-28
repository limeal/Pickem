import { ActionRowBuilder, AttachmentBuilder, PermissionFlagsBits, ChannelType, Guild, Message, MessageComponentInteraction, ModalSubmitInteraction, TextChannel, User, CommandInteraction } from 'discord.js';
import { FormQuestion, FormQuestionType, FormStatus, UserResponseStatus } from '@prisma/client';

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
import UserService from './user.service';

const ajv = new Ajv();
const validateCreate = ajv
    .addSchema(Schemas.coordsSchema, 'coords')
    .addSchema(Schemas.questionSchema, 'question')
    .addSchema(Schemas.categorySchema, 'category')
    .compile(Schemas.baseSchema)

const validateInject = ajv
    .compile(Schemas.answersSchema)

export default class FormService {

    static DenyPermissionOverwrites = [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.SendTTSMessages,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.EmbedLinks,
    ]

    private static async getFileData(file_loc: string) {
        let filedata: any = null;

        if (file_loc.startsWith('http://') || file_loc.startsWith('https://')) {
            try {
                const fetchRes = await fetch(file_loc);
                filedata = await fetchRes.json();
            } catch (err) {
                throw `File ${file_loc} does not exist.`;
            }
        } else {
            const filePath = path.join(process.env.TEMPLATE_FOLDER || 'templates', `/${file_loc}.json`);

            if (!fs.existsSync(filePath))
                throw `File ${filePath} does not exist.`
            filedata = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        }

        return filedata;
    }

    public static async Create(interaction: CommandInteraction, form_name: string, file_loc: string, guild: Guild) {

        const fform = await prisma.form.findFirst({
            where: {
                title: form_name,
            },
        });

        if (fform) return interaction.reply({ content: 'A form with that name already exists.', ephemeral: true });
        try {
            let filedata: any = await FormService.getFileData(file_loc);


            // Check if file is valid
            const valid = validateCreate(filedata);
            if (!valid) {
                return interaction.reply({ content: validateCreate.errors?.map((error: any) => error.message).join('\n') || 'Invalid file.', ephemeral: true })
            }

            // Count number of forms in guild
            const numberForms = await prisma.form.count() ?? 0;

            const denyPermissionOverwrites = [...this.DenyPermissionOverwrites]
            if (numberForms !== 0) {
                denyPermissionOverwrites.push(PermissionFlagsBits.ViewChannel);
            }

            // Create Result channel
            const resultChannel = await guild.channels.create({
                name: `${form_name}-results`,
                type: ChannelType.GuildText,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: denyPermissionOverwrites,
                    },
                ],
            })

            // Create empty form
            let form = null;
            try {
                form = await prisma.form.create({
                    data: {
                        title: form_name!,
                        active: numberForms === 0,
                        resultChannelId: resultChannel.id,
                    },
                });

                await pickmeParser(form.id, filedata as any);
                return interaction.reply({ content: `Form ${form_name} created.`, ephemeral: true });
            } catch (error) {
                // Delete form if error
                if (form) {
                    await prisma.form.delete({
                        where: {
                            id: form.id,
                        },
                    });
                }

                return interaction.reply({ content: `An error occurred while creating form ${form_name}`, ephemeral: true });
            }

            return form;

        } catch (error: any) { return interaction.reply({ content: error, ephemeral: true }); }
    }

    public static async Inject(interaction: CommandInteraction, file_loc: string, guild: Guild) {
        const fform = await prisma.form.findFirst({
            where: {
                active: true,
                status: FormStatus.OPEN,
            },
            include: {
                questions: {
                    include: {
                        choices: true,
                    }
                },
            }
        });

        if (!fform) return interaction.reply({ content: 'A form with that name does not exist/ is closed.', ephemeral: true });
        try {
            let filedata: { ref: number, answers: string[] }[] = await FormService.getFileData(file_loc);

            // Check if file is valid
            const valid = validateInject(filedata);
            if (!valid) {
                throw validateInject.errors?.map((error: any) => error.message).join('\n') || 'Invalid file.'
            }

            for (const data of filedata) {
                const question = fform.questions.find((q: FormQuestion) => q.ref === data.ref);
                if (!question) continue;

                let ok: boolean = question.type !== FormQuestionType.SELECT;
                for (const choice of question.choices) {
                    if (ok) break;
                    // Check if at least on element in answers is equals to an element in choice.values
                    if (data.answers.some((a: string) => choice.values.includes(a))) {
                        ok = true;
                        break;
                    }
                }

                if (!ok) return await interaction.reply({ content: `Invalid answer for question ${question.title}.`, ephemeral: true });

                await prisma.formQuestion.update({
                    where: {
                        id: question?.id,
                    },
                    data: {
                        answers: data.answers
                    }
                })
            }



            // CLose form
            await prisma.form.update({
                where: {
                    id: fform.id,
                },
                data: {
                    status: FormStatus.CLOSED,
                },
            });

            const userResponses = await prisma.userResponse.findMany({
                where: {
                    formId: fform.id,
                },
                include: {
                    submissions: true,
                }
            });

            for (const userResponse of userResponses) {
                if (userResponse.status === UserResponseStatus.PENDING) continue;

                try {
                    console.log(userResponse.userId);
                    await UserService.UpdateScore(userResponse);
                } catch (err) {
                    console.log(err);
                }
            }

            return await interaction.reply({ content: `Injection successful.`, ephemeral: true });
        } catch (error: any) { return interaction.reply({ content: error, ephemeral: true }); }
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

            if (!userResponse) throw 'An error occured, please contact an admin.';

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

            if (!form) throw 'An error occured, please contact an admin.';
            if (form.status === FormStatus.CLOSED) throw 'This form is closed.';

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

                return await ResultService.Create(interaction!, user, form, userResponse);
            }

            if (interaction) await interaction.deferUpdate();
            const nextQuestionCategory = nextQuestion.categoryId;
            if (nextQuestionCategory !== userResponse?.category?.id) {
                // Send category image
                const tcategory = form?.categories.find((c: any) => c.id === nextQuestionCategory);
                if (!tcategory) {
                    return await gChannel!.send({
                        content: 'An error occured, please contact an admin.',
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

            const t = form.questions.filter(q => q.type !== FormQuestionType.MULTIPART);
            const v = form.questions.slice(0, userResponse.nextIndex).filter(q => q.type === FormQuestionType.MULTIPART);
            let payload: any = QuestionHeaderMessage(nextQuestion, userResponse.nextIndex - v.length, t.length - 1);

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
                        return await gChannel!.send({
                            content: 'An error occured, please contact an admin.',
                        })
                    })

            if (nextQuestion.linkedId) {
                const linkSubmissionMessage = userResponse?.submissions?.find((s: any) => s.questionId === nextQuestion.linkedId);
                if (!linkSubmissionMessage) {
                    return await gChannel!.send({
                        content: 'An error occured, please contact an admin.',
                    })
                }

                return gChannel!.messages.fetch(linkSubmissionMessage.messageId).then((message) => handleMultipart(message.edit(payload)));
            }

            return handleMultipart(gChannel!.send(payload));
        } catch (error: any) {
            console.log(error);
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
        if (!config) throw 'An error occured, please contact an admin.';

        // Get current active form
        const currentActiveForm = await prisma.form.findFirst({
            where: {
                active: true,
            },
        });

        if (currentActiveForm && currentActiveForm.title === name) return;

        if (currentActiveForm)
            guild.channels.cache.get(currentActiveForm.resultChannelId)?.edit({
                permissionOverwrites: [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel, ...this.DenyPermissionOverwrites],
                    }
                ]
            })
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

        const newForm = await prisma.form.findFirst({
            where: {
                title: name,
            },
        });

        if (!newForm) throw 'An error occured, please contact an admin.';

        let resultChannel = await guild.channels.fetch(newForm.resultChannelId);

        if (!categoryForm || categoryForm.type !== ChannelType.GuildCategory || !resultChannel || resultChannel.type !== ChannelType.GuildText)
            throw 'An error occured, please contact an admin.';

        resultChannel = await resultChannel.edit({
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: this.DenyPermissionOverwrites,
                    allow: [PermissionFlagsBits.ViewChannel]
                }
            ]
        })

        categoryForm.children.cache.forEach(async (channel: any) => {
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

    public static async Delete(name: string, guild: Guild) {
        const config = await prisma.config.findFirst();
        if (!config) throw 'An error occured, please contact an admin.';

        const form = await prisma.form.findFirst({
            where: {
                title: name,
            },
        });

        if (!form) throw 'An error occured, please contact an admin.';
        let resultChannel = await guild.channels.fetch(form.resultChannelId);

        const categoryForm = await guild.channels.fetch(config?.formCategoryId);


        if (!categoryForm || categoryForm.type !== ChannelType.GuildCategory || !resultChannel || resultChannel.type !== ChannelType.GuildText)
            throw 'An error occured, please contact an admin.';

        categoryForm.children.cache.forEach(async (channel: any) => {
            await channel.delete();
        });
        await resultChannel.delete();

        return await prisma.form.delete({
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