import {
    PackageJsonFile as PackageJsonFileAbstraction,
    PackageJsonService as PackageJsonServiceAbstraction
} from "./abstraction.js";
import { loadJsonFileSync } from "load-json-file";
import { writeJsonFileSync } from "write-json-file";
import { PackageJsonFile } from "../../service/PackageJson/PackageJsonFile.js";
import { Logger } from "../../base/Logger/index.js";

class PackageJsonServiceImpl implements PackageJsonServiceAbstraction.Interface {
    public constructor(private readonly logger: Logger.Interface) {}

    public load(target: string): PackageJsonServiceAbstraction.File | null {
        try {
            const content = loadJsonFileSync<PackageJsonFileAbstraction.Data>(target);

            return new PackageJsonFile({
                path: target,
                raw: content
            });
        } catch (ex) {
            this.logger.error(ex.message);
            return null;
        }
    }

    public loadOrThrow(target: string): PackageJsonServiceAbstraction.File {
        const file = this.load(target);
        if (!file) {
            throw new Error(`Failed to load ${target}`);
        }
        return file;
    }

    public save(target: PackageJsonServiceAbstraction.File): void {
        return writeJsonFileSync(target.path, target.raw);
    }
}

export const PackageJsonService = PackageJsonServiceAbstraction.createImplementation({
    implementation: PackageJsonServiceImpl,
    dependencies: [Logger]
});
