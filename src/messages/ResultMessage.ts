import { FormQuestion, FormQuestionType } from "@prisma/client";
import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions, User } from "discord.js";

export default (buffer: Buffer, user: User, score: number, total: number) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle('Pick’em 🔮 - Résultat')
            .setColor(Colors.DarkPurple)
            .setTimestamp(Date.now())
            .setDescription(`Joueur: ${user.username}#${user.discriminator} (<@${user.id}>)\n`)
    ],
    files: [
        new AttachmentBuilder(buffer)
          .setName('result.png'),
    ]
})