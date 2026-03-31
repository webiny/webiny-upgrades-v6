import { PackageJsonFile as PackageJsonFileAbstraction } from "./abstraction.js";
import { Version } from "../../base/Version/index.js";

interface IPackageJsonFileParams {
    path: string;
    raw: Partial<PackageJsonFileAbstraction.Data>;
}

const rawVersion = (version: string | Version): string => {
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
        this.raw = params.raw as PackageJsonFileAbstraction.Data;
    }

    public getDependencies(): PackageJsonFileAbstraction.Dependencies {
        if (!this.raw.dependencies) {
            return {};
        }
        return this.raw.dependencies as Record<string, string>;
    }

    public getDevDependencies(): PackageJsonFileAbstraction.DevDependencies {
        if (!this.raw.devDependencies) {
            return {};
        }
        return this.raw.devDependencies as Record<string, string>;
    }

    public getPeerDependencies(): PackageJsonFileAbstraction.PeerDependencies {
        if (!this.raw.peerDependencies) {
            return {};
        }
        return this.raw.peerDependencies as Record<string, string>;
    }

    public getResolutions(): PackageJsonFileAbstraction.Resolutions {
        if (!this.raw.resolutions) {
            return {};
        }
        return this.raw.resolutions as Record<string, string>;
    }

    public setDependency(name: string, version: string | Version): void {
        if (!this.raw.dependencies) {
            this.raw.dependencies = {};
        }
        this.raw.dependencies[name] = rawVersion(version);
    }

    public setDependencyIfExists(name: string, version: string | Version): void {
        const existing = this.getDependency(name);
        if (!existing) {
            return;
        }
        this.setDependency(name, version);
    }

    public removeDependency(name: string): void {
        if (!this.raw.dependencies?.[name]) {
            return;
        }
        delete this.raw.dependencies[name];
    }

    public getDependency(name: string): string | null {
        if (!this.raw.dependencies?.[name]) {
            return null;
        }
        return this.raw.dependencies[name];
    }

    public setDevDependency(name: string, version: string | Version): void {
        if (!this.raw.devDependencies) {
            this.raw.devDependencies = {};
        }
        this.raw.devDependencies[name] = rawVersion(version);
    }

    public setDevDependencyIfExists(name: string, version: string | Version): void {
        const existing = this.getDevDependency(name);
        if (!existing) {
            return;
        }
        this.setDevDependency(name, version);
    }

    public removeDevDependency(name: string): void {
        if (!this.raw.devDependencies?.[name]) {
            return;
        }
        delete this.raw.devDependencies[name];
    }

    public getDevDependency(name: string): string | null {
        if (!this.raw.devDependencies?.[name]) {
            return null;
        }
        return this.raw.devDependencies[name];
    }

    public setPeerDependency(name: string, version: string | Version): void {
        if (!this.raw.peerDependencies) {
            this.raw.peerDependencies = {};
        }
        this.raw.peerDependencies[name] = rawVersion(version);
    }

    public setPeerDependencyIfExists(name: string, version: string | Version): void {
        const existing = this.getPeerDependency(name);
        if (!existing) {
            return;
        }
        this.setPeerDependency(name, version);
    }

    public removePeerDependency(name: string): void {
        if (!this.raw.peerDependencies?.[name]) {
            return;
        }
        delete this.raw.peerDependencies[name];
    }

    public getPeerDependency(name: string): string | null {
        if (!this.raw.peerDependencies?.[name]) {
            return null;
        }
        return this.raw.peerDependencies[name];
    }

    public setResolution(name: string, version: string | Version): void {
        if (!this.raw.resolutions) {
            this.raw.resolutions = {};
        }
        this.raw.resolutions[name] = rawVersion(version);
    }

    public setResolutionIfExists(name: string, version: string | Version): void {
        const existing = this.getResolution(name);
        if (!existing) {
            return;
        }
        this.setResolution(name, version);
    }

    public removeResolution(name: string): void {
        if (!this.raw.resolutions?.[name]) {
            return;
        }
        delete this.raw.resolutions[name];
    }

    public getResolution(name: string): string | null {
        if (!this.raw.resolutions?.[name]) {
            return null;
        }
        return this.raw.resolutions[name];
    }

    public getVersion(): string | null {
        if (!this.raw.version) {
            return null;
        }
        return this.raw.version;
    }

    public get(key: string): unknown {
        return (this.raw as Record<string, unknown>)[key] ?? null;
    }

    public set(key: string, value: unknown): void {
        (this.raw as Record<string, unknown>)[key] = value;
    }
}
