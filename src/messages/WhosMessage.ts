import { Form, FormQuestion, FormQuestionType, UserResponse, UserResponseStatus } from "@prisma/client";
import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";

export default (form: (Form & { questions: FormQuestion[] }), users: UserResponse[]) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle(`${form.title}: Joueurs`)
            .setColor(Colors.DarkPurple)
            .setTimestamp(Date.now())
            .setDescription(`Joueur ayant participé au pickem ${form.title}`)
            .setFields(
                users.map((u) => ({
                    name: `Joueur <@${u.userId}>`,
                    value: `
                    Status: ${u.status === UserResponseStatus.PENDING ? 'En attente' : 'Validé'}
                    Channel: <#${u.channelId}>
                    ${form.questions.at(u.nextIndex) ? `Next Question: ${form.questions.at(u.nextIndex)?.title}` : ''}
                    `
                }))
            )
    ]
})