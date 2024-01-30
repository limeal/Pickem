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
                questions.map((q, i) => ({
                    name: `Question ${i + 1}`,
                    value: q.title,
                }))
            )
    ]
})