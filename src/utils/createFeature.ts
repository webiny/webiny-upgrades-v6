import type { Container } from "@webiny/di";

const FEATURE_METADATA_KEY = "wby:upgrades:isFeature" as const;

export type FeatureDefinition<TRegister = void> = [TRegister] extends [void]
    ? {
          name: string;
          register(container: Container): void;
      }
    : {
          name: string;
          register(container: Container, params: TRegister): void;
      };

export function createFeature<TRegister = void>(
    def: FeatureDefinition<TRegister>
): FeatureDefinition<TRegister> {
    const feature = {
        name: def.name,
        register: def.register
    };

    Reflect.defineMetadata(FEATURE_METADATA_KEY, true, feature);

    return feature as FeatureDefinition<TRegister>;
}

export const isFeature = (obj: unknown): obj is FeatureDefinition<void> => {
    return (
        typeof obj === "object" &&
        obj !== null &&
        Reflect.getMetadata(FEATURE_METADATA_KEY, obj) === true
    );
};
