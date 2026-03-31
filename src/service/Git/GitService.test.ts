import { describe, it, expect, vi, beforeEach } from "vitest";
import { Container } from "@webiny/di";
import { Git as GitImpl } from "./GitService.js";
import { Git } from "./abstraction.js";
import { Context } from "../../base/Context/abstraction.js";

vi.mock("execa", () => ({
    execa: vi.fn()
}));

import { execa } from "execa";

const mockGitRepo = () => {
    (execa as any).mockImplementation((_cmd: string, args: string[]) => {
        if (args[0] === "rev-parse") {
            return Promise.resolve({ stdout: "true" });
        }
        return Promise.resolve({ stdout: "" });
    });
};

const createContainer = (cwd = "/project") => {
    const container = new Container();
    container.registerInstance(Context, {
        cwd
    } as unknown as Context.Interface);
    container.register(GitImpl);
    return container;
};

describe("GitService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("isGitRepository", () => {
        it("returns true (clean) when cwd is not a git repository", async () => {
            (execa as any).mockRejectedValue(new Error("not a git repo"));
            const git = createContainer().resolve(Git);
            expect(await git.isClean()).toBe(true);
        });

        it("skips restore when cwd is not a git repository", async () => {
            (execa as any).mockRejectedValue(new Error("not a git repo"));
            const git = createContainer().resolve(Git);
            await git.restore();
            expect(execa).toHaveBeenCalledTimes(1);
            expect(execa).toHaveBeenCalledWith("git", ["rev-parse", "--is-inside-work-tree"], {
                cwd: "/project"
            });
        });
    });

    describe("isClean", () => {
        it("returns true when git status output is empty", async () => {
            mockGitRepo();
            const git = createContainer().resolve(Git);
            expect(await git.isClean()).toBe(true);
        });

        it("returns true when git status output is only whitespace", async () => {
            (execa as any).mockImplementation((_cmd: string, args: string[]) => {
                if (args[0] === "rev-parse") {
                    return Promise.resolve({ stdout: "true" });
                }
                return Promise.resolve({ stdout: "   \n  " });
            });
            const git = createContainer().resolve(Git);
            expect(await git.isClean()).toBe(true);
        });

        it("returns false when there are uncommitted changes", async () => {
            (execa as any).mockImplementation((_cmd: string, args: string[]) => {
                if (args[0] === "rev-parse") {
                    return Promise.resolve({ stdout: "true" });
                }
                return Promise.resolve({ stdout: " M src/index.ts\n" });
            });
            const git = createContainer().resolve(Git);
            expect(await git.isClean()).toBe(false);
        });

        it("runs git status --porcelain in the correct cwd", async () => {
            mockGitRepo();
            const git = createContainer("/my/project").resolve(Git);
            await git.isClean();
            expect(execa).toHaveBeenCalledWith("git", ["status", "--porcelain"], {
                cwd: "/my/project"
            });
        });
    });

    describe("restore", () => {
        it("runs git restore . then git clean -fd", async () => {
            mockGitRepo();
            const git = createContainer().resolve(Git);
            await git.restore();
            expect(execa).toHaveBeenNthCalledWith(2, "git", ["restore", "."], {
                cwd: "/project"
            });
            expect(execa).toHaveBeenNthCalledWith(3, "git", ["clean", "-fd"], {
                cwd: "/project"
            });
        });

        it("runs restore before clean", async () => {
            const order: string[] = [];
            (execa as any).mockImplementation((_cmd: string, args: string[]) => {
                order.push(args.join(" "));
                return Promise.resolve({ stdout: "true" });
            });
            const git = createContainer().resolve(Git);
            await git.restore();
            expect(order).toEqual(["rev-parse --is-inside-work-tree", "restore .", "clean -fd"]);
        });
    });
});
