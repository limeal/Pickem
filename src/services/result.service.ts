import { UserSubmission } from "@prisma/client"
import { AttachmentBuilder, ChannelType, MessageComponentInteraction, PermissionFlagsBits, User } from "discord.js"
import Jimp from "jimp"

import prisma from "../prisma"
const ResultImagePath = 'assets/images/response.jpg'
const FontPath = 'assets/fonts/Bebas.fnt'

const CreateResult = async (interaction: MessageComponentInteraction, user: User, userSubmissions: UserSubmission[]) => {

    const guild = interaction.guild!;
    const config = await prisma.config.findFirst();

    if (!config)
        return await interaction.reply({ content: 'ERR L009 - An error occured, please try again.' });


    const questions = await prisma.formQuestion.findMany({
        where: {
            id: { in: userSubmissions.map((s: any) => s.questionId) },
        },
        include: {
            coordinates: true,
        }
    })

    const image = await Jimp.read(ResultImagePath);
    if (!image)
        return await interaction.reply({ content: 'ERR L010 - An error occured, please try again.' });
    console.log('Image loaded');
    const font = await Jimp.loadFont(FontPath);
    if (!font)
        return await interaction.reply({ content: 'ERR L011 - An error occured, please try again.' });
    console.log('Font loaded');

    const userAvatar = await Jimp.read(user.displayAvatarURL({ extension: 'png', size: 128 }));

    image.composite(userAvatar, 415, 60);


    for (let i = 0; i < userSubmissions.length; i++) {
        let question = questions.find(question => question.id === userSubmissions[i].questionId);
        if (!question) return await interaction.reply({ content: 'ERR L012 - An error occured, please try again.' });
        if (userSubmissions[i].answers.length !== question.coordinates.length) return await interaction.reply({ content: 'ERR L013 - An error occured, please try again.' });
        for (let j = 0; j < userSubmissions[i].answers.length; j++) {
            let coordinate = question.coordinates[j];
            if (!coordinate) return await interaction.reply({ content: 'ERR L014 - An error occured, please try again.' });
            console.log(coordinate.x, coordinate.y, userSubmissions[i].answers[j], coordinate.width, coordinate.height);
            image.print(font, coordinate.x, coordinate.y, userSubmissions[i].answers[j], coordinate.width, coordinate.height);
        }
    }


    const newChannel = await guild.channels.create({
        name: `result-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: config?.resultCategoryId,
        permissionOverwrites: [
            {
                id: interaction.user.id,
                allow: [
                    PermissionFlagsBits.ViewChannel,
                ],
            },
        ],
    });

    if (!newChannel)
        return await interaction.reply({ content: 'ERR L015 - An error occured, please try again.' });


    console.log('Creating result...');
    const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
    const attachment = new AttachmentBuilder(buffer)
        .setName(`result-${interaction.user.username}.png`);

    console.log('Sending result');
    return await newChannel.send({
        content: `Your score`,
        files: [attachment],
    });
}

export default CreateResult;