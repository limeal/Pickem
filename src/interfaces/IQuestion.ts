import ICoord from "./ICoord";
import IAnswer from "./ICoord";

interface IQuestion {
    title: string | {
        cat: string;
        key: string;
        answer_indexes: number | number[];
    }[];
    type?: string;
    depend_on?: {
        index: number;
        rule: string;
    };
    regex?: string;
    choices?: string[] | {
        [key: string]: string[];
    };
    answers: string[] | {
        [key: string]: string[];
    };
    coordinates: ICoord[];
    parts?: IQuestion[];
}

export default IQuestion;