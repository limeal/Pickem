import prisma from '../prisma';
import { ICategory, IQuestion } from '../interfaces';
import { FormQuestion, FormQuestionChoice, FormQuestionCoord, FormQuestionLinkType, FormQuestionType } from '@prisma/client';
import { Collection } from 'discord.js';
import RandExp from 'randexp';

const createQuestion = async (
    formId: number,
    categoryId: number,
    question: IQuestion,
    parentId?: number,
    lasts?: (FormQuestion & { choices: FormQuestionChoice[], coordinates: FormQuestionCoord[] })[],
) => {
    let { title, type, depend_on, regex, style, choices, answers, coordinates, parts } = question;
    console.log('Creating question', question);

    let qTitle = '';
    let qAIdx: number = -1;
    let cKey: string = '';
    let qChoices: Map<string, string[]> = new Map<string, string[]>([]);
    let qAnswers: string[] = [];
    let qLink: (FormQuestion & { choices: FormQuestionChoice[], coordinates: FormQuestionCoord[] }) | undefined = undefined;
    let qLinkType: FormQuestionLinkType = FormQuestionLinkType.NONE;
    let qType: FormQuestionType = FormQuestionType.MULTIPART;

    switch (type) {
        case 'text':
            qType = FormQuestionType.TEXT;
            break;
        case 'select':
            qType = FormQuestionType.SELECT;
            break;
        case 'button':
            qType = FormQuestionType.BUTTON;
            break;
        default:
            break;
    }

    if (typeof title === 'string') {
        qTitle = title;
    } else {
        // Choose random category from keys of the object
        const categories = Object.keys(title);
        cKey = categories[Math.floor(Math.random() * categories.length)];

        // Choose random question from the category
        const randomQ = title[cKey][Math.floor(Math.random() * title[cKey].length)];
        qAIdx = randomQ.index;
        qTitle = randomQ.title;
    }

    if (!parts && !type)
        throw new Error('Type or regex does not exist');

    if (lasts?.length && depend_on) {
        if (!lasts[depend_on.index]) throw new Error('Invalid Depency on question !');
        qLink = lasts[depend_on.index];

        switch (depend_on.rule) {
            case 'key':
                if (cKey) throw new Error('Title must be string to use depend_on with key');
                qLinkType = FormQuestionLinkType.TAKE_ANSWER;
                break;
            case 'neq':
                qLinkType = FormQuestionLinkType.NOT_EQUAL;
                break;
            default:
                throw new Error('Invalid Question Link Rule !');
        }
    }

    if (qType === FormQuestionType.SELECT) {
        if (!choices) throw new Error('Choices does not exist');
        if (cKey && !Array.isArray(choices)) choices = choices[cKey];
        if (qLink && qLinkType === FormQuestionLinkType.TAKE_ANSWER) {
            if (Array.isArray(choices)) throw new Error('Choices must be an object to use depend_on with key');
            console.log('QLink', qLink);
            switch (qLink.type) {
                case FormQuestionType.SELECT:
                    if (qLink.choices.length !== 1) throw new Error('Choices must have only one category');
                    const values = qLink.choices[0].values;
                    for (const link_value of values)
                        qChoices.set(link_value.toLowerCase().replace(/ /g, '_'), choices[link_value]);
                    break;
                default:
                    throw new Error('Depend_on can only be used with select question');
            }
        } else {
            if (!choices || !Array.isArray(choices)) throw new Error('Answers does not exist / Must be an array');
            if (!choices?.length) throw new Error('Choices does not exist');
            // Shuffle choices
            qChoices.set('default', choices.sort(() => Math.random() - 0.5));
        }
    }

    if (answers) {
        if (cKey && !Array.isArray(answers)) answers = answers[cKey];
        if (!answers || !Array.isArray(answers)) throw new Error('Answers does not exist / Must be an array');
        qAnswers = answers;
        if (qAIdx >= 0) {
            const answer = qAnswers[qAIdx];
            if (!answer) throw new Error('Answer does not exist');
            qAnswers = [answer];
        }
    } else {
        if (qType === FormQuestionType.TEXT) {
            let gen = "0";
            do {
                gen = new RandExp(regex || '.*').gen();
                qAnswers = [gen];
            } while (qLink && qLinkType === FormQuestionLinkType.NOT_EQUAL && qLink.answers.includes(gen));
        } else if (!parts) throw new Error('Parts does not exist');
    }

    if (coordinates && qAnswers.length !== coordinates.length) throw new Error('Answers and coordinates must have the same length');

    let choices_ids: number[] = [];
    let coords_ids: number[] = [];
    try {
        console.log('Choices', qChoices);
        for (const [key, value] of qChoices) {
            console.log(key, value);
            const elem = await prisma.formQuestionChoice.create({
                data: {
                    category: key,
                    values: value,
                }
            });
            choices_ids.push(elem.id);
        }

        if (coordinates) {
            for (const coord of coordinates) {
                const elem = await prisma.formQuestionCoord.create({
                    data: {
                        x: coord.x,
                        y: coord.y,
                        width: coord.width,
                        height: coord.height,
                    },
                })
                coords_ids.push(elem.id);
            }
        }
    } catch (error) {

        // Delete choices
        if (choices_ids && choices_ids.length > 0) {
            await prisma.formQuestionChoice.deleteMany({
                where: { id: { in: choices_ids } }
            })
        }

        // Delete coordinates
        if (coords_ids && coords_ids.length > 0) {
            await prisma.formQuestionCoord.deleteMany({
                where: { id: { in: coords_ids } }
            })
        }

        throw error;
    }

    const new_question = await prisma.formQuestion.create({
        data: {
            formId,
            categoryId,
            parentId: parentId ?? null,
            linkType: qLinkType,
            linkedId: qLink?.id ?? null,
            type: qType,
            title: qTitle,
            style,
            regex,
            answers: qAnswers,
            choices: {
                connect: choices_ids.map(id => ({ id })),
            },
            coordinates: {
                connect: coords_ids.map(id => ({ id })),
            }
        },
        include: {
            choices: true,
            coordinates: true,
        }
    });


    if (parts) {
        let lasts: (FormQuestion & { choices: FormQuestionChoice[], coordinates: FormQuestionCoord[] })[] = [];
        for (const part of parts) {
            lasts.push(await createQuestion(formId, categoryId, part, new_question.id, lasts));
        }
    }

    console.log('Result question', new_question);
    return new_question;
}

export default async (formId: number, data: ICategory[]) => {
    for (const category of data) {

        const new_category = await prisma.formCategory.create({
            data: {
                name: category.name,
                icon: category.image,
                formId,
            }
        });

        if (!new_category) {
            throw 'Failed to create category. !'
        }

        try {
            for (const question of category.questions)
                await createQuestion(formId, new_category.id, question);

        } catch (error) {
            throw error;
        }
    }

}