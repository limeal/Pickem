import { ChannelType, Guild, GuildBasedChannel, GuildTextBasedChannel, TextChannel, User } from "discord.js";

import prisma from "../prisma";
import { Form, FormQuestion, FormStatus, UserResponse, UserResponseStatus, UserSubmission } from "@prisma/client";

export default class UserService {
    public static async Clear(user: User, guild: Guild) {
        const userResponse = await prisma.userResponse.findFirst({
            where: {
                userId: user.id,
            },
        });

        if (!userResponse) throw 'An error occured, please contact an admin.';

        try {
            const channelForm = await guild.channels.fetch(userResponse.channelId);
            if (channelForm) await channelForm.delete();
        } catch (err: any) { }
        try {
            const respChannel: GuildBasedChannel | null = guild.channels.cache.get(userResponse.respChannelId) || await guild.channels.fetch(userResponse.respChannelId);
            if (respChannel && respChannel.type === ChannelType.GuildText) await respChannel.messages.delete(userResponse.respMessageId);
        } catch (err: any) { }

        await prisma.userResponse.deleteMany({
            where: {
                userId: user.id,
            },
        });
    }

    public static async UpdateScore(userResponse: (UserResponse & { submissions: UserSubmission[] })) {
        const form = await prisma.form.findFirst({
            where: {
                active: true,
                status: FormStatus.CLOSED,
            },
            include: {
                questions: true,
            }
        });

        if (!form) throw 'An error occured, please contact an admin.';

        let score = 0;
        for (const submission of userResponse.submissions) {
            // For each submission check if the answer of the submission is == to the question answer
            const question = form.questions.find((q) => q.id === submission.questionId);
            if (!question) throw 'An error occured, please contact an admin.';
            if (!question.answers.length) continue;
            if (question.answers.length !== submission.answers.length) return 0;
            
            let count = 0;
            for (let i = 0; i < question.answers.length; i++) {
                if (question.answers[i].toLowerCase().replaceAll(/ /g, '_') === submission.answers[i]) count++;
            }

            if (count === question.answers.length) {
                switch (question.points[0]) {
                    case '*':
                        score *= parseInt(question.points.slice(1));
                        break;
                    case '-':
                        score -= parseInt(question.points.slice(1));
                        break;
                    default:
                        score += parseInt(question.points.slice(1));
                        break;
                }
            }
        }

        return await prisma.userResponse.update({
            where: {
                id: userResponse.id,
            },
            data: {
                score: score,
            },
        });
    }

    public static async Get(user: User) {
        const userResponse = await prisma.userResponse.findFirst({
            where: {
                userId: user.id,
            },
        });

        if (!userResponse) throw 'An error occured, please contact an admin.';

        return userResponse;
    }

    public static async Leaderboard(max?: number) {
        return await prisma.userResponse.findMany({
            orderBy: {
                score: 'desc',
            },
            where: {
                status: UserResponseStatus.COMPLETED,
                form: {
                    status: FormStatus.CLOSED,
                }
            },
            take: max ?? 10,
            select: {
                userId: true,
                score: true,
            }
        })
    }
}