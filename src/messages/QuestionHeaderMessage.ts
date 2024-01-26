import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";

export default (title: string, nb_answers: number, score: number, index: number, total: number) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle(title)
            .setColor(Colors.DarkPurple)
            .setTimestamp(Date.now())
            .setDescription(`${nb_answers > 1 ? 'Plusieurs réponses possibles' : 'Une réponse possible'}, bonne chance ;)`)
            .addFields({
                name: 'Score Actuel',
                value: score + '',
            })
            .addFields({
                name: 'Question',
                value: index + 1 + '/' + total,
            })
    ]
})