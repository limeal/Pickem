import { FormQuestionType } from "@prisma/client";
import ICoord from "./ICoord";

interface IQuestion {
    id?: number;
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
    answers?: string[] | {
        [key: string]: string[];
    };
    coordinates: ICoord[];
    parts?: IQuestion[];
}

export default IQuestion;