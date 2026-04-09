import path from "node:path";
import { Application } from "./base/Application/index.js";
import { createContainer } from "./container.js";
import { getUserInput } from "./utils/userInput.js";

const container = await createContainer({
    ...getUserInput({ cwd: process.cwd() }),
    joinPath: (...segments) => {
        return path.join(...segments);
    }
});
await container.resolve(Application).execute();
