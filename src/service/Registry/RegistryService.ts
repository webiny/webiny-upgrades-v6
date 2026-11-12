import { RegistryService as RegistryServiceAbstraction } from "./abstraction.js";
import { Logger } from "../../base/Logger/index.js";
import { Input } from "../../base/Input/index.js";
import { Version } from "../../base/Version/index.js";
import { readTarballFile } from "./readTarballFile.js";

interface IRegistryPackageVersion {
    dist?: {
        tarball?: string;
    };
}

interface IRegistryPackageData {
    "dist-tags": Record<string, string>;
    versions: Record<string, IRegistryPackageVersion>;
}

class RegistryServiceImpl implements RegistryServiceAbstraction.Interface {
    public constructor(
        private readonly input: Input.Interface,
        private readonly logger: Logger.Interface
    ) {}

    public async getLatestVersion(packageName: string): Promise<Version | null> {
        const data = await this.fetchPackageData(packageName);
        if (!data) {
            return null;
        }
        const latest = data["dist-tags"]?.latest;
        if (!latest) {
            this.logger.warn(`No "latest" dist-tag found for package "%s".`, packageName);
            return null;
        }
        const parsed = Version.parse(latest);
        if (!parsed) {
            this.logger.warn(
                `Failed to parse latest version "%s" for package "%s".`,
                latest,
                packageName
            );
            return null;
        }
        return parsed;
    }

    public async getVersion(
        packageName: string,
        version: string | Version
    ): Promise<Version | null> {
        const versionStr = typeof version === "string" ? version : version.format();
        const data = await this.fetchPackageData(packageName);
        if (!data) {
            return null;
        }
        if (!data.versions[versionStr]) {
            return null;
        }
        const parsed = Version.parse(versionStr);
        if (!parsed) {
            this.logger.warn(
                `Failed to parse version "%s" for package "%s".`,
                versionStr,
                packageName
            );
            return null;
        }
        return parsed;
    }

    public async getFile(
        packageName: string,
        version: string | Version,
        filePath: string
    ): Promise<string | null> {
        const versionStr = typeof version === "string" ? version : version.format();
        /**
         * A package that isn't published is the same as a version that isn't, so a 404 here
         * returns null without a warning.
         */
        const data = await this.fetchPackageData(packageName, { warnOnNotFound: false });
        const tarballUrl = data?.versions[versionStr]?.dist?.tarball;
        if (!tarballUrl) {
            return null;
        }
        try {
            const response = await fetch(tarballUrl);
            if (!response.ok) {
                this.logger.warn(
                    `Registry returned %s for the "%s@%s" tarball.`,
                    response.status,
                    packageName,
                    versionStr
                );
                return null;
            }
            const tarball = Buffer.from(await response.arrayBuffer());
            return readTarballFile(tarball, filePath);
        } catch (ex) {
            this.logger.error(
                `Failed to read "%s" from the "%s@%s" tarball: %s`,
                filePath,
                packageName,
                versionStr,
                ex.message
            );
            return null;
        }
    }

    private async fetchPackageData(
        packageName: string,
        options: { warnOnNotFound: boolean } = { warnOnNotFound: true }
    ): Promise<IRegistryPackageData | null> {
        const url = `${this.input.registry}/${packageName}`;
        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404 && !options.warnOnNotFound) {
                    return null;
                }
                this.logger.warn(
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

export const RegistryService = RegistryServiceAbstraction.createImplementation({
    implementation: RegistryServiceImpl,
    dependencies: [Input, Logger]
});
