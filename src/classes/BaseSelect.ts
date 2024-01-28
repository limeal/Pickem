import { APISelectMenuComponent, APISelectMenuOption, BaseSelectMenuBuilder, ChannelSelectMenuBuilder, MentionableSelectMenuBuilder, RestOrArray, RoleSelectMenuBuilder, SelectMenuComponentOptionData, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, UserSelectMenuBuilder } from "discord.js";
import BaseInteraction from "./BaseInteraction";

export default class BaseSelect {
    type: 'STRING' | 'USER' | 'CHANNEL' | 'ROLE' | 'MENTIONABLE';
    select: BaseSelectMenuBuilder<any> | null;

    constructor(
        customId: string,
        type: 'STRING' | 'USER' | 'CHANNEL' | 'ROLE' | 'MENTIONABLE',
        minValues?: number,
        maxValues?: number,
        choices?: string[]
    ) {
        this.type = type;
        this.select = null;

        switch (type) {
            case 'STRING':
                if (!choices) return;
                this.select = new StringSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder(`Select ${minValues && minValues > 1 ? `${minValues}` : 'an'} option(s)`)
                    .addOptions(...choices.map((choice: any) => {
                         return new StringSelectMenuOptionBuilder()
                          .setLabel(choice)
                          .setValue(choice.toLowerCase().replaceAll(/ /g, '_'))
                     }));
                break;
            case 'USER':
                this.select = new UserSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder('Select a user')
                break;
            case 'CHANNEL':
                this.select = new ChannelSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder('Select a channel')
                break;
            case 'ROLE':
                this.select = new RoleSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder('Select a role')
                break;
            case 'MENTIONABLE':
                this.select = new MentionableSelectMenuBuilder()
                    .setCustomId(customId)
                    .setPlaceholder('Select a mentionable')
                break;
            default:
                return;
        }

        if (minValues) {
            this.select.setMinValues(minValues);
        }

        if (maxValues) {
            this.select.setMaxValues(maxValues);
        }
    }
}