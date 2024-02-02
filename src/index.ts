import { Client, Events, GatewayIntentBits, Collection, Guild, ActivityType } from 'discord.js';
import cron from 'node-cron';
import dotenv from 'dotenv';


import prisma from './prisma';
import commands from './registries/register_commands';
import { Init, interactionManager } from 'registries/register_interactions';
import FormService from 'services/form.service';
import tasks from 'registries/register_tasks';

//////////////////////////
// INIT ENV + LOAD INTERACTIONS
//////////////////////////

dotenv.config();
Init();

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

let guild: Guild;

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

        if (!('customId' in interaction)) return;
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
        const Jobs = await prisma.formCron.findMany({
            include: {
                form: true,
            }
        });

        for (const cronJob of Jobs) {
            console.log(`Loading cron job: ${cronJob.cron}`);
            tasks.set(cronJob.form.title,
                cron.schedule(cronJob.cron, async () => {
                    FormService.Switch(cronJob.form.title, guild);
                }))
        }

        //////////////////////////
        /// Bot status
        //////////////////////////

        client.user?.setPresence({
            status: 'online',
            activities: [
                {
                    name: 'Online - /pickem | Author: @limeal',
                    type: ActivityType.Playing
                }
            ]
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