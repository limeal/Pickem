import { Client, Events, GatewayIntentBits, Collection, Guild } from 'discord.js';
import cron from 'node-cron';
import dotenv from 'dotenv';


import prisma from './prisma';
import commands from './registries/register_commands';
import interactionManager from 'registries/register_interactions';
import { ChangeForm } from 'services/form.service';

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

let guild : Guild;

//////////////////////////
// LAUNCH CLIENT
//////////////////////////

(async () => {

    client.on(Events.InteractionCreate, async interaction => {
        if (interaction.isCommand()) {
            console.log('CMD');
            const command = commands.get(interaction.commandName);
            command?.execute(interaction);
            return;
        }

        if (!('customId' in interaction)) return;
        console.log(`CMD: ${interaction.customId}`);
        interactionManager.Get(interaction.customId)?.execute(interaction);
    });

    client.on(Events.GuildCreate, async guild => {
        if (guild.id !== process.env.DISCORD_GUILD_ID) await guild.leave();
    })

    client.once(Events.ClientReady, async () => {

        //////////////////////////
        /// LOAD CRON
        //////////////////////////
        guild = await client.guilds.fetch(process.env.DISCORD_GUILD_ID!);

        console.log('Loading cron jobs...');
        prisma.formCron.findMany().then(cronJobs => {
            for (const cronJob of cronJobs) {
                console.log(`Loading cron job: ${cronJob.cron}`);
                cron.schedule(cronJob.cron, async () => {
                    ChangeForm(cronJob.formId, guild);
                })
            }
        });

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