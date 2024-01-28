import { FormQuestionType } from "@prisma/client";
import ICoord from "./ICoord";

interface IQuestion {
    ref: number;
    title: string | {
        [key: string]: {
            title: string;
            index: number;
        }[];
    };
    type?: string;
    depend_on?: {
        index: number;
        rule: string;
    };
    regex?: string;
    style?: string;
    choices?: string[] | {
        [key: string]: string[];
    };
    nb_answers?: number;
    coordinates: ICoord[];
    parts?: IQuestion[];
}

export default IQuestion;