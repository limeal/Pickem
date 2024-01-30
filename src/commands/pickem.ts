import { FormStatus } from '@prisma/client';
import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Colors,
} from 'discord.js';
import FormService from 'services/form.service';
import UserService from 'services/user.service';

export default {
    data: new SlashCommandBuilder()
        .setName('pickem')
        .setDescription('Useful commands - For pickem.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Display the leaderboard')
                .addIntegerOption(option =>
                    option
                        .setName('limit')
                        .setDescription('The number of users to display')
                        .setRequired(false)
                )
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('score')
                .setDescription('Display the score of a user')
                .addUserOption(option =>
                    option
                        .setName('user')
                        .setDescription('The user to display the score')
                        .setRequired(false)
                )
        )
    ,
    execute: async (interaction: ChatInputCommandInteraction) => {
        switch (interaction.options.getSubcommand()) {
            case 'leaderboard':
                const limit = interaction.options.getInteger('limit') || 10;
                const best_users = await UserService.Leaderboard(limit);

                const embed = new EmbedBuilder()
                    .setTitle('Leaderboard')
                    .setColor(Colors.Blue)
                    .setTimestamp(new Date())

                if (best_users.length > 0) {
                    for (let i = 0; i < best_users.length; i++) {
                        const u = await interaction.guild?.members.fetch(best_users[i].userId);
                        embed.addFields({
                            name: `${i + 1}. ${u?.displayName}`,
                            value: `${best_users[i].score} points`
                        })
                    }
                } else {
                    embed.setDescription('There are no users in the leaderboard');
                }

                return interaction.reply({ embeds: [embed] });
            case 'score':
                const user = interaction.options.getUser('user') || interaction.user;
                try {
                    const response = await UserService.Get(user);
                    const form = await FormService.GetCurrentForm();

                    if (form?.status === FormStatus.CLOSED)
                        return interaction.reply({ content: 'The form is closed.', ephemeral: true });
                    
                    return interaction.reply({ content: `<@${user.id}> has ${response.score} points.`, ephemeral: true });
                } catch (err: any) {
                    interaction.reply({ content: `<@${user.id}> has not yet complete the form!`, ephemeral: true });
                }
                break;
            default:
                break;
        }
    },
};