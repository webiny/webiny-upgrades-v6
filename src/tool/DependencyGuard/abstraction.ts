import { createAbstraction } from "../../utils/createAbstraction.js";

interface IMismatch {
    name: string;
    userVersion: string;
    expectedVersion: string;
}

interface IDependencyGuard {
    execute(): IMismatch[];
}

export const DependencyGuard = createAbstraction<IDependencyGuard>("Tool/DependencyGuard");

export namespace DependencyGuard {
    export type Interface = IDependencyGuard;
    export type Mismatch = IMismatch;
}
