import { FormQuestion, FormQuestionType } from "@prisma/client";
import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions, User } from "discord.js";

export default (channelId: string) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle('Pick’em 🔮 - Recap')
            .setColor(Colors.DarkPurple)
            .setTimestamp(Date.now())
            .setDescription(
                `Recapitulatif disponible ici <#${channelId}>\n\n
                Suppression du salon dans **60 seconds**\n\n
                **Merci d'avoir participé !**
                `
            )
    ]
})