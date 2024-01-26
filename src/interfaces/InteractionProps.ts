import BaseInteraction from "classes/BaseInteraction";
import { Collection } from "discord.js";

class InteractionManager {
    interactions: Collection<string, BaseInteraction>;

    constructor(interactions?: Collection<string, BaseInteraction>) {
        if (!interactions) {
            this.interactions = new Collection<string, BaseInteraction>();
        } else
            this.interactions = interactions;
    }

    Set(custom_id: string, Interaction: (props: InteractionProps) => BaseInteraction, ...params: InteractionParameter[]) {
        this.interactions.set(custom_id, Interaction(<InteractionProps>{
            custom_id,
            manager: this,
            params: params.reduce((acc, { key, value }) => {
                acc.set(key, value);
                return acc;
            }, new Collection<string, any>())
        }));
    }

    Get(custom_id: string) {
        return this.interactions.get(custom_id);
    }

    Delete(custom_id: string) {
        this.interactions.delete(custom_id);
    }
}

interface InteractionParameter {
    key: string;
    value: any;
}

interface InteractionProps {
    custom_id: string;
    params: Collection<string, any>;
    manager: InteractionManager;
}

export { InteractionManager, InteractionParameter };
export default InteractionProps;