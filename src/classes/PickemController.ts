import Ajv from 'ajv';
import path from 'path';
import fs from 'fs';

import prisma from '../prisma';
import validator from '../misc/validator.json';
import { Guild } from 'discord.js';

const ajv = new Ajv();
const validate = ajv.compile(validator)

export default class PickemController {
    constructor() {
    }

    static async create(form_name: string, question_filename: string, guildId: string) {

        const filePath = path.join(process.env.TEMPLATE_FOLDER || 'templates', `/${question_filename}.json`);

        // Check if file exists in DATA_FOLDER
        if (!fs.existsSync(filePath)) {
            throw `File ${question_filename}.json does not exist.`;
        }

        const filedata: any = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        // Check if file is valid
        const valid = validate(filedata);
        if (!valid) {
            throw validate.errors?.map((error: any) => error.message).join('\n') || 'Invalid file.'
        }

        // Count number of forms in guild
        const numberForms = await prisma.form.findMany({
            where: {
                guildId,
            },
        });

        // Create empty form
        const form = await prisma.form.create({
            data: {
                title: name!,
                guildId,
                active: numberForms.length === 0,
            },
        });

        // Create questions from data
        await prisma.formQuestion.createMany({
            data: (filedata as any[]).map((question: any) => ({
                formId: form.id,
                title: question.title,
                type: question.type,
                choices: question.choices,
                answers: question.answers,
                answersRO: question.answersRO || false,
            })),
        });

        return form;
    }

    static async set(id: number, guild: Guild) {
        // Deactivate all forms
        await prisma.form.updateMany({
            where: {
                guildId: guild.id,
                active: true,
            },
            data: {
                active: false,
            },
        });

        // Collect all current responses and delete channels
        const responses = await prisma.userResponse.findMany({
            where: {
                guildId: guild.id,
            },
        });

        // Delete all channels
        for (const response of responses) {
            await guild.channels.delete(response.channelId);
        }

        // Delete all responses
        await prisma.userResponse.deleteMany({
            where: {
                guildId: guild.id,
            },
        });

        // Activate form
        await prisma.form.update({
            where: {
                id,
            },
            data: {
                active: true,
            },
        });
    }

    static async delete(id: number, guildId: string) {
        await prisma.form.delete({
            where: {
                id,
                guildId,
            },
        });
    }

    static async getAll(guildId: string) {
        return await prisma.form.findMany({
            where: {
                guildId,
            },
        });
    }

    static async getOne(id: number, guildId: string) {
        return await prisma.form.findFirst({
            where: {
                id,
                guildId,
            },
        });
    }
}