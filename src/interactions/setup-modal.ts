import {
    TextInputStyle,
    ModalSubmitInteraction,
    EmbedBuilder,
    Colors,
    ChannelType,
    TextChannel,
    ButtonBuilder,
    ActionRowBuilder,
    AttachmentBuilder,
    Collection,
} from 'discord.js';

import BaseInteraction from '../classes/BaseInteraction';
import BaseModal from '../classes/BaseModal';
import prisma from '../prisma';
import InteractionProps from '@interfaces/InteractionProps';
import SetupModalMessage from 'messages/SetupModalMessage';

export default (props: InteractionProps) => new (class SetupModal extends BaseModal implements BaseInteraction {

    constructor() {
        super({
            customId: props.custom_id,
            title: 'Pickem | Setup'
        }, [
            {
                customId: 'pickem_forms_category',
                label: "Category where questions will be asked",
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
        const categoryForm = interaction.fields.getTextInputValue('pickem_forms_category');
        const channelToSent = interaction.fields.getTextInputValue('pickem_setup_channel');

        // Check if channelToSent is valid
        const guild = interaction.guild!;

        let channel = interaction.channel;
        if (channelToSent) {
            try {
                const tchannel = await guild.channels.fetch(channelToSent);

                if (!channel || channel.type !== ChannelType.GuildText)
                    return interaction.reply({ content: 'Une erreur est survenue, veuillez reessayer!' });

                channel = tchannel as TextChannel;
            } catch (error: any) {
                return interaction.reply({ content: 'Une erreur est survenue, veuillez reessayer!' });
            }
        }

        if (!channel)
            return interaction.reply({ content: 'Une erreur est survenue, veuillez reessayer!' });


        let category = null;
        try {
            // Check if categoryForm is valid
            category = await guild.channels.fetch(categoryForm);
            // check if it's a category
            if (!category || category.type !== ChannelType.GuildCategory || category.id !== categoryForm)
                throw 'Une erreur est survenue, config invalide!';
        } catch (error: any) {
            return interaction.reply({ content: error });
        }

        // Check if config already exist
        const config = await prisma.config.findFirst({
            where: {
                id: 0,
            },
        });

        let message = null;
        if (config) {
            // If config is already set, update it
            try {
                const target_channel = await guild.channels.fetch(config.formChannelId);
                if (!target_channel || target_channel.type !== ChannelType.GuildText)
                    return interaction.reply({ content: 'Une erreur est survenue, veuillez reessayer!' });
                const tmessage = await target_channel.messages.fetch(config.formMessageId);
                if (!tmessage)
                    return interaction.reply({ content: 'Une erreur est survenue, veuillez reessayer!' });
                if (channel.id === target_channel.id) {
                    // Update message
                    message = tmessage;
                } else {
                    // Delete old message
                    await tmessage.delete();
                }
            } catch (error: any) {
                return interaction.reply({ content: 'Une erreur est survenue, veuillez reessayer!' });
            }
        }

        const payload = SetupModalMessage();

        if (!payload) return interaction.reply({ content: 'Une erreur est survenue, veuillez reessayer!' });

        const data = {
            ...payload,
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    props.manager.Get('fill-form-button')!.unwrap())
            ],
        };

        if (message) {
            await interaction.deferUpdate();
            message = await message.edit(data);
        } else {
            await interaction.deferUpdate();
            message = await channel.send(data);
        }

        await prisma.config.upsert({
            where: {
                id: 0,
            },
            update: {
                formChannelId: channel.id,
                formCategoryId: category.id,
                formMessageId: message.id
            },
            create: {
                formChannelId: channel.id,
                formCategoryId: category.id,
                formMessageId: message.id
            },
        });
    }

})