import { FormQuestion, FormQuestionType } from "@prisma/client";
import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";

export default (buffer: Buffer, score: number, total: number) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle('Pick’em 🔮 - Résultat')
            .setColor(Colors.DarkPurple)
            .setTimestamp(Date.now())
            .setDescription(`Score: ${score}/${total}`)
    ],
    files: [
        new AttachmentBuilder(buffer)
          .setName('result.png'),
    ]
})