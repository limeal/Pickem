import { UserResponse, UserSubmission } from "@prisma/client"
import { AttachmentBuilder, ChannelType, ChatInputCommandInteraction, GuildBasedChannel, MessageComponentInteraction, ModalSubmitInteraction, PermissionFlagsBits, TextBasedChannel, TextChannel, User } from "discord.js"
import Jimp from "jimp"

import prisma from "../prisma"
import ResultMessage from "messages/ResultMessage"

const ResultImagePath = 'assets/images/response.jpg'
const FontPath = 'assets/fonts/Bebas.fnt'

export default class ResultService {
    public static async Create(interaction: MessageComponentInteraction | ModalSubmitInteraction | ChatInputCommandInteraction, user: User, response: UserResponse, submissions: UserSubmission[]) {

        const guild = interaction.guild!;
        const config = await prisma.config.findFirst();

        if (!config)
            return await interaction.reply({ content: 'ERR L009 - An error occured, please try again.' });


        const questions = await prisma.formQuestion.findMany({
            where: {
                id: { in: submissions.map((s: any) => s.questionId) },
            },
            include: {
                coordinates: true,
            }
        })

        const image = await Jimp.read(ResultImagePath);
        if (!image)
            return await interaction.reply({ content: 'ERR L010 - An error occured, please try again.' });
        const font = await Jimp.loadFont(FontPath);
        if (!font)
            return await interaction.reply({ content: 'ERR L011 - An error occured, please try again.' });

        const size = 180;
        const userAvatar = await Jimp.read(user.displayAvatarURL({ extension: 'png', size: 256 }));
        userAvatar.resize(size, size);
        const mask = await Jimp.read('assets/images/mask.png');
        userAvatar.mask(mask.resize(size, size), 0, 0);

        image.print(font, 775, 30, user.username);
        image.composite(userAvatar, 765, 130);


        for (let i = 0; i < submissions.length; i++) {
            let question = questions.find(question => question.id === submissions[i].questionId);
            if (!question) return await interaction.reply({ content: 'ERR L012 - An error occured, please try again.' });
            if (submissions[i].answers.length !== question.coordinates.length) return await interaction.reply({ content: 'ERR L013 - An error occured, please try again.' });
            for (let j = 0; j < submissions[i].answers.length; j++) {
                let coordinate = question.coordinates[j];
                if (!coordinate) return await interaction.reply({ content: 'ERR L014 - An error occured, please try again.' });
                console.log(coordinate.x, coordinate.y, submissions[i].answers[j], coordinate.width, coordinate.height);
                image.print(font, coordinate.x, coordinate.y, submissions[i].answers[j].replace('_', ' '), coordinate.width, coordinate.height);
            }
        }


        let channel: TextChannel | undefined = guild.channels.cache.get(response.respChannelId) as TextChannel || await guild.channels.fetch(response.respChannelId) || undefined;
        let message = null;
        if (!channel) {
            const newChannel = await guild.channels.create({
                name: `${interaction.user.id === user.id ? `result-${user.username}` : `test-${user.username}-${interaction.user.username}`}`,
                type: ChannelType.GuildText,
                parent: config?.resultCategoryId,
                permissionOverwrites: [
                    {
                        id: user.id,
                        allow: [
                            PermissionFlagsBits.ViewChannel,
                        ],
                    },
                ],
            });

            if (!newChannel)
                return await interaction.reply({ content: 'ERR L015 - An error occured, please try again.' });

            channel = newChannel as TextChannel;
        } else
            message = channel.messages.cache.get(response.respMessageId) || await channel.messages.fetch(response.respMessageId);

        await interaction.reply({ content: `Result available in <#${channel.id}>`, ephemeral: true, fetchReply: true  });
        if (!message)
            message = await channel.send(ResultMessage(await image.getBufferAsync(Jimp.MIME_PNG), response.score, response.nextIndex))
        else
            await message.edit(ResultMessage(await image.getBufferAsync(Jimp.MIME_PNG), response.score, response.nextIndex))

        return await prisma.userResponse.update({
            where: {
                id: response.id,
                userId: user.id,
            },
            data: {
                respChannelId: channel.id,
                respMessageId: message.id,
            },
        });

    }
}