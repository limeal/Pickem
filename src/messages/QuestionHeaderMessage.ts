import { FormQuestion, FormQuestionType } from "@prisma/client";
import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";
import config from '@/config.json';

export default (question: (FormQuestion & { questions: FormQuestion[] }), index: number, total: number) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle(question.title)
            .setColor(Colors.DarkPurple)
            .setTimestamp(Date.now())
            .setDescription(config.messages["question-subtitle"])
            .setFields(question.type === FormQuestionType.MULTIPART ? {
                name: 'Sous-Question',
                value: question.questions.length + '',
            }: {
                name: 'Question n°',
                value: index + '/' + total,
            })
    ]
})