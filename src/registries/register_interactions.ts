
import { Collection } from "discord.js";

import fs from 'fs';
import path from 'path';

//////////////////////////
// LOAD Interactions
//////////////////////////

const interactions = new Collection<string, any>();

const interactionFiles = fs.readdirSync(path.join(__dirname, '../interactions')).filter(file => file.endsWith('.ts'));

for (const file of interactionFiles) {
    const Interaction: any = require(path.join(__dirname, '../interactions', file)).default;
    interactions.set(Interaction.ID, new Interaction());
}

export default interactions;