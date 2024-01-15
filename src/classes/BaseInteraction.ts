import { Interaction } from "discord.js";

export default interface BaseInteraction {
    unwrap(): any;
    execute(interaction: Interaction): void;
}