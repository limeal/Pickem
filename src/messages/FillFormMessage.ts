import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";
import config from '@/config.json';

export default () => ({
    embeds: [
        new EmbedBuilder()
            .setTitle('Pick’em 🔮 - Explications')
            .setColor(Colors.DarkPurple)
            .setDescription(config.messages["start-pickem-subtitle"])
            .setImage('attachment://pickem.png')
    ],
    files: [
        new AttachmentBuilder('assets/images/pickem.png')
    ]
})