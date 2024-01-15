import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    PermissionFlagsBits,
} from 'discord.js';

// Import interactions
import SetupModal from 'interactions/setup-modal';
import PickemController from 'classes/PickemController';
import interactions from 'registries/register_interactions';

export default {
    data: new SlashCommandBuilder()
        .setName('pickem')
        .setDescription('Check how many cookies you have, or another user.')
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
                .addStringOption(option =>
                    option
                        .setName('date') // Format: DD/MM/YYYY
                        .setDescription('The date of the pickem')
                        .setRequired(true)
                )
                .addStringOption(option =>
                    option
                        .setName('time') // Format: 1w2d3h4m5s
                        .setDescription('The time of the pickem')
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
    ,
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case 'new':
                const name = interaction.options.getString('name');
                const qFile = interaction.options.getString('question_file') || 'default';

                try {
                    const pickem = await PickemController.create(name!, qFile!, interaction.guildId!);
                    return await interaction.reply(`Created a new pickem with id: ${pickem.id}`);
                } catch (error: any) {
                    return await interaction.reply(error);
                }
            case 'list':
                const forms = await PickemController.getAll(interaction.guildId!);
                if (forms.length === 0) return await interaction.reply('No forms found.');
                return await interaction.reply(`Existing Forms: ${forms.map((form: any) => form.title + form.active ? ' (active)' : '').join(', ')}`);
            case 'delete':
                const id = interaction.options.getInteger('id');
                await PickemController.delete(id!, interaction.guildId!);
                return await interaction.reply(`Deleted form with id: ${id}`);
            case 'set':
                const id2 = interaction.options.getInteger('id');
                await PickemController.set(id2!, interaction.guild!);
                return await interaction.reply(`Activated form with id: ${id2}`);
            case 'setup':
                return await interaction.showModal(interactions.get(SetupModal.ID)!.unwrap());
            default:
                break;
        }
    },
};