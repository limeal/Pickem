import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
} from 'discord.js';
import cron from 'node-cron';

// Import interactions
import SetupModal from 'interactions/setup-modal';
import { CreateForm, ChangeForm, DeleteForm, GetForms } from '../services/form.service';
import interactions from 'registries/register_interactions';
import prisma from 'prisma';
import { ResetUser } from 'services/user.service';

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
                        .setName('question_file')
                        .setDescription('The name of json file with questions located in TEMPLATE_FOLDER.')
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
                .addIntegerOption(option =>
                    option
                        .setName('id')
                        .setDescription('The name of the pickem')
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
                .setName('delete')
                .setDescription('Delete a pickem.')
                .addIntegerOption(option =>
                    option
                        .setName('id')
                        .setDescription('The id of pickem.')
                        .setRequired(true)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a new pickem.')
                .addIntegerOption(option =>
                    option
                        .setName('id')
                        .setDescription('The id of pickem.')
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
    ,
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case 'new':
                const name = interaction.options.getString('name');
                const qFile = interaction.options.getString('question_file') || 'default';

                try {
                    const pickem = await CreateForm(name!, qFile!, interaction.guildId!);
                    return await interaction.reply(`Created a new pickem with id: ${pickem.id}`);
                } catch (error: any) {
                    console.log(error);
                    return await interaction.reply('Error creating new pickem.');
                }
            case 'list':
                const forms = await GetForms();
                if (forms.length === 0) return await interaction.reply('No forms found.');
                return await interaction.reply(`Existing Forms: ${forms.map((form: any) => form.title + (form.active ? ' (active)' : '')).join(', ')}`);
            case 'delete':
                const id = interaction.options.getInteger('id');
                await DeleteForm(id!);
                return await interaction.reply(`Deleted form with id: ${id}`);
            case 'set':
                const id2 = interaction.options.getInteger('id');
                await ChangeForm(id2!, interaction.guild!);
                return await interaction.reply(`Activated form with id: ${id2}`);
            case 'setup':
                return await interaction.showModal(interactions.Get('setup-modal')!.unwrap());
            case 'reset':
                const user = interaction.options.getUser('user') || interaction.user;
                try {
                    await ResetUser(user, interaction.guild!);
                    return await interaction.reply(`The user ${user.username} has been reset.`);
                } catch (error: any) {
                    console.log(error);
                    return await interaction.reply('Error reseting user.');
                }
            case 'program':
                // Create a repetitive task
                const id3 = interaction.options.getInteger('id');
                const cronj = interaction.options.getString('cron');

                try {
                    const form = await prisma.form.findUnique({
                        where: {
                            id: id3!,
                        },
                    });

                    if (!form) throw 'Invalid form id';

                    await prisma.formCron.create({
                        data: {
                            formId: form.id,
                            cron: cronj!,
                        },
                    });

                    cron.schedule(cronj!, async () => {
                        ChangeForm(form.id, interaction.guild!);
                    });

                    return await interaction.reply(`Programmed form with id: ${id3}`);
                } catch (error: any) {
                    console.log(error);
                    return await interaction.reply('L020 - An error occured, please contact an admin.');
                }

                break;
            default:
                break;
        }
    },
};