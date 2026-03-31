import { Application } from "./base/Application/index.js";
import { createContainer } from "./container.js";
import { getUserInput } from "./utils/userInput.js";

const container = await createContainer(getUserInput({ cwd: process.cwd() }));
await container.resolve(Application).execute();
