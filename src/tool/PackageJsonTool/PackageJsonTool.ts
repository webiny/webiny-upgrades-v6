import { PackageJsonTool as PackageJsonToolAbstraction } from "./abstraction.js";
import { Context } from "../../base/Context/index.js";
import { PackageJsonService } from "../../service/PackageJson/index.js";

class PackageJsonToolImpl implements PackageJsonToolAbstraction.Interface {
    public constructor(
        private readonly context: Context.Interface,
        private readonly packageJsonService: PackageJsonService.Interface
    ) {}

    public load(target?: string): PackageJsonToolAbstraction.File | null {
        if (!target) {
            target = this.context.resolve("package.json");
        }
        return this.packageJsonService.load(target);
    }

    public loadOrThrow(target?: string): PackageJsonToolAbstraction.File {
        if (!target) {
            target = this.context.resolve("package.json");
        }
        return this.packageJsonService.loadOrThrow(target);
    }

    public save(target: PackageJsonToolAbstraction.File): void {
        return this.packageJsonService.save(target);
    }
}

export const PackageJsonTool = PackageJsonToolAbstraction.createImplementation({
    implementation: PackageJsonToolImpl,
    dependencies: [Context, PackageJsonService]
});
