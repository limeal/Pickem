import {
    AnySelectMenuInteraction,
    Collection
} from 'discord.js';

import BaseInteraction from '../classes/BaseInteraction';
import BaseSelect from 'classes/BaseSelect';
import prisma from 'prisma';
import InteractionProps from '@interfaces/InteractionProps';
import { InvokeNextQuestion } from 'services/form.service';
import { FormQuestion } from '@prisma/client';

export default (props: InteractionProps) => new (class FormQuestionSelect extends BaseSelect implements BaseInteraction {
    Question: FormQuestion;

    constructor() {
        const question = props.params.get('question') as FormQuestion;
        super(props.custom_id, 'STRING', question?.answers?.length, question?.answers?.length, question?.choices);
        this.Question = {...question};
    }

    unwrap() {
        return this.select;
    }

    async execute(interaction: AnySelectMenuInteraction) {

        // Get content selected by the interaction
        const values = interaction.values;
        
        // Check if values is the same as answers
        let count = 0;
        for (let i = 0; i < this.Question.answers.length; i++) {
            count += (this.Question?.answers[i].toUpperCase() === values[i].toUpperCase().replace('_', ' ') ? 1 : 0)
        }

        const userResponse = await prisma.userResponse.findFirst({
            where: {
                userId: interaction.user.id
            }
        })

        if (!userResponse || !this.Question?.id)
            return await interaction.reply({ content: 'ERR L002 - An error occured, contact admin.' })

        if (count === this.Question?.answers?.length) {
            await prisma.userResponse.update({
                where: {
                    userId: interaction.user.id
                },
                data: {
                    score: { increment: 1 }
                }
            })
        }

        await prisma.userSubmission.create({
            data: {
                questionId: this.Question.id,
                userRespId: userResponse.id,
                answers: values,
                done: true
            }
        })

        // If not we just update the question index, if it's the last question, we end the form, if not we send the next question
        await InvokeNextQuestion(interaction, props.manager);
    }

})