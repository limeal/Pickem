import {
    ButtonStyle,
    ButtonInteraction,
} from 'discord.js';

import BaseInteraction from '../classes/BaseInteraction';
import BaseButton from '../classes/BaseButton';
import InteractionProps from '@interfaces/InteractionProps';
import FormService from 'services/form.service';

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
        await FormService.InvokeNextQuestion({ interaction, imanager: props.manager, user: interaction.user });
    }

})