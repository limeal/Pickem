import { Client, Events, GatewayIntentBits, Collection } from 'discord.js';
import prisma from './prisma';

import dotenv from 'dotenv';

import commands from './registries/register_commands';

//////////////////////////
// LOAD ENVIRONMENT VARIABLES
//////////////////////////

dotenv.config();

//////////////////////////
// CREATE CLIENT
//////////////////////////

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
    ],
});

//////////////////////////
// LAUNCH CLIENT
//////////////////////////

(async () => {


    client.on(Events.InteractionCreate, async interaction => {
        if (interaction.isCommand()) {
            const command = commands.get(interaction.commandName);
            command?.execute(interaction);
            return;
        }

        console.log(interaction.id);
        //interactions.get(interaction.id)?.execute(interaction);


        /* if (interaction.customId === 'add_cookie' || interaction.customId === 'view_cookie') {
            const user = await prisma.user.findFirst({
                where: {
                    discordId: interaction.user.id,
                },
            });

            if (interaction.customId === 'add_cookie') {
                // Get the number of cookies you have in the database or create a new entry

                if (!user) {
                    await prisma.user.create({
                        data: {
                            guildId: interaction.guildId!,
                            discordId: interaction.user.id,
                            score: 1,
                        },
                    });
                } else {
                    user.score += 1;
                    await prisma.user.update({
                        where: {
                            id: user.id,
                        },
                        data: {
                            score: user.score,
                        },
                    });
                }
            }

            await interaction.reply({
                content: `You have ${user?.score || 0} cookie!`,
                ephemeral: true,
            }).then(msg => {
                setTimeout(() => msg.delete(), 1000)
            });

        } else if (interaction.customId === 'leaderboard') {
            const users = await prisma.user.findMany({
                where: {
                    guildId: interaction.guildId!,
                },
                orderBy: {
                    score: 'desc',
                },
            });

            let leaderboard = '';
            for (const user of users) {
                const discordUser = await client.users.fetch(user.discordId);
                leaderboard += `${discordUser.username} has ${user.score} cookies!\n`;
            }

            await interaction.reply({
                content: leaderboard,
                ephemeral: true,
            }).then(msg => {
                setTimeout(() => msg.delete(), 1000)
            });
        } else if (interaction.customId === 'prices') {
            const prices = await prisma.price.findMany({
                where: {
                    guildId: interaction.guildId!,
                },
            });

            let pricesMessage = '';
            for (const price of prices) {
                pricesMessage += `${price.name}: ${price.description} (${price.level} cookies)\n`;
            }

            if (pricesMessage === '') {
                pricesMessage = 'No prices yet!';
            }

            await interaction.reply({
                content: pricesMessage,
                ephemeral: true,
            }).then(msg => {
                setTimeout(() => msg.delete(), 1000)
            })
        } */

    });

    client.once(Events.ClientReady, () => {
        console.log(`Logged in as ${client.user!.tag}!`);
    });

    client.login(process.env.DISCORD_BOT_TOKEN);
})()
    .then(() => {
        prisma.$disconnect();
    })
    .catch((error) => {
        console.error(error);
        prisma.$disconnect();
    }
    );