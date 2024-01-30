import {
    ActionRowBuilder,
    AnySelectMenuInteraction,
    ButtonBuilder,
    Collection
} from 'discord.js';

import BaseInteraction from '../classes/BaseInteraction';
import BaseSelect from 'classes/BaseSelect';
import prisma from 'prisma';
import InteractionProps from '@interfaces/InteractionProps';
import { FormQuestion, FormQuestionChoice, UserSubmission } from '@prisma/client';
import FormService from 'services/form.service';
import SubmitQuestionMessage from 'messages/SubmitQuestionMessage';
import ReloadQuestionButton from './reload-question-button';

export default (props: InteractionProps) => new (class FormQuestionSelect extends BaseSelect implements BaseInteraction {
    question: (FormQuestion & {
        choices: FormQuestionChoice[];
    });

    constructor() {
        const question = props.params.get('question') as (FormQuestion & { choices: FormQuestionChoice[] });
        const last_submissions = props.params.get('last_submissions') as UserSubmission[];

        let qChoices: string[] = [];
        if (question?.linkedId) {
            const linked = last_submissions.find(s => s.questionId === question.linkedId);
            if (!linked) throw new Error('Invalid linked question !');
            qChoices = question.choices.find(c => c.category === linked.answers[0])?.values || [];
        } else
            qChoices = question?.choices.find(c => c.category === 'default')?.values || [];


        super(props.custom_id, 'STRING', question?.nb_answers, question?.nb_answers, qChoices);
        this.question = { ...question };
    }

    unwrap() {
        return this.select;
    }

    async execute(interaction: AnySelectMenuInteraction) {

        // Get content selected by the interaction
        const values = interaction.values;

        try {
            const userResponse = await prisma.userResponse.findFirst({
                where: {
                    userId: interaction.user.id
                }
            })

            if (!userResponse) throw new Error('Could not find user response, please try again.');

            await prisma.userResponse.update({
                where: {
                    userId: interaction.user.id
                },
                data: {
                    nextIndex: { increment: 1 }
                }
            })

            await prisma.userSubmission.create({
                data: {
                    questionId: this.question.id,
                    userRespId: userResponse.id,
                    messageId: interaction.message.id,
                    answers: values,
                    done: true
                }
            })

            // Remove component from message
            await interaction.message.edit(SubmitQuestionMessage(this.question.title, values));

            // If not we just update the question index, if it's the last question, we end the form, if not we send the next question
            return await FormService.InvokeNextQuestion({
                interaction,
                imanager: props.manager,
                user: interaction.user,
            });
        } catch (error: any) {
            await interaction.message.edit({
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        props.manager.Get('reload-question-button')!.unwrap())
                    ]
                });
            return interaction.reply({
                content: 'Une erreur est survenue, veuillez réessayer en cliquant sur le bouton ci-dessus.',
                ephemeral: true,
            });
        }
    }

})