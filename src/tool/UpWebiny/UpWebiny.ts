import { UpWebiny as UpWebinyAbstraction } from "./abstraction.js";
import { PackageJsonService } from "~/service/PackageJson/index.js";
import { Yarn } from "~/service/Yarn/index.js";
import { Context } from "~/base/Context/index.js";
import path from "node:path";

class UpWebinyImpl implements UpWebinyAbstraction.Interface {
    public constructor(
        private readonly context: Context.Interface,
        private readonly packageJsonService: PackageJsonService.Interface,
        private readonly yarn: Yarn.Interface
    ) {}

    public async execute(params: UpWebinyAbstraction.Params): Promise<void> {
        const { version, executeYarn } = params;

        const target = path.join(this.context.cwd, "package.json");
        const packageJson = this.packageJsonService.load(target);
        if (!packageJson) {
            throw new Error(`Failed to load ${target}.`);
        }

        packageJson.setDevDependency("webiny", version);

        const dependencies = packageJson.getDevDependencies();

        for (const dep in dependencies) {
            if (dep.startsWith("@webiny/") === false) {
                continue;
            }
            packageJson.setDevDependency(dep, version);
        }

        this.packageJsonService.save(packageJson);

        if (!executeYarn) {
            return;
        }
        await this.yarn.install();
    }
}

export const UpWebiny = UpWebinyAbstraction.createImplementation({
    implementation: UpWebinyImpl,
    dependencies: [Context, PackageJsonService, Yarn]
});
