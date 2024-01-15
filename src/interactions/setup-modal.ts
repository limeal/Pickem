import {
    TextInputStyle,
    ModalSubmitInteraction,
    EmbedBuilder,
    Colors,
    ChannelType,
    TextChannel,
    ButtonBuilder,
    ActionRowBuilder,
} from 'discord.js';

import BaseInteraction from '../classes/BaseInteraction';
import BaseModal from '../classes/BaseModal';
import prisma from '../prisma';
import FillFormButton from './fill-form-button';

export default class SetupModal extends BaseModal implements BaseInteraction {
    static ID = 'pickem_setup';

    constructor() {
        super({
            customId: SetupModal.ID,
            title: 'Pickem | Setup'
        }, [
            {
                customId: 'pickem_setup_category',
                label: "Category where forms channels be created?",
                placeholder: "Category ID",
                style: TextInputStyle.Short,
                required: true
            },
            {
                customId: 'pickem_setup_channel',
                label: "Channel where bot will send message",
                placeholder: "Channel ID",
                style: TextInputStyle.Short,
                required: false
            }
        ]);
    }

    unwrap() {
        return this.modal;
    }

    async execute(interaction: ModalSubmitInteraction) {
        const categoryForm = interaction.fields.getTextInputValue('pickem_setup_category');
        const channelToSent = interaction.fields.getTextInputValue('pickem_setup_channel');

        // Check if channelToSent is valid
        const guild = interaction.guild!;
        const errorEmbed = new EmbedBuilder()
            .setTitle('Pickem | Error in Setup !')
            .setColor(Colors.Red)
            .setDescription('Invalid channel, retry again.');

        let channel = interaction.channel;
        if (channelToSent) {
            const tchannel = guild.channels.cache.get(channelToSent);

            if (!channel || channel.type !== ChannelType.GuildText) {
                await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
                return;
            }

            channel = tchannel as TextChannel;
        }

        if (!channel) {
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Check if categoryForm is valid
        const category = guild.channels.cache.get(categoryForm);
        // check if it's a category
        if (!category || category.type !== ChannelType.GuildCategory) {
            errorEmbed.setDescription('Invalid category, retry again.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
            return;
        }

        // Check if config already exist
        const config = await prisma.config.findFirst({
            where: {
                guildId: guild.id,
            },
        });

        if (config) {
            // If config is already set, clear the message.
            await channel.messages.delete(config.formMessageId);
        }

        // Send message in the channel
        const embed = new EmbedBuilder()
            .setTitle('Pickem | Fill form !')
            .setColor(Colors.Grey)
            .setDescription('Click on the button to fill the form !');

        if (!embed) {
            errorEmbed.setDescription('An error occured, please try again.');
            await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
        }

        const message = await channel.send({
            embeds: [embed], components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    new FillFormButton().unwrap())
            ]
        });

        // Save config in database
        prisma.config.upsert({
            where: {
                id: 1,
                guildId: guild.id,
            },
            update: {
                formChannelId: channel.id,
                formCategory: category.id,
                formMessageId: message.id,
            },
            create: {
                guildId: guild.id,
                formChannelId: channel.id,
                formCategory: category.id,
                formMessageId: message.id,
            },
        });
    }

}