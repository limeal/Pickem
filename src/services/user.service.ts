import { Guild, User } from "discord.js";

import prisma from "../prisma";

const ResetUser = async (user: User, guild: Guild) => {
    const userResponse = await prisma.userResponse.findFirst({
        where: {
            userId: user.id,
        },
    });

    if (!userResponse) throw 'ERR L100 - An error occured, please contact an admin.';

    const channelForm = await guild.channels.fetch(userResponse.channelId);
    if (channelForm) await channelForm.delete();
    const channelResult = await guild.channels.fetch(userResponse.respChannelId);
    if (channelResult) await channelResult.delete();

    await prisma.userResponse.deleteMany({
        where: {
            userId: user.id,
        },
    });
}

const GetUser = async (user: User) => {
    const userResponse = await prisma.userResponse.findFirst({
        where: {
            userId: user.id,
        },
    });

    if (!userResponse) throw 'ERR L101 - An error occured, please contact an admin.';

    return userResponse;
}

const GetLeaderboard = async () => {
    return await prisma.userResponse.findMany({
        orderBy: {
            score: 'desc',
        },
        take: 10,
        select: {
            userId: true,
            score: true,
        }
    })
}

export {
    ResetUser,
    GetUser,
    GetLeaderboard,
}