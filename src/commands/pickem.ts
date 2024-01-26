import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Colors,
} from 'discord.js';
import { GetLeaderboard, GetUser } from 'services/user.service';

export default {
    data: new SlashCommandBuilder()
        .setName('pickem')
        .setDescription('Useful commands - For pickem.')
        .addSubcommand(subcommand =>
            subcommand
                .setName('leaderboard')
                .setDescription('Display the leaderboard')
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
                const best_users = await GetLeaderboard();

                const embed = new EmbedBuilder()
                    .setTitle('Leaderboard')
                    .setColor(Colors.Blue)
                    .setTimestamp(new Date())

                for (let i = 0; i < best_users.length; i++) {
                    embed.addFields({
                        name: `${i + 1}. ${best_users[i].userId}`,
                        value: `${best_users[i].score} points`
                    })
                }

                interaction.reply({ embeds: [embed] });

                break;
            case 'score':
                const user = interaction.options.getUser('user') || interaction.user;
                try {
                    const score = await GetUser(user);
                
                    interaction.reply({ content: `${user.username} has ${score} points.`, ephemeral: true });
                } catch (err: any) {
                    interaction.reply({ content: err, ephemeral: true });
                }
                break;
            default:
                break;
        }
    },
};