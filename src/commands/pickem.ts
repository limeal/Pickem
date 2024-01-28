import {
    SlashCommandBuilder,
    ChatInputCommandInteraction,
    EmbedBuilder,
    Colors,
} from 'discord.js';
import UserService from 'services/user.service';

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
                const best_users = await UserService.Leaderboard();

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

                interaction.reply({ embeds: [embed] });

                break;
            case 'score':
                const user = interaction.options.getUser('user') || interaction.user;
                try {
                    const score = await UserService.Get(user);

                    interaction.reply({ content: `<@${user.id}> has ${score} points.`, ephemeral: true });
                } catch (err: any) {
                    interaction.reply({ content: `<@${user.id}> has not yet complete the form!`, ephemeral: true });
                }
                break;
            default:
                break;
        }
    },
};