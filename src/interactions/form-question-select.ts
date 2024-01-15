import {
    TextInputStyle,
    Interaction,
    ButtonStyle,
    ButtonInteraction,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    Colors,
    Guild,
    AnySelectMenuInteraction
} from 'discord.js';

import BaseInteraction from '../classes/BaseInteraction';
import BaseSelect from 'classes/BaseSelect';

export default class FormQuestionSelect extends BaseSelect implements BaseInteraction {
    static ID = 'pickem_form_question_select';

    constructor(type: 'STRING' | 'USER' | 'CHANNEL' | 'ROLE' | 'MENTIONABLE', minValues?: number, maxValues?: number, choices?: any) {
        super(type, minValues, maxValues, choices);
    }

    unwrap() {
        return this.select;
    }

    async execute(interaction: AnySelectMenuInteraction) {
        // When submitted the form, we need to get the current question and check if the answer is correct
        // If it is, we add to the score of the user
        // If not we just update the question index, if it's the last question, we end the form, if not we send the next question
    }

}