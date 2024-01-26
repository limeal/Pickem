import Ajv from 'ajv';
import path from 'path';
import fs from 'fs';

import prisma from '../prisma';
import Schemas from '../misc/ajv/index';
import { ActionRowBuilder, AttachmentBuilder, CategoryChannel, ChannelType, Colors, EmbedBuilder, Guild, MessageComponentInteraction, TextChannel, User } from 'discord.js';
import pickmeParser from 'misc/pickme-parser';
import { InteractionManager } from '@interfaces/InteractionProps';
import FormQuestionSelect from 'interactions/form-question-select';
import QuestionHeaderMessage from 'messages/QuestionHeaderMessage';
import CreateResult from './result.service';
import { FormCron } from '@prisma/client';

const ajv = new Ajv();
const validate = ajv
    .addSchema(Schemas.coordsSchema, 'coords')
    .addSchema(Schemas.questionSchema, 'question')
    .addSchema(Schemas.categorySchema, 'category')
    .compile(Schemas.baseSchema)

const CreateForm = async (form_name: string, question_filename: string, guildId: string) => {

    const filePath = path.join(process.env.TEMPLATE_FOLDER || 'templates', `/${question_filename}.json`);

    // Check if file exists in DATA_FOLDER
    if (!fs.existsSync(filePath)) {
        throw `File ${question_filename}.json does not exist.`;
    }

    const filedata: any = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    // Check if file is valid
    const valid = validate(filedata);
    if (!valid) {
        throw validate.errors?.map((error: any) => error.message).join('\n') || 'Invalid file.'
    }

    // Count number of forms in guild
    const numberForms = await prisma.form.count() ?? 0;

    // Create empty form
    const form = await prisma.form.create({
        data: {
            title: form_name!,
            active: numberForms === 0,
        },
    });

    if (!form) {
        throw 'Failed to create form. !'
    }

    // Load file
    try {
        await pickmeParser(form.id, filedata as any);
    } catch (error) {
        // Delete form if error
        await prisma.form.delete({
            where: {
                id: form.id,
            },
        });

        throw error;
    }

    return form;
}

const InvokeNextQuestion = async (interaction: MessageComponentInteraction, interactionManager: InteractionManager) => {
    const userResponse = await prisma.userResponse.findFirst({
        where: {
            userId: interaction.user.id,
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

    if (userResponse?.status === 'completed') {
        return interaction.reply({
            content: 'You have already completed this form.',
            ephemeral: true,
        })
    }

    if (!interaction.channel || !(interaction.channel instanceof TextChannel)) {
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
                    questions: true,
                }
            },
        },
    });

    if (!form) {
        return interaction.reply({
            content: 'There are no active forms.',
            ephemeral: true,
        })
    }

    let nextQuestionIdx = 0;
    for (let i = 0; i < form.questions.length; i++) {
        // Check if questionId exist in userResponses submissions
        if (userResponse?.submissions?.find((s: any) => s.questionId === form.questions[i].id && s.done)) {
            console.log(`The question ${form.questions[i]} has already been answered.`);
            nextQuestionIdx++;
        }
    }

    const nextQuestion = form?.questions.at(nextQuestionIdx)
    if (!nextQuestion) {
        // Update the status to COMPLETE For UserResponse
        await prisma.userResponse.update({
            where: {
                id: userResponse?.id,
                userId: interaction.user.id,
            },
            data: {
                status: 'completed',
            },
        });

        if (!userResponse?.submissions) {
            return await interaction.reply({
                content: 'An error has occured !',
                ephemeral: true,
            })
        }

        console.log(userResponse?.submissions);
        //return await interaction.reply({ content: 'You have completed the form.', ephemeral: true });
        return await CreateResult(interaction, interaction.user, userResponse.submissions);
    }

    await interaction.deferUpdate();
    const nextQuestionCategory = nextQuestion.categoryId;
    if (nextQuestionCategory !== userResponse?.category?.id) {
        // Send category image
        const tcategory = form?.categories.find((c: any) => c.id === nextQuestionCategory);
        if (!tcategory) {
            return await interaction.channel.send({
                content: 'ERR L008 - An error occured, please contact an admin.',
            })
        }

        await interaction.channel?.send({
            files: [new AttachmentBuilder(`assets/images/${tcategory.icon}`)],
        });

        await prisma.userResponse.update({
            where: {
                id: userResponse?.id,
                userId: interaction.user.id,
            },
            data: {
                categoryId: nextQuestionCategory,
            },
        });
    }

    console.log(nextQuestion);
    interactionManager.Set(`pickem_form_question_select_${interaction.user.id}`, FormQuestionSelect, {
        key: 'question',
        value: nextQuestion
    });


    await interaction.channel.send({
        ...QuestionHeaderMessage(nextQuestion.title, nextQuestion.answers.length, userResponse?.score || 0, nextQuestionIdx, form.questions.length),
        components: [
            new ActionRowBuilder<any>().addComponents(interactionManager.Get(`pickem_form_question_select_${interaction.user.id}`)!.unwrap())
        ]
    })

    return 0;
}

const ChangeForm = async (id: number, guild: Guild) => {
    const config = await prisma.config.findFirst();
    if (!config) throw 'ERR L003 - An error occured, please contact an admin.';
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
    
    if (!categoryForm || categoryForm.type !== ChannelType.GuildCategory || !resultCategory || resultCategory.type !==  ChannelType.GuildCategory)
        throw 'ERR L004 - An error occured, please contact an admin.';
    
    categoryForm.children.cache.forEach(async (channel: any) => {
        await channel.delete();
    });

    resultCategory.children.cache.forEach(async (channel: any) => {
        await channel.delete();
    });

    // Activate form
    await prisma.form.update({
        where: {
            id,
        },
        data: {
            active: true,
        },
    });
}

const DeleteForm = async (id: number) => {
    await prisma.form.delete({
        where: {
            id,
        },
    });
}

const GetForms = async () => {
    return await prisma.form.findMany();
}

export {
    CreateForm,
    InvokeNextQuestion,
    ChangeForm,
    DeleteForm,
    GetForms,
}