import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
    ChannelType,
    User,
} from 'discord.js';
import cron from 'node-cron';

import prisma from '../prisma';
import FormService from '../services/form.service';
import UserService from 'services/user.service';

// Import interactions
import { interactionManager } from 'registries/register_interactions';
import ListFormsMessage from 'messages/ListFormsMessage';
import tasks from 'registries/register_tasks';
import ResultService from 'services/result.service';
import { Form, FormStatus, UserResponse, UserSubmission } from '@prisma/client';

export default {
    data: new SlashCommandBuilder()
        .setName('pickema')
        .setDescription('Administator Tool - For pickems.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('new')
                .setDescription('Create a new pickem.')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('The name of the pickem')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('file_loc')
                        .setDescription(`The file_loc of the pickem (default: 'default')`)
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all pickems.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('program')
                .setDescription('Program a pickem.')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('The name of the pickem.')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('cron') // Format: * * * * * *
                        .setDescription('The time of the pickem programmation (ex: * * * * * *)')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('unprogram')
                .setDescription('Unprogram a pickem.')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('The name of the pickem.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('delete')
                .setDescription('Delete a pickem.')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('The name of the pickem.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a new pickem.')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('The name of the pickem.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup pickem.')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear a user answer.')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to reset.')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('reset')
                .setDescription('Reset config')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('inject')
                .setDescription('Inject Answer into a pickem.')
                .addStringOption(option =>
                    option
                        .setName('file_loc')
                        .setDescription('The file_loc of the injection.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('regen')
                .setDescription('Regenerate answer of a user.')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to regen the answer.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('open')
                .setDescription('Open a pickem.')
        )
    ,
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case 'new':
                const name = interaction.options.getString('name');
                const qFile = interaction.options.getString('file_loc') || 'default';

                return await FormService.Create(interaction, name!, qFile!, interaction.guild!);
            case 'list':
                const forms = await FormService.GetAll();
                if (forms.length === 0) return interaction.reply('No Pickem found, use /pickema new <name>');
                return interaction.reply(ListFormsMessage(forms));
            case 'delete':
                const name2 = interaction.options.getString('name');
                try {
                    await FormService.Delete(name2!, interaction.guild!);
                    return interaction.reply({ content: `Deleted pickem with name: ${name2}`, ephemeral: true });
                } catch (error: any) {
                    return interaction.reply({ content: `Pickem with name ${name2}, does not exist.`, ephemeral: true });
                }
            case 'set':
                const name3 = interaction.options.getString('name');
                try {
                    await FormService.Switch(name3!, interaction.guild!);
                    return interaction.reply({ content: `Activate pickem with name ${name3}`, ephemeral: true });
                } catch (error: any) {
                    return interaction.reply({ content: `Pickem with name ${name3}, does not exist.`, ephemeral: true });
                }
            case 'setup':
                const config = await prisma.config.findFirst();
                if (config)
                    return interaction.reply({ content: `Pickem already setup, use /pickema reset to reset the config`, ephemeral: true });
                return interaction.showModal(interactionManager.Get('setup-modal')!.unwrap());
            case 'reset':
                const config2 = await prisma.config.findFirst();
                if (!config2)
                    return interaction.reply({ content: `Config not found, use /pickema setup`, ephemeral: true });

                try {
                    const messageChannel = await interaction.guild?.channels.fetch(config2.formChannelId);
                    if (messageChannel && messageChannel.type === ChannelType.GuildText) {
                        const message = await messageChannel.messages.fetch(config2.formMessageId);
                        if (message) await message.delete();
                    }
                } catch (error: any) { }

                await prisma.config.deleteMany();
                return interaction.reply({ content: `Config successfully reset`, ephemeral: true });
            case 'clear':
                const user = interaction.options.getUser('user') || interaction.user;
                await interaction.deferReply({ ephemeral: true });
                try {
                    await UserService.Clear(user, interaction.guild!);
                    return interaction.editReply({ content: `Clear user ${user.username} response in pickem` });
                } catch (error: any) {
                    return interaction.editReply({ content: `User ${user.username} response not exist in pickem` });
                }
            case 'program':
                // Create a repetitive task
                const name4 = interaction.options.getString('name');
                const cronj = interaction.options.getString('cron');

                try {
                    const form = await prisma.form.findUnique({
                        where: {
                            title: name4!,
                        },
                    });

                    if (!form) throw 'Invalid form';

                    await prisma.formCron.create({
                        data: {
                            formId: form.id,
                            cron: cronj!,
                        },
                    });

                    tasks.set(form.title, cron.schedule(cronj!, async () => {
                        FormService.Switch(form.title, interaction.guild!);
                    }));


                    return interaction.reply({ content: `Programmed pickem with name ${name4}`, ephemeral: true });
                } catch (error: any) {
                    return interaction.reply({ content: `An error occurred while programming pickem with name ${name4}`, ephemeral: true });
                }
            case 'unprogram':
                const name5 = interaction.options.getString('name');

                try {
                    const formU = await prisma.form.findFirst({
                        where: {
                            title: name5!,
                        },
                    });

                    if (!formU) throw 'Invalid form';

                    const task = tasks.get(name5!);
                    if (!task) return interaction.reply({ content: `The task with name ${name5} does not exist.`, ephemeral: true });

                    await prisma.formCron.delete({
                        where: {
                            formId: formU.id
                        },
                    });

                    task.stop();
                    tasks.delete(name5!);
                    return interaction.reply({ content: `Unprogrammed pickem with name ${name5}`, ephemeral: true });
                } catch (error: any) {
                    return interaction.reply({ content: `An error occured while unprogramming pickem with name ${name5}`, ephemeral: true })
                }
            case 'inject':
                return FormService.Inject(interaction, interaction.options.getString('file_loc')!);
            case 'regen':
                const userR: User = interaction.options.getUser('user') || interaction.user;
                const formR: Form | null = await FormService.GetCurrentForm();
                if (!formR) return interaction.reply({ content: `No pickem found, use /pickema new <name>`, ephemeral: true });
                const userRR: (UserResponse & { submissions: UserSubmission[] }) | null = await prisma.userResponse.findFirst({
                    where: {
                        userId: userR.id,
                        formId: formR.id,
                    },
                    include: {
                        submissions: true
                    }
                });
                if (!userRR) return interaction.reply({ content: `No response found for user ${userR.username} in pickem ${formR.title}`, ephemeral: true });

                const channel = interaction.channel;
                if (!channel || channel.type != ChannelType.GuildText) return interaction.reply({ content: `Channel not found.`, ephemeral: true });

                await interaction.deferReply({ ephemeral: true });
                await ResultService.Create(channel, userR, formR, userRR);
                return interaction.editReply({ content: `Regenerated answer for user ${userR.username} in pickem ${formR.title}` });
            case 'open':
                const oform = await FormService.GetCurrentForm();

                if (!oform) return interaction.reply({ content: `No pickem found, use /pickema new <name>`, ephemeral: true });
                if (oform?.status === FormStatus.OPEN) return interaction.reply({ content: `Pickem is already open`, ephemeral: true });

                try {
                    await prisma.form.update({
                        where: {
                            id: oform.id,
                        },
                        data: {
                            status: FormStatus.CLOSED,
                        },
                    });
                    return interaction.reply({ content: `Pickem is now open`, ephemeral: true });
                } catch (err) { return interaction.reply({ content: `An error occured while opening the pickem`, ephemeral: true }); }
            case 'close':
                const cform = await FormService.GetCurrentForm();

                if (!cform) return interaction.reply({ content: `No pickem found, use /pickema new <name>`, ephemeral: true });
                if (cform?.status === FormStatus.CLOSED) return interaction.reply({ content: `Pickem is already closed`, ephemeral: true });

                try {
                    await prisma.form.update({
                        where: {
                            id: cform.id,
                        },
                        data: {
                            status: FormStatus.CLOSED,
                        },
                    });
                    return interaction.reply({ content: `Pickem is now open`, ephemeral: true });
                } catch (err) { return interaction.reply({ content: `An error occured while closing the pickem`, ephemeral: true }); }
            default:
                break;

        }
    },
};