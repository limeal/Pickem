import { FormQuestion, FormQuestionType } from "@prisma/client";
import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";

export default (question: (FormQuestion & { questions: FormQuestion[] }), score: number, index: number, total: number) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle(question.title)
            .setColor(Colors.DarkPurple)
            .setTimestamp(Date.now())
            .setDescription(`${question.answers.length > 1 ? 'Plusieurs réponses possibles' : 'Une réponse possible'}, bonne chance ;)`)
            .setFields({
                name: 'Score Actuel',
                value: score + '',
            }, question.type === FormQuestionType.MULTIPART ? {
                name: 'Sous-Question',
                value: question.questions.length + '',
            }: {
                name: 'Question n°',
                value: index + '/' + total,
            })
    ]
})