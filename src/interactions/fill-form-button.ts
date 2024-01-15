import {
    TextInputStyle,
    Interaction,
    ButtonStyle,
    ButtonInteraction,
    ChannelType,
    PermissionFlagsBits,
    EmbedBuilder,
    Colors,
    Guild
} from 'discord.js';

import BaseInteraction from '../classes/BaseInteraction';
import BaseButton from '../classes/BaseButton';
import prisma from '../prisma';

export default class FillFormButton extends BaseButton implements BaseInteraction {
    static ID = 'pickem_new_form_button';

    constructor() {
        super({
            customId: FillFormButton.ID,
            title: "Fill form",
            style: ButtonStyle.Primary,
            emoji: '📝'
        });
    }

    unwrap() {
        return this.button;
    }

    async setupChannel(guild: Guild, interaction: Interaction) {
        // Create a new channel in the category
        const newChannel = await guild.channels.create({
            name: `Ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: PermissionFlagsBits.ViewChannel,
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.AttachFiles,
                    ],
                },
            ],
        });

        if (!newChannel) {
            throw 'An error occured, please try again.';
        }

        // Send message in the channel
        const embed = new EmbedBuilder()
            .setTitle('Pickem | New form !')
            .setColor(Colors.Grey)
            .setDescription('Rempli le formulaire jusqu\'au bout !');

        if (!embed) {
            throw 'An error occured, please try again.';
        }

        await newChannel.send({ embeds: [embed] });
        return newChannel;
    }

    async execute(interaction: ButtonInteraction) {
        // When button is clicked
        // Get config from database
        const guild = interaction.guild!;

        const config = await prisma.config.findFirst({
            where: {
                guildId: interaction.guildId!,
            },
        });

        if (!config) {
            // If config is not set, reply to user to set it up
            await interaction.reply({
                content: 'Pickem is not set up yet, please run `/pickem setup`',
                ephemeral: true,
            });
            return;
        }

        // Get current active form
        const form = await prisma.form.findFirst({
            where: {
                guildId: guild.id,
                active: true,
            },
        });

        try {
            // Create a new channel in the category + send message
            const newChannel = await this.setupChannel(guild, interaction);

            // Create a new response in database
            await prisma.userResponse.create({
                data: {
                    guildId: guild.id,
                    formId: form?.id,
                    userId: interaction.user.id,
                    channelId: newChannel.id,
                },
            });
            
            // Summon a formquestion in the channel

        } catch (error: any) {
            await interaction.reply({
                content: 'An error occured, please try again.',
                ephemeral: true,
            });
            return;
        }
    }

}