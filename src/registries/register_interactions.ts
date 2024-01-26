
import InteractionProps from "@interfaces/InteractionProps";
import { InteractionManager } from "@interfaces/InteractionProps";
import BaseInteraction from "classes/BaseInteraction";
import { Collection } from "discord.js";

import fs from 'fs';
import path from 'path';

//////////////////////////
// LOAD Interactions
//////////////////////////

const interactionManager = new InteractionManager();
const interactionFiles = fs.readdirSync(path.join(__dirname, '../interactions')).filter(file => file.endsWith('.ts'));


for (const file of interactionFiles) {
    console.log(`Loading interaction ${file}`);
    const Interaction: (props: InteractionProps) => BaseInteraction = require(path.join(__dirname, '../interactions', file)).default;
    interactionManager.Set(file.split('.')[0], Interaction);
}

console.log(`Loaded ${interactionManager.interactions.size} interactions`);
console.log(interactionManager.interactions.keys());

export default interactionManager;