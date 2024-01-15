import { ButtonBuilder, ButtonStyle } from "discord.js";


interface PartialButton {
    customId: string;
    title: string;
    style: ButtonStyle;
    emoji?: string;
    url?: string;
}

export default class BaseButton {
    button: ButtonBuilder;

    constructor(
        partialButton: PartialButton
    ) {
        this.button = new ButtonBuilder()
            .setCustomId(partialButton.customId)
            .setLabel(partialButton.title)
            .setStyle(partialButton.style)

        if (partialButton.emoji) {
            this.button.setEmoji(partialButton.emoji);
        }

        if (partialButton.url) {
            this.button.setURL(partialButton.url);
        }
    }
}