import {
    ButtonStyle,
    ButtonInteraction,
} from 'discord.js';

import BaseInteraction from '../classes/BaseInteraction';
import BaseButton from '../classes/BaseButton';
import InteractionProps from '@interfaces/InteractionProps';
import { FormQuestion, FormQuestionChoice } from '@prisma/client';
import formQuestionText from './form-question-text';

export default (props: InteractionProps) => new (class FormQuestionButton extends BaseButton implements BaseInteraction {
    Question: (FormQuestion & {
        choices: FormQuestionChoice[];
    });

    constructor() {
        const question = props.params.get('question') as (FormQuestion & { choices: FormQuestionChoice[] });
        let buttonStyle : ButtonStyle = ButtonStyle.Primary;

        switch (question?.style) {
            case 'primary':
                buttonStyle = ButtonStyle.Primary;
                break;
            case 'secondary':
                buttonStyle = ButtonStyle.Secondary;
                break;
            case 'success':
                buttonStyle = ButtonStyle.Success;
                break;
            case 'danger':
                buttonStyle = ButtonStyle.Danger;
                break;
            case 'link':
                buttonStyle = ButtonStyle.Link;
                break;
        }

        super({
            customId: props.custom_id,
            title: "Ouvrir",
            style: buttonStyle,
            emoji: '🎲'
        });

        this.Question = {...question};
    }

    unwrap() {
        return this.button;
    }

    async execute(interaction: ButtonInteraction) {

        props.manager.Set(`pickem_form_question_modal_${interaction.user.id}`, formQuestionText, {
            key: 'question',
            value: this.Question
        }, {
            key: 'message',
            value: interaction.message
        });

        return interaction.showModal(props.manager.Get(`pickem_form_question_modal_${interaction.user.id}`)?.unwrap());
    }

})