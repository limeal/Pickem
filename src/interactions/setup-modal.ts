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
                customId: 'pickem_result_category',
                label: "Category where results is announced",
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
        const categoryResult = interaction.fields.getTextInputValue('pickem_result_category');
        const channelToSent = interaction.fields.getTextInputValue('pickem_setup_channel');

        // Check if channelToSent is valid
        const guild = interaction.guild!;

        let channel = interaction.channel;
        if (channelToSent) {
            const tchannel = await guild.channels.fetch(channelToSent);

            if (!channel || channel.type !== ChannelType.GuildText)
                return await interaction.reply({ content: 'ERR L003 - An error occured, please try again.' });


            channel = tchannel as TextChannel;
        }

        if (!channel)
            return await interaction.reply({ content: 'ERR L004 - An error occured, please try again.' });


        // Check if categoryForm is valid
        const category = await guild.channels.fetch(categoryForm);
        // check if it's a category
        if (!category || category.type !== ChannelType.GuildCategory || category.id !== categoryForm)
            return await interaction.reply({ content: 'Not a valid category ID or this is NOT a category.' });


        // Check if categoryResult is valid
        const categoryRes = await guild.channels.fetch(categoryResult);
        // check if it's a category
        if (!categoryRes || categoryRes.type !== ChannelType.GuildCategory || categoryRes.id !== categoryResult)
            return await interaction.reply({ content: 'Not a valid category ID or this is NOT a category.' });


        // Check if config already exist
        const config = await prisma.config.findFirst({
            where: {
                id: 0,
            },
        });

        let message = null;
        if (config) {
            // If config is already set, update it
            const target_channel = await guild.channels.fetch(config.formChannelId);
            if (!target_channel || target_channel.type !== ChannelType.GuildText)
                return await interaction.reply({ content: 'ERR L005 - An error occured, please try again.' });
            const tmessage = await target_channel.messages.fetch(config.formMessageId);
            if (!tmessage)
                return await interaction.reply({ content: 'ERR L006 - An error occured, please try again.' });
            if (channel.id === target_channel.id) {
                // Update message
                message = tmessage;
            } else {
                // Delete old message
                await tmessage.delete();
            }
        }

        const payload = SetupModalMessage();

        if (!payload) {
            await interaction.reply({ content: 'ERR L007 - An error occured, please try again.' });
        }

        const data = {
            ...payload,
            components: [
                new ActionRowBuilder<ButtonBuilder>().addComponents(
                    props.manager.Get('fill-form-button')!.unwrap())
            ],
        };

        if (message) {
            console.log('Editing: ' + message);
            await interaction.deferUpdate();
            message = await message.edit(data);
        } else {
            console.log('Sending/Interacting: ' + channel.id);
            await interaction.deferUpdate();
            message = await channel.send(data);
        }

        console.log(category.id, channel.id, message.id);

        await prisma.config.upsert({
            where: {
                id: 0,
            },
            update: {
                formChannelId: channel.id,
                formCategoryId: category.id,
                formMessageId: message.id,
                resultCategoryId: categoryRes.id,
            },
            create: {
                formChannelId: channel.id,
                formCategoryId: category.id,
                formMessageId: message.id,
                resultCategoryId: categoryRes.id,
            },
        });
    }

})