import {
    ButtonStyle,
    ButtonInteraction,
} from 'discord.js';

import BaseInteraction from '../classes/BaseInteraction';
import BaseButton from '../classes/BaseButton';
import { InvokeNextQuestion } from 'services/form.service';
import InteractionProps from '@interfaces/InteractionProps';

export default (props: InteractionProps) => new (class StartFormButton extends BaseButton implements BaseInteraction {

    constructor() {
        super({
            customId: props.custom_id,
            title: "Commencer",
            style: ButtonStyle.Success,
            emoji: '✅'
        });
    }

    unwrap() {
        return this.button;
    }

    async execute(interaction: ButtonInteraction) {
        await InvokeNextQuestion(interaction, props.manager);
    }

})