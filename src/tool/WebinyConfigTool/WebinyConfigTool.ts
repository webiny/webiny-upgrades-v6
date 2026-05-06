import { WebinyConfigTool as WebinyConfigToolAbstraction } from "./abstraction.js";
import { WebinyConfigFile } from "./WebinyConfigFile.js";
import { Context } from "../../base/Context/index.js";
import { Logger } from "../../base/Logger/index.js";
import fs from "node:fs";

class WebinyConfigToolImpl implements WebinyConfigToolAbstraction.Interface {
    public constructor(
        private readonly context: Context.Interface,
        private readonly logger: Logger.Interface
    ) {}

    public read(): WebinyConfigToolAbstraction.File {
        const filePath = this.context.resolve("webiny.config.tsx");
        if (!fs.existsSync(filePath)) {
            throw new Error(`webiny.config.tsx not found at: ${filePath}`);
        }
        return new WebinyConfigFile(filePath, this.logger);
    }

    public save(file: WebinyConfigToolAbstraction.File): void {
        file.save();
    }
}

export const WebinyConfigTool = WebinyConfigToolAbstraction.createImplementation({
    implementation: WebinyConfigToolImpl,
    dependencies: [Context, Logger]
});
