import {
    Interaction,
    ButtonStyle,
    ButtonInteraction,
    ChannelType,
    PermissionFlagsBits,
    Guild,
    ActionRowBuilder,
    ButtonBuilder,
} from 'discord.js';

import BaseInteraction from '../classes/BaseInteraction';
import BaseButton from '../classes/BaseButton';
import prisma from '../prisma';
import InteractionProps from '@interfaces/InteractionProps';
import FillFormMessage from 'messages/FillFormMessage';
import { FormStatus, UserResponseStatus } from '@prisma/client';

export default ((props: InteractionProps) => new (class FillFormButton extends BaseButton implements BaseInteraction {

    constructor() {
        super({
            customId: props.custom_id,
            title: "Fill form",
            style: ButtonStyle.Primary,
            emoji: '📝'
        });
    }

    unwrap() {
        return this.button;
    }

    async setupChannel(guild: Guild, config: any, interaction: Interaction) {
        // Create a new channel in the category
        const newChannel = await guild.channels.create({
            name: `ticket-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: config?.formCategoryId,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: PermissionFlagsBits.ViewChannel,
                },
                {
                    id: interaction.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.AttachFiles,
                    ],
                    deny: [
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.SendTTSMessages,
                        PermissionFlagsBits.ManageMessages,
                        PermissionFlagsBits.EmbedLinks,
                    ]
                },
            ],
        });

        if (!newChannel) {
            throw 'Could not create channel.';
        }

        // Send message in the channel
        const payload = FillFormMessage();

        if (!payload) throw 'Could not create embed.';

        return {
            channel: newChannel, payload: {
                ...payload,
                components: [
                    new ActionRowBuilder<ButtonBuilder>().addComponents(
                        props.manager.Get('start-form-button')!.unwrap())
                ]
            }
        };
    }

    async execute(interaction: ButtonInteraction) {
        // When button is clicked
        // Get config from database
        const guild = interaction.guild!;

        const config = await prisma.config.findFirst({
            where: {
                id: 0,
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
                active: true,
            },
        });

        if (!form) {
            // If no form is active, reply to user to set it up
            return await interaction.reply({
                content: 'No form is active, please run `/pickem new <name> <file>` or `/pickem set <name>`',
                ephemeral: true,
            });
        }

        if (form.status === FormStatus.CLOSED) {
            // If form is closed, reply to user to set it up
            return await interaction.reply({
                content: 'Form is closed !',
                ephemeral: true,
            });
        }

        let res = null;
        try {
            // Create a new channel in the category + send message
            res = await this.setupChannel(guild, config, interaction);

            // Create a new response in database
            await prisma.userResponse.create({
                data: {
                    formId: form?.id,
                    userId: interaction.user.id,
                    channelId: res.channel.id,
                },
            });

            // Summon a form question in the channel
            await interaction.reply({
                content: `New form created in <#${res.channel.id}>`,
                ephemeral: true,
            });

            return res.channel.send(res.payload);
        } catch (error: any) {
            console.error(error?.code);
            res?.channel?.delete();
            if (error.code && error.code === '10003') return;
            if (error.code && error.code === 'P2002') {
                // Find userResponse status
                const userResponse = await prisma.userResponse.findFirst({
                    where: {
                        userId: interaction.user.id,
                    },
                    select: {
                        channelId: true,
                        status: true,
                    },
                });

                if (!userResponse) {
                    await interaction.reply({
                        content: 'Could not find user response, please try again.',
                        ephemeral: true,
                    });
                    return;
                }

                return await interaction.reply({
                    content: `You'r submission is currently ${userResponse?.status}${userResponse?.status === UserResponseStatus.PENDING ? ` in <#${userResponse.channelId}>` : ''}.`,
                    ephemeral: true,
                });
                return;
            } else {
                await interaction.reply({
                    content: 'An error occured, please try again.',
                    ephemeral: true,
                });
            }
        }
    }

})) as (props: InteractionProps) => BaseInteraction;
