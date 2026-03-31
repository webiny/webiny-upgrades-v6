import { Context as ContextAbstraction } from "./abstraction.js";
import { Version } from "../Version/index.js";
import path from "node:path";

interface IContextParams {
    cwd: string;
    registry: string;
    inputVersion: string;
    targetVersion: Version;
    installedVersion: Version;
}

export class Context implements ContextAbstraction.Interface {
    public readonly cwd;
    public readonly registry;
    public readonly inputVersion;
    public readonly targetVersion;
    public readonly installedVersion;

    private _currentVersion: Version;

    public constructor(params: IContextParams) {
        this.cwd = params.cwd;
        this.registry = params.registry;
        this.inputVersion = params.inputVersion;
        this.targetVersion = params.targetVersion;
        this.installedVersion = params.installedVersion;
        this._currentVersion = params.installedVersion;
    }

    public get currentVersion(): Version {
        return this._currentVersion;
    }

    public setCurrentVersion(version: Version): void {
        this._currentVersion = version;
    }

    public resolve(...segments: string[]): string {
        return path.resolve(this.cwd, ...segments);
    }
}
