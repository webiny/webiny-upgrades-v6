import { createFeature } from "../../utils/createFeature.js";
import { Input } from "../../base/Input/index.js";
import { detectPackageManager } from "./detect.js";
import { YarnPackageManager } from "./YarnPackageManager.js";
import { PnpmPackageManager } from "./PnpmPackageManager.js";
import { NpmPackageManager } from "./NpmPackageManager.js";
import { PackageManagerService } from "./PackageManagerService.js";
import { PackageManagerName } from "./abstraction.js";

export const PackageManagerFeature = createFeature({
    name: "Service/PackageManager",
    register(container) {
        const input = container.resolve(Input);
        const name = detectPackageManager(input.cwd, input.packageManager);

        container.registerInstance(PackageManagerName, name);
        container.register(PackageManagerService);

        if (name === "yarn") {
            container.register(YarnPackageManager);
            return;
        } else if (name === "pnpm") {
            container.register(PnpmPackageManager);
            return;
        }
        container.register(NpmPackageManager);
    }
});
