import { Form, UserResponse, UserSubmission } from "@prisma/client"
import { AttachmentBuilder, ChannelType, ChatInputCommandInteraction, GuildBasedChannel, MessageComponentInteraction, ModalSubmitInteraction, PermissionFlagsBits, TextBasedChannel, TextChannel, ThreadAutoArchiveDuration, User } from "discord.js"
import Jimp from "jimp"

import prisma from "../prisma"
import ResultMessage from "messages/ResultMessage"

const ResultImagePath = 'assets/images/response.jpg'
const FontPath = 'assets/fonts/Bebas.fnt'

export default class ResultService {
    public static async Create(interaction: MessageComponentInteraction | ModalSubmitInteraction | ChatInputCommandInteraction, user: User, form: Form, response: (UserResponse & { submissions: UserSubmission[] })) {

        const guild = interaction.guild!;
        const config = await prisma.config.findFirst();

        if (!config)
            return await interaction.reply({ content: 'An error occured, please try again.' });

        const resultChannel = await guild.channels.cache.get(form.resultChannelId) as TextChannel;

        const questions = await prisma.formQuestion.findMany({
            where: {
                id: { in: response.submissions.map((s: any) => s.questionId) },
            },
            include: {
                coordinates: true,
            }
        })

        const image = await Jimp.read(ResultImagePath);
        if (!image)
            return await interaction.reply({ content: 'An error occured, please try again.' });
        const font = await Jimp.loadFont(FontPath);
        if (!font)
            return await interaction.reply({ content: 'An error occured, please try again.' });

        const size = 180;
        const userAvatar = await Jimp.read(user.displayAvatarURL({ extension: 'png', size: 256 }));
        userAvatar.resize(size, size);
        const mask = await Jimp.read('assets/images/mask.png');
        userAvatar.mask(mask.resize(size, size), 0, 0);

        image.print(font, 820, 50, user.username);
        image.composite(userAvatar, 765, 130);

        for (let i = 0; i < response.submissions.length; i++) {
            let question = questions.find(question => question.id === response.submissions[i].questionId);
            if (!question) return await interaction.reply({ content: 'An error occured, please try again.' });
            if (response.submissions[i].answers.length !== question.coordinates.length) return await interaction.reply({ content: 'An error occured, please try again.' });
            for (let j = 0; j < response.submissions[i].answers.length; j++) {
                let coordinate = question.coordinates[j];
                if (!coordinate) return await interaction.reply({ content: 'An error occured, please try again.' });
                image.print(font, coordinate.x, coordinate.y, response.submissions[i].answers[j].replaceAll('_', ' '), coordinate.width, coordinate.height);
            }
        }

        let thread = response.respThreadId ? resultChannel.threads.cache.get(response.respThreadId) : undefined;
        let message = (response.respMessageId && thread) ? (thread.messages.cache.get(response.respMessageId) || await thread.messages.fetch(response.respMessageId)) : undefined;

        console.log(thread, message);
        if (!thread) {
            thread = await resultChannel.threads.create({
                name: `Result ${user.username}`,
                autoArchiveDuration: ThreadAutoArchiveDuration.OneWeek,
                type: ChannelType.PublicThread
            });

        }

        await interaction.reply({ content: `Result available in <#${thread.id}>`, ephemeral: true, fetchReply: true  });
        if (!message)
            message = await thread.send(ResultMessage(await image.getBufferAsync(Jimp.MIME_PNG), user, response.score, response.submissions.length))
        else
            await message.edit(ResultMessage(await image.getBufferAsync(Jimp.MIME_PNG), user, response.score, response.submissions.length))

        return await prisma.userResponse.update({
            where: {
                id: response.id,
                userId: user.id,
            },
            data: {
                respThreadId: thread.id,
                respMessageId: message.id,
            },
        });
    }
}