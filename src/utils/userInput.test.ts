import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getUserInput } from "./userInput.js";

const setArgv = (...args: string[]) => {
    process.argv = ["node", "script", ...args];
};

describe("getUserInput", () => {
    beforeEach(() => {
        setArgv();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe("version", () => {
        it("defaults to 'latest' when no version is provided", () => {
            const result = getUserInput({ cwd: "/project" });
            expect(result.version).toBe("latest");
        });

        it("picks up the positional version argument", () => {
            setArgv("6.1.0");
            const result = getUserInput({ cwd: "/project" });
            expect(result.version).toBe("6.1.0");
        });
    });

    describe("cwd", () => {
        it("falls back to params.cwd when --cwd is not provided", () => {
            const result = getUserInput({ cwd: "/project" });
            expect(result.cwd).toBe("/project");
        });

        it("uses --cwd over params.cwd when provided", () => {
            setArgv("--cwd", "/other");
            const result = getUserInput({ cwd: "/project" });
            expect(result.cwd).toBe("/other");
        });
    });

    describe("forceUpgrade", () => {
        it("is false by default", () => {
            const result = getUserInput({ cwd: "/project" });
            expect(result.forceUpgrade).toBe(false);
        });

        it("is true when --force is passed", () => {
            setArgv("--force");
            const result = getUserInput({ cwd: "/project" });
            expect(result.forceUpgrade).toBe(true);
        });
    });

    describe("registry", () => {
        it("defaults to the npm registry", () => {
            const result = getUserInput({ cwd: "/project" });
            expect(result.registry).toBe("https://registry.npmjs.org");
        });

        it("uses --registry when provided", () => {
            setArgv("--registry", "https://my.registry.com");
            const result = getUserInput({ cwd: "/project" });
            expect(result.registry).toBe("https://my.registry.com");
        });

        it("calls process.exit(1) when registry is not a valid URL", () => {
            setArgv("--registry", "not-a-url");
            vi.spyOn(process, "exit").mockImplementation(() => {
                throw new Error("process.exit(1)");
            });
            expect(() => getUserInput({ cwd: "/project" })).toThrow("process.exit(1)");
        });
    });

    describe("logLevel", () => {
        it("defaults to 'debug'", () => {
            const result = getUserInput({ cwd: "/project" });
            expect(result.logLevel).toBe("debug");
        });

        it("uses --log-level when provided", () => {
            setArgv("--log-level", "debug");
            const result = getUserInput({ cwd: "/project" });
            expect(result.logLevel).toBe("debug");
        });
    });

    describe("dryRun", () => {
        it("is false by default", () => {
            const result = getUserInput({ cwd: "/project" });
            expect(result.dryRun).toBe(false);
        });

        it("is true when --dry-run is passed", () => {
            setArgv("--dry-run");
            const result = getUserInput({ cwd: "/project" });
            expect(result.dryRun).toBe(true);
        });

        it("forces logLevel to 'debug' when --dry-run is set", () => {
            setArgv("--dry-run", "--log-level", "error");
            const result = getUserInput({ cwd: "/project" });
            expect(result.logLevel).toBe("debug");
        });
    });
});
