import { FormQuestion, FormQuestionType } from "@prisma/client";
import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";

export default (title: string, answers: string[]) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle(title)
            .setColor(Colors.Green)
            .setTimestamp(Date.now())
            .setDescription(`Answers : ${answers.join(', ')}`)
    ],
    components: []
})