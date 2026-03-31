import type { Container } from "@webiny/di";

export interface FeatureDefinition<TRegister> {
    name: string;
    register(container: Container, context?: TRegister): void;
}

export function createFeature<TRegister>(def: {
    name: string;
    register(container: Container, context?: TRegister): void;
}): FeatureDefinition<TRegister> {
    const feature = {
        name: def.name,
        register: def.register
    };

    Reflect.defineMetadata("wby:upgrades:isFeature", true, feature);

    return feature as FeatureDefinition<TRegister>;
}

export const isFeature = (obj: unknown): obj is FeatureDefinition<unknown> => {
    return (
        typeof obj === "object" &&
        obj !== null &&
        Reflect.getMetadata("wby:upgrades:isFeature", obj) === true
    );
};
