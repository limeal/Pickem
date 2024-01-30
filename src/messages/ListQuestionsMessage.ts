import { Form, FormQuestion, FormQuestionType } from "@prisma/client";
import { EmbedBuilder, MessagePayloadOption, AttachmentBuilder, Colors, MessageCreateOptions } from "discord.js";

export default (form: Form, questions: FormQuestion[]) => ({
    embeds: [
        new EmbedBuilder()
            .setTitle(`${form.title}: Questions`)
            .setColor(Colors.DarkPurple)
            .setTimestamp(Date.now())
            .setDescription(`List des questions du pickem ${form.title}`)
            .setFields(
                questions.map((q) => ({
                    name: `Question ${q.ref}`,
                    value: `
                        Titre: ${q.title}
                        \nType: ${q.type}
                        \nNombre de réponses: ${q.nb_answers}
                        ${q.answers.length > 0 ? `\nReponses: ${q.answers.join(', ')}` : ''}
                        ${q.points.length > 0 ? `\nPoints: ${q.points}` : ''}
                    `
                }))
            )
    ]
})