// Read all files in the commands folder and register them as commands
import path from 'path';
import fs from 'fs';
import { Collection, REST, Routes, SlashCommandBuilder } from 'discord.js';
import commands from 'registries/register_commands';
import dotenv from 'dotenv';
dotenv.config();

(async () => {

    const rest = new REST().setToken(process.env.DISCORD_BOT_TOKEN || '');

    console.log(`Found ${commands.size} application (/) commands.`);

    try {
        await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID || ''),
            { body: [] },
        );


        console.log(`Removed all application (/) commands.`);
        console.log(commands.map(command => command.data.toJSON()));

        // The put method is used to fully refresh all commands in the guild with the current set
        const data: any = await rest.put(
            Routes.applicationCommands(process.env.DISCORD_CLIENT_ID || ''),
            { body: commands.map(command => command.data.toJSON()) },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);

    } catch (error) {
        console.error(error);
    }
})();