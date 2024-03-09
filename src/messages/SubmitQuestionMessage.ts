import { FormQuestion, FormQuestionType } from "@prisma/client";
import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";
import config from '@/config.json';

export default (title: string, answers: string[]) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle(title)
            .setColor(Colors.Green)
            .setTimestamp(Date.now())
            .setDescription(config.options["show-selected_answers"] ? 'Votre/vos réponse(s): ' + answers.join('\n') : '')
    ],
    components: []
})