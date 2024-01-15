import { APISelectMenuComponent, APISelectMenuOption, BaseSelectMenuBuilder, ChannelSelectMenuBuilder, MentionableSelectMenuBuilder, RestOrArray, RoleSelectMenuBuilder, SelectMenuComponentOptionData, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, UserSelectMenuBuilder } from "discord.js";
import BaseInteraction from "./BaseInteraction";

export default class BaseSelect {
    type: 'STRING' | 'USER' | 'CHANNEL' | 'ROLE' | 'MENTIONABLE';
    select: BaseSelectMenuBuilder<any> | null;

    constructor(
        type: 'STRING' | 'USER' | 'CHANNEL' | 'ROLE' | 'MENTIONABLE',
        minValues?: number,
        maxValues?: number,
        choices?: RestOrArray<APISelectMenuOption | StringSelectMenuOptionBuilder | SelectMenuComponentOptionData>
    ) {
        this.type = type;
        // Compare T to determine which type of select to build
        switch (type) {
            case 'STRING':
                if (!choices) {
                    throw new Error('No choices provided for string select menu');
                }

                this.select = new StringSelectMenuBuilder()
                    .setCustomId('string_select')
                    .setPlaceholder(`Select ${minValues && minValues > 1 ? `${minValues}` : 'an'} option(s)`)
                    .addOptions(...choices!);
                break;
            case 'USER':
                this.select = new UserSelectMenuBuilder()
                    .setCustomId('user_select')
                    .setPlaceholder('Select a user')
                break;
            case 'CHANNEL':
                this.select = new ChannelSelectMenuBuilder()
                    .setCustomId('channel_select')
                    .setPlaceholder('Select a channel')
                break;
            case 'ROLE':
                this.select = new RoleSelectMenuBuilder()
                    .setCustomId('role_select')
                    .setPlaceholder('Select a role')
                break;
            case 'MENTIONABLE':
                this.select = new MentionableSelectMenuBuilder()
                    .setCustomId('mentionable_select')
                    .setPlaceholder('Select a mentionable')
                break;
            default:
                this.select = null;
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