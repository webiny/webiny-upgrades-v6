import semver, { type SemVer } from "semver";
import { NpmService as NpmServiceAbstraction } from "./abstraction.js";
import { Logger } from "~/service/Logger/index.js";
import { Input } from "~/base/Input/index.js";

interface IRegistryPackageData {
    "dist-tags": Record<string, string>;
    versions: Record<string, unknown>;
}

class NpmServiceImpl implements NpmServiceAbstraction.Interface {
    public constructor(
        private readonly input: Input.Interface,
        private readonly logger: Logger.Interface
    ) {}

    public async getLatestVersion(packageName: string): Promise<SemVer | null> {
        const data = await this.fetchPackageData(packageName);
        if (!data) {
            return null;
        }
        const latest = data["dist-tags"]?.latest;
        if (!latest) {
            this.logger.warning(`No "latest" dist-tag found for package "%s".`, packageName);
            return null;
        }
        const parsed = semver.parse(latest);
        if (!parsed) {
            this.logger.warning(
                `Failed to parse latest version "%s" for package "%s".`,
                latest,
                packageName
            );
            return null;
        }
        return parsed;
    }

    public async getVersion(packageName: string, version: string | SemVer): Promise<SemVer | null> {
        const versionStr = typeof version === "string" ? version : version.format();
        const data = await this.fetchPackageData(packageName);
        if (!data) {
            return null;
        }
        if (!data.versions[versionStr]) {
            return null;
        }
        const parsed = semver.parse(versionStr);
        if (!parsed) {
            this.logger.warning(
                `Failed to parse version "%s" for package "%s".`,
                versionStr,
                packageName
            );
            return null;
        }
        return parsed;
    }

    private async fetchPackageData(packageName: string): Promise<IRegistryPackageData | null> {
        const url = `${this.input.registry}/${packageName}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                this.logger.warning(
                    `Registry returned %s for package "%s".`,
                    response.status,
                    packageName
                );
                return null;
            }
            return (await response.json()) as IRegistryPackageData;
        } catch (ex) {
            this.logger.error(
                `Failed to fetch package "%s" from registry: %s`,
                packageName,
                ex.message
            );
            return null;
        }
    }
}

export const NpmService = NpmServiceAbstraction.createImplementation({
    implementation: NpmServiceImpl,
    dependencies: [Input, Logger]
});
