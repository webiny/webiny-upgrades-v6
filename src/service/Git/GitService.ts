import { execa } from "execa";
import { Git as GitAbstraction } from "./abstraction.js";
import { Context } from "../../base/Context/index.js";

class GitServiceImpl implements GitAbstraction.Interface {
    public constructor(private readonly context: Context.Interface) {}

    public async isClean(): Promise<boolean> {
        const isGitRepository = await this.isGitRepository();
        if (!isGitRepository) {
            return true;
        }
        const { stdout } = await execa("git", ["status", "--porcelain"], {
            cwd: this.context.cwd
        });
        return stdout.trim() === "";
    }

    public async restore(): Promise<void> {
        const isGitRepository = await this.isGitRepository();
        if (!isGitRepository) {
            return;
        }
        await execa("git", ["restore", "."], { cwd: this.context.cwd });
        await execa("git", ["clean", "-fd"], { cwd: this.context.cwd });
    }

    private async isGitRepository(): Promise<boolean> {
        try {
            const { stdout } = await execa("git", ["rev-parse", "--is-inside-work-tree"], {
                cwd: this.context.cwd
            });
            return stdout.trim() === "true";
        } catch {
            return false;
        }
    }
}

export const Git = GitAbstraction.createImplementation({
    implementation: GitServiceImpl,
    dependencies: [Context]
});
