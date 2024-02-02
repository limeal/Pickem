import { Form, UserResponse, UserSubmission } from "@prisma/client"
import { AttachmentBuilder, ChannelType, ChatInputCommandInteraction, GuildBasedChannel, MessageComponentInteraction, ModalSubmitInteraction, PermissionFlagsBits, TextBasedChannel, TextChannel, ThreadAutoArchiveDuration, User } from "discord.js"
import Jimp from "jimp"

import prisma from "../prisma"
import RecapMessage from "messages/RecapMessage"

const ResultImagePath = 'assets/images/response.jpg'
const FontPath = 'assets/fonts/Bebas.fnt'

export default class ResultService {
    public static async Create(channel: TextChannel, user: User, form: Form, response: (UserResponse & { submissions: UserSubmission[] })) {

        const guild = channel.guild!;

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
            return channel.send({ content: 'An error occured, please try again.' });
        const font = await Jimp.loadFont(FontPath);
        if (!font)
            return channel.send({ content: 'An error occured, please try again.' });

        const size = 180;
        const userAvatar = await Jimp.read(user.displayAvatarURL({ extension: 'png', size: 256 }));
        userAvatar.resize(size, size);
        const mask = await Jimp.read('assets/images/mask.png');
        userAvatar.mask(mask.resize(size, size), 0, 0);

        image.print(font, 800, 50, user.username);
        image.composite(userAvatar, 765, 130);

        for (let i = 0; i < response.submissions.length; i++) {
            let question = questions.find(question => question.id === response.submissions[i].questionId);
            if (!question) return channel.send({ content: 'An error occured, please try again.' });
            if (response.submissions[i].answers.length !== question.coordinates.length) return await channel.send({ content: 'An error occured, please try again.' });
            for (let j = 0; j < response.submissions[i].answers.length; j++) {
                let coordinate = question.coordinates[j];
                if (!coordinate) return channel.send({ content: 'An error occured, please try again.' });
                image.print(font, coordinate.x, coordinate.y, response.submissions[i].answers[j].replaceAll('_', ' '), coordinate.width, coordinate.height);
            }
        }

        let message = response.respMessageId ? (resultChannel.messages.cache.get(response.respMessageId) || await resultChannel.messages.fetch(response.respMessageId)) : undefined;
        const attachmentFile = new AttachmentBuilder(await image.getBufferAsync(Jimp.MIME_PNG));

        if (!message)
            message = await resultChannel.send({ content: `Ticket de <@${response.userId}>`, files: [attachmentFile] })
        else
            await message.edit({ content: `Ticket de <@${response.userId}>`, files: [attachmentFile] })

        await prisma.userResponse.update({
            where: {
                id: response.id,
                userId: user.id,
            },
            data: {
                respChannelId: resultChannel.id,
                respMessageId: message.id,
            },
        });

        return channel.send(RecapMessage(resultChannel.id)).then(m => {
            setTimeout(() => {
                m.channel.delete();
            }, 60 * 1000);
        });
    }
}