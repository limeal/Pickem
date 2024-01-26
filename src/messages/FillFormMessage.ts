import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";

export default () => ({
    embeds: [
        new EmbedBuilder()
            .setTitle('Pick’em 🔮 - Explications')
            .setColor(Colors.DarkPurple)
            .setDescription('Répondez aux questions ci-dessous pour participer au concours.')
            .setImage('attachment://pickem.png')
    ],
    files: [
        new AttachmentBuilder('assets/images/pickem.png')
    ]
})