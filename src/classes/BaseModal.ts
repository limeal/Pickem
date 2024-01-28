import { ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from "discord.js";

interface PartialModal {
    customId: string;
    title: string;
}

interface PartialTextInput {
    customId: string;
    label: string;
    placeholder: string;
    style: TextInputStyle;
    required: boolean;
}

export default class BaseModal {
    modal: ModalBuilder;
    inputs: TextInputBuilder[];

    constructor(
        partialModal: PartialModal,
        partialInputs: PartialTextInput[]
    ) {
        this.modal = new ModalBuilder()
            .setCustomId(partialModal.customId)
            .setTitle(partialModal.title);

        this.inputs = partialInputs.map(input => new TextInputBuilder()
            .setCustomId(input.customId)
            .setLabel(input.label)
            .setPlaceholder(input.placeholder)
            .setStyle(input.style)
            .setRequired(input.required)
        );

        this.modal.addComponents(this.inputs.map(input => {
            return new ActionRowBuilder<TextInputBuilder>().addComponents(input);
        }));
    }
}