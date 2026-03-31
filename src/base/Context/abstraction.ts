import { createAbstraction } from "../../utils/createAbstraction.js";
import { Version } from "../Version/index.js";

interface IContext {
    cwd: string;
    registry: string;
    /**
     * Version received from user input.
     */
    inputVersion: string;
    /**
     * Version parsed via semver
     */
    targetVersion: Version;
    /**
     * Version of webiny read from node_modules at startup. Never changes.
     */
    installedVersion: Version;
    /**
     * Logical current version — starts as installedVersion, advances to each
     * upgrade's version as upgrades are executed.
     */
    currentVersion: Version;
    /**
     * Advances currentVersion to the given version after an upgrade executes.
     */
    setCurrentVersion(version: Version): void;
    /**
     * Resolves given path segments relative to context's cwd.
     */
    resolve(...segments: string[]): string;
}

export const Context = createAbstraction<IContext>("Base/Context");

export namespace Context {
    export type Interface = IContext;
}
