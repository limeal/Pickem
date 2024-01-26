import IQuestion from "./IQuestion";

interface ICategory {
    name: string;
    image: string;
    questions: IQuestion[];
}

export default ICategory;