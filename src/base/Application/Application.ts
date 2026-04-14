import { Application as ApplicationAbstraction } from "./abstraction.js";
import { UpgradeRunner } from "../../service/UpgradeRunner/index.js";
import { Responder } from "../Responder/index.js";
import { DependencyGuard } from "../../tool/DependencyGuard/index.js";
import { Logger } from "../Logger/index.js";
import { Context } from "../Context/index.js";
import { Input } from "../Input/index.js";

class ApplicationImpl implements ApplicationAbstraction.Interface {
    public constructor(
        private readonly logger: Logger.Interface,
        private readonly dependencyGuard: DependencyGuard.Interface,
        private readonly runner: UpgradeRunner.Interface,
        private readonly responder: Responder.Interface,
        private readonly context: Context.Interface,
        private readonly input: Input.Interface
    ) {}

    public async execute(): Promise<void> {
        const start = Date.now();
        /**
         * Is target version already installed? No point in running the upgrade process if that's the case.
         */
        if (
            !this.input.forceUpgrade &&
            this.context.targetVersion.raw === this.context.installedVersion.raw
        ) {
            const duration = (Date.now() - start) / 1000;
            this.responder.success(
                duration,
                `Version "${this.context.targetVersion.raw}" is already installed.`
            );
            return;
        }
        try {
            await this.runner.run();
            const duration = (Date.now() - start) / 1000;
            this.runDependencyGuard("Running dependency guard...");
            this.responder.success(duration);
        } catch (ex) {
            const duration = (Date.now() - start) / 1000;
            this.responder.error(ex.message, duration, ex);
        }
    }

    private runDependencyGuard(message: string): void {
        this.logger.debug(message);
        const result = this.dependencyGuard.execute();
        if (result.length === 0) {
            return;
        }
        this.logger.warn("Dependency mismatches detected:");
        for (const mismatch of result) {
            this.logger.warn(
                `[${mismatch.name}] Required: ${mismatch.expectedVersion}, Installed: ${mismatch.userVersion}`
            );
        }
        this.logger.warn("Please keep in mind that mismatches may cause issues with Webiny.");
    }
}

export const Application = ApplicationAbstraction.createImplementation({
    implementation: ApplicationImpl,
    dependencies: [Logger, DependencyGuard, UpgradeRunner, Responder, Context, Input]
});
