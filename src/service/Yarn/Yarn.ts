import { Yarn as YarnAbstraction } from "./abstraction.js";
import { execa } from "execa";
import semver from "semver";

class YarnImpl implements YarnAbstraction.Interface {
    public async install(): Promise<void> {
        await execa("yarn", [], {
            stdio: "inherit"
        });
    }

    public async version(): Promise<semver.SemVer> {
        const { stdout } = await execa("yarn", ["--version"]);
        const version = stdout.trim();
        const result = semver.parse(version);
        if (!result) {
            throw new Error(`Failed to parse Yarn version: ${version}`);
        }
        return result;
    }
}

export const Yarn = YarnAbstraction.createImplementation({
    implementation: YarnImpl,
    dependencies: []
});
