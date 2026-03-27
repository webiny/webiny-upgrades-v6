import path from "node:path";
import fs from "node:fs";
import { UpWebinyFeature } from "~/tool/UpWebiny/index.js";
import { UpgradeHandler } from "~/base/UpgradeHandler/index.js";
import { Context, registerContext } from "~/base/Context/index.js";
import { Logger } from "~/service/Logger/index.js";
import type { FeatureDefinition } from "~/utils/createFeature.js";
import { createContainer } from "~/container.js";
import { getUserInput } from "~/utils/userInput.js";

const userInput = getUserInput({
    cwd: process.cwd()
});

interface IResponseData {
    type: "success" | "error";
    message: string;
    code?: string;
    error?: any;
    data?: any;
}

const response = (data: IResponseData): void => {
    console.log(JSON.stringify(data));
    process.exit(data.type === "error" ? 1 : 0);
};

const start = Date.now();

const container = createContainer(userInput);
const log = container.resolve(Logger);

interface Runner {
    default?: FeatureDefinition<unknown>;
}

try {
    await registerContext(container);
    UpWebinyFeature.register(container);

    const input = container.resolve(Context);
    const version = input.targetVersion;
    /**
     * Now we need to load the target upgrade, register it and run if possible.
     */
    const upgradePath = path.join(import.meta.dirname, "upgrades", version.format(), "index.ts");
    if (!fs.existsSync(upgradePath)) {
        response({
            type: "error",
            message: "Upgrade script does not exist.",
            code: "SCRIPT_DOES_NOT_EXIST",
            data: {
                version,
                path: upgradePath
            }
        });
    }
    const runner = (await import(upgradePath)) as Runner | null;
    if (!runner?.default?.register) {
        response({
            type: "error",
            message: "Upgrade script does not export a default function.",
            code: "INVALID_SCRIPT",
            data: {
                version,
                path: upgradePath
            }
        });
        // must be here to satisfy TypeScript that runner.default.register exists, even though we know it does from the check above.
        process.exit(1);
    }
    runner.default.register(container);

    const handler = container.resolve(UpgradeHandler);
    await handler.handle({
        version
    });

    const duration = (Date.now() - start) / 1000;
    log.success(`Upgrade completed in %ss.`, duration);

    response({ type: "success", message: "", error: null });
} catch (ex) {
    const duration = (Date.now() - start) / 1000;
    log.error(`Upgrade failed in %ss.`, duration);

    response({
        type: "error",
        message: ex.message,
        code: "ERROR",
        data: {
            stack: ex.stack
        }
    });
}
