import { Form, FormCron } from "@prisma/client";
import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";
import cronstrue from 'cronstrue';

export default (forms: ({
    cron: FormCron | null;
    id: number;
    title: string;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
})[]) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle('Pick’em 🔮 - Forms')
            .setColor(Colors.DarkPurple)
            .setDescription('Liste de tous les pickems.')
            .setFields(forms
                .map(form => ({
                    name: form.title,
                    value: `Active: ${form.active? 'Oui' : 'Non'}${form.cron?.cron ? `\nProgrammed: ${cronstrue.toString(form.cron?.cron)}` : ''}`,
                }))
            )
    ]
})