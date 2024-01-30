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
            title: "Participer",
            style: ButtonStyle.Primary,
            emoji: '🎲'
        });
    }

    unwrap() {
        return this.button;
    }

    async setupChannel(guild: Guild, config: any, interaction: Interaction) {
        // Create a new channel in the category
        const newChannel = await guild.channels.create({
            name: `「🔮」Ticket-${interaction.user.username}`,
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
            throw 'Une erreur est survenue lors de la création du nouveau salon';
        }

        // Send message in the channel
        const payload = FillFormMessage();

        if (!payload) throw 'Une erreur est survenue lors de la création du message';

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

        await interaction.deferReply({ ephemeral: true });
        const config = await prisma.config.findFirst({
            where: {
                id: 0,
            },
        });

        if (!config) {
            // If config is not set, reply to user to set it up
            await interaction.editReply({
                content: 'Aucun config trouver, utiliser `/pickema setup`'
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
            return await interaction.editReply({
                content: 'Aucun formulaire n\'est activer, utiliser `/pickema new <name> <file>` ou `/pickema set <name>`'
            });
        }

        if (form.status === FormStatus.CLOSED) {
            // If form is closed, reply to user to set it up
            return await interaction.editReply({
                content: 'Le formulaire est clos!'
            });
        }

        const userResponse = await prisma.userResponse.findFirst({
            where: {
                userId: interaction.user.id,
            },
            select: {
                channelId: true,
                status: true,
            },
        });

        if (userResponse) {
            return await interaction.editReply({
                content: `Votre soumission est actuellement ${userResponse?.status === UserResponseStatus.PENDING ? `en cours dans <#${userResponse.channelId}>.` : 'terminer.'}.`
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
            await interaction.editReply({
                content: `Votre formulaire: <#${res.channel.id}>`
            });

            return res.channel.send(res.payload);
        } catch (error: any) {
            console.error(error?.code);
            res?.channel?.delete();
            if (error.code && error.code === '10003') return;
            return await interaction.editReply({
                content: 'Une erreur est survenue, merci de réessayer plus tard.'
            });
        }
    }

})) as (props: InteractionProps) => BaseInteraction;
