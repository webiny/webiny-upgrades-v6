import { PackageJsonFile as PackageJsonFileAbstraction } from "./abstraction.js";
import type { SemVer } from "semver";

interface IPackageJsonFileParams {
    path: string;
    raw: PackageJsonFileAbstraction.Data;
}

const convertVersion = (version: string | SemVer): string => {
    if (typeof version === "string") {
        return version;
    }
    return version.raw;
};

export class PackageJsonFile implements PackageJsonFileAbstraction.Interface {
    public readonly path;
    public readonly raw;

    public constructor(params: IPackageJsonFileParams) {
        this.path = params.path;
        this.raw = params.raw;
    }

    public getDependencies(): Record<string, string> {
        return (this.raw.dependencies as Record<string, string>) || {};
    }

    public getDevDependencies(): Record<string, string> {
        return (this.raw.devDependencies as Record<string, string>) || {};
    }

    public getPeerDependencies(): Record<string, string> {
        return (this.raw.peerDependencies as Record<string, string>) || {};
    }

    public getResolutions(): Record<string, string> {
        return (this.raw.resolutions as Record<string, string>) || {};
    }

    public setDependency(name: string, version: string | SemVer): void {
        if (!this.raw.dependencies) {
            this.raw.dependencies = {};
        }
        this.raw.dependencies[name] = convertVersion(version);
    }

    public removeDependency(name: string): void {
        if (!this.raw.dependencies[name]) {
            return;
        }
        delete this.raw.dependencies[name];
    }

    public getDependency(name: string): string | null {
        return this.raw.dependencies?.[name] || null;
    }

    public setDevDependency(name: string, version: string | SemVer): void {
        if (!this.raw.devDependencies) {
            this.raw.devDependencies = {};
        }
        this.raw.devDependencies[name] = convertVersion(version);
    }

    public removeDevDependency(name: string): void {
        if (!this.raw.devDependencies?.[name]) {
            return;
        }
        delete this.raw.devDependencies[name];
    }

    public getDevDependency(name: string): string | null {
        return this.raw.devDependencies?.[name] || null;
    }

    public setPeerDependency(name: string, version: string | SemVer): void {
        if (!this.raw.peerDependencies) {
            this.raw.peerDependencies = {};
        }
        this.raw.peerDependencies[name] = convertVersion(version);
    }

    public removePeerDependency(name: string): void {
        if (!this.raw.peerDependencies?.[name]) {
            return;
        }
        delete this.raw.peerDependencies[name];
    }

    public getPeerDependency(name: string): string | null {
        return this.raw.peerDependencies?.[name] || null;
    }

    public setResolution(name: string, version: string | SemVer): void {
        if (!this.raw.resolutions) {
            this.raw.resolutions = {};
        }
        this.raw.resolutions[name] = convertVersion(version);
    }

    public removeResolution(name: string): void {
        if (!this.raw.resolutions?.[name]) {
            return;
        }
        delete this.raw.resolutions[name];
    }

    public getResolution(name: string): string | null {
        return this.raw.resolutions?.[name] || null;
    }

    public getVersion(): string | null {
        return this.raw.version || null;
    }
}
