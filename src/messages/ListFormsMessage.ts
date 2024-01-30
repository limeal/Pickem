import { Form, FormCategory, FormCron, FormQuestion, FormStatus, UserResponse } from "@prisma/client";
import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";
import cronstrue from 'cronstrue';

export default (forms: (Form & { cron: FormCron | null, questions: FormQuestion[], categories: FormCategory[], responses: UserResponse[] })[]) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle('Pick’em 🔮 - Forms')
            .setColor(Colors.DarkPurple)
            .setDescription('Liste de tous les pickems.')
            .setFields(forms
                .map(form => ({
                    name: form.title,
                    value:
                        `Actuel: ${form.active ? 'Oui' : 'Non'}
                        Ouvert: ${form.status === FormStatus.OPEN ? 'Oui' : 'Non'}
                        Nombre de Questions: ${form.questions.length}
                        Nombre de Réponses: ${form.responses.length}
                        Categories: ${form.categories.map(c => c.name).join(', ')}
                        ${form.cron?.cron ? `\nProgrammer: ${cronstrue.toString(form.cron?.cron)}
                        ` : ''}`,
                }))
            )
    ]
})