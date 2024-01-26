import RandExp from 'randexp';
import prisma from '../prisma';
import { ICategory, IQuestion, IAnswer } from '../interfaces';
import ICoord from '@interfaces/ICoord';

const createQuestion = async (
    formId: number,
    categoryId: number,
    question: IQuestion,
    parentId?: number,
    lasts?: IQuestion[],
) => {
    const { title, type, depend_on, regex, choices, answers, coordinates, parts } = question;
    console.log('Creating question', question);

    let qTitle = '';
    let qAIdxs: number[] = [];
    let cKey: string = '';
    let qChoices: string[] = [];
    let qAnswers: string[] = [];
    let spRule = '';

    if (typeof title === 'string') {
        qTitle = title;
    } else if (Array.isArray(title)) {
        // Choose random title from array
        const c = title[Math.floor(Math.random() * title.length)];
        if (typeof c === 'string') {
            qTitle = c;
        } else {
            cKey = c.cat;
            qTitle = c.key;
            qAIdxs = typeof c.answer_indexes === 'number' ? [c.answer_indexes] : c.answer_indexes;
        }
    }

    if (!parts && (!type || !answers))
        throw new Error('Type or regex does not exist');

    if (lasts?.length && depend_on) {
        const rule = depend_on.rule;

        switch (rule) {
            case 'key':
                const last = lasts[depend_on.index];
                if (!Array.isArray(last.answers))
                    throw new Error('Depend question is not a string array');
                if (last.answers.length > 1)
                    throw new Error('Depend question has more than 1 answer');
                if (cKey)
                    throw new Error('Depend on \'key\' cannot be used when \'title\' use \'answer_index\'');
                cKey = last.answers[0];
                break;
            default:
                spRule = depend_on.rule + ' ' + depend_on.index;
                break;
        }
    }

    if (type === 'select') {
        if (!choices?.length)
            throw new Error('Choices does not exist');
        if (cKey.length && Array.isArray(choices))
            throw new Error('Choices must be an object');
        if (!cKey.length && !Array.isArray(choices))
            throw new Error('Choices must be an array');

        if (Array.isArray(choices)) {
            qChoices = choices;
        } else {
            qChoices = choices[cKey];
        }

        // Shuffle choices
        qChoices = qChoices.sort(() => Math.random() - 0.5);
    }

    if (answers?.length) {
        if (qAIdxs.length && Array.isArray(answers))
            throw new Error('Answers must be an object');
        if (!qAIdxs.length && !Array.isArray(answers))
            throw new Error('Answers must be an array');

        if (Array.isArray(answers)) {
            qAnswers = answers;
        } else {
            qAnswers = answers[cKey];
            // Pick only the answers that are needed qAIdxs
            qAnswers = qAnswers.filter((_, idx) => qAIdxs.includes(idx));
        }
    }


    const new_question = await prisma.formQuestion.create({
        data: {
            formId,
            categoryId,
            type,
            title: qTitle,
            regex,
            spRegex: spRule,
            choices: qChoices,
            answers: qAnswers
        },
        include: {
            coordinates: true,
        }
    });

    try {
        for (const coord of coordinates) {
            await prisma.formQuestionCoord.create({
                data: {
                    questionId: new_question.id,
                    x: coord.x,
                    y: coord.y,
                    width: coord.width,
                    height: coord.height,
                },
            })
        }
    } catch (error) {

        await prisma.formQuestion.delete({
            where: {
                id: new_question.id,
            },
        });

        throw error;
    }

    if (parts) {
        let lasts: IQuestion[] = [];
        for (const part of parts) {
            lasts.push(await createQuestion(formId, categoryId, part, new_question.id, lasts));
        }
    }

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
            // Delete category if error
            await prisma.formCategory.delete({
                where: {
                    id: new_category.id,
                },
            });
            throw error;
        }
    }

}