
import { Collection } from "discord.js";
import cron from 'node-cron';

//////////////////////////
// LOAD TASKS
//////////////////////////


const tasks = new Collection<string, cron.ScheduledTask>();

export default tasks;