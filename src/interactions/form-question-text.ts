import {
    ActionRowBuilder,
    AnySelectMenuInteraction,
    ButtonBuilder,
    Collection,
    Message,
    ModalSubmitInteraction,
    TextInputStyle
} from 'discord.js';

import BaseInteraction from '../classes/BaseInteraction';
import BaseSelect from 'classes/BaseSelect';
import prisma from 'prisma';
import InteractionProps from '@interfaces/InteractionProps';
import { FormQuestion, FormQuestionChoice, UserSubmission } from '@prisma/client';
import BaseModal from 'classes/BaseModal';
import FormService from 'services/form.service';
import SubmitQuestionMessage from 'messages/SubmitQuestionMessage';

export default (props: InteractionProps) => new (class FormQuestionText extends BaseModal implements BaseInteraction {
    private question: (FormQuestion & {
        choices: FormQuestionChoice[];
    });
    private message: Message;

    constructor() {
        const question = props.params.get('question') as (FormQuestion & { choices: FormQuestionChoice[] });
        const message = props.params.get('message') as Message;

        super({
            customId: props.custom_id,
            title: question?.title || 'Question',
        }, [
            {
                customId: 'form_question_answer',
                label: "Votre réponse",
                placeholder: question?.title || 'Question',
                style: TextInputStyle.Short,
                required: true
            }
        ]);

        this.question = { ...question };
        this.message = message;
    }

    unwrap() {
        return this.modal;
    }

    async execute(interaction: ModalSubmitInteraction) {

        // Get content selected by the interaction
        const answer = interaction.fields.getTextInputValue('form_question_answer');

        // Check if answer match the regex
        if (!answer.match(this.question.regex))
            return interaction.reply({ content: 'Réponse impossible, merci de reessayer.', ephemeral: true });

        // Check if values is the same as answers
        let count = 0;
        for (let i = 0; i < this.question.answers.length; i++) {
            count += (this.question?.answers[i].toUpperCase() === answer.toUpperCase().replaceAll('_', ' ') ? 1 : 0)
        }

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
                    messageId: interaction.message?.id,
                    answers: [answer],
                    done: true
                }
            })

            // Remove component from message
            await this.message.edit(SubmitQuestionMessage(this.question.title, [answer]));

            // If not we just update the question index, if it's the last question, we end the form, if not we send the next question
            return await FormService.InvokeNextQuestion({ interaction, imanager: props.manager, user: interaction.user });
        } catch (error: any) {
            await this.message.edit({
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