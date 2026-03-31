import type { Container as DIContainer } from "@webiny/di";
import { createAbstraction } from "../../utils/createAbstraction.js";

export const Container = createAbstraction<DIContainer>("Base/Container");

export namespace Container {
    export type Interface = DIContainer;
}
