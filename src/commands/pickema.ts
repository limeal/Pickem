import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
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
                .setName('reset')
                .setDescription('Reset a user answer.')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to reset.')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('misc')
                .setDescription('Misc command')
                .addUserOption(option => option
                    .setName('gen-result')
                    .setDescription('Regen the result of a pickem for user.')
                    .setRequired(true)
                )
        )
    ,
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case 'new':
                const name = interaction.options.getString('name');
                const qFile = interaction.options.getString('file_loc') || 'default';

                try {
                    const pickem = await FormService.Create(name!, qFile!, interaction.guildId!);
                    return interaction.reply({ content: `Created a new pickem with id: ${pickem.id}`, ephemeral: true });
                } catch (error: any) {
                    return await interaction.reply({ content: `Pickem with name ${name}, already exist or occur an error in creation process.`, ephemeral: true });
                }
            case 'list':
                const forms = await FormService.GetAll();
                if (forms.length === 0) return await interaction.reply('No Pickem found, use /pickema new <name>');
                return await interaction.reply(ListFormsMessage(forms));
            case 'delete':
                const name2 = interaction.options.getString('name');
                try {
                    await FormService.Delete(name2!);
                    return await interaction.reply({ content: `Deleted pickem with name: ${name2}`, ephemeral: true });
                } catch (error: any) {
                    return await interaction.reply({ content: `Pickem with name ${name2}, does not exist.`, ephemeral: true });
                }
            case 'set':
                const name3 = interaction.options.getString('name');
                try {
                    await FormService.Switch(name3!, interaction.guild!);
                    return await interaction.reply({ content: `Activate pickem with name ${name3}`, ephemeral: true });
                } catch (error: any) {
                    return await interaction.reply({ content: `Pickem with name ${name3}, does not exist.`, ephemeral: true });
                }
            case 'setup':
                return await interaction.showModal(interactionManager.Get('setup-modal')!.unwrap());
            case 'reset':
                const user = interaction.options.getUser('user') || interaction.user;
                try {
                    await UserService.Reset(user, interaction.guild!);
                    return await interaction.reply({ content: `Reset user ${user.username} response in pickem`, ephemeral: true });
                } catch (error: any) {
                    return await interaction.reply({ content: `An error occurred while resetting user ${user.username} response in pickem`, ephemeral: true });
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


                    return await interaction.reply({ content: `Programmed pickem with name ${name4}`, ephemeral: true });
                } catch (error: any) {
                    return await interaction.reply({ content: `An error occurred while programming pickem with name ${name4}`, ephemeral: true });
                }
            case 'unprogram':
                const name5 = interaction.options.getString('name');

                const task = tasks.get(name5!);
                if (!task) return await interaction.reply({ content: `The task with name ${name5} does not exist.`, ephemeral: true });
                task.stop();
                return await interaction.reply({ content: `Unprogrammed pickem with name ${name5}`, ephemeral: true });
            case 'misc':
                const genResultUser = interaction.options.getUser('gen-result');
                if (genResultUser) {
                    const userResponse = await prisma.userResponse.findUnique({
                        where: {
                            userId: genResultUser.id,
                        },
                        include: {
                            submissions: true,
                        },
                    });

                    if (!userResponse) return await interaction.reply({ content: `User ${genResultUser.username} does not have a response.`, ephemeral: true });

                    return await ResultService.Create(interaction, genResultUser, userResponse!, userResponse!.submissions);
                }
                break;
            default:
                break;
        }
    },
};