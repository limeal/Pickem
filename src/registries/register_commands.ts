
import { Collection } from "discord.js";

import fs from 'fs';
import path from 'path';


//////////////////////////
// LOAD COMMANDS
//////////////////////////


const commands = new Collection<string, any>();

const commandFiles = fs.readdirSync(path.join(__dirname, '../commands')).filter(file => file.endsWith('.ts'));

for (const file of commandFiles) {
    const command = require(path.join(__dirname, '../commands', file)).default;
    commands.set(command.data.name, command);
}

export default commands;