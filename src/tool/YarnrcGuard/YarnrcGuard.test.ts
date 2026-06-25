import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "node:fs";
import { Container } from "@webiny/di";
import { YarnrcGuard as YarnrcGuardToken } from "./abstraction.js";
import { YarnrcGuard } from "./YarnrcGuard.js";
import { YarnrcGuardError } from "./YarnrcGuardError.js";
import { Context } from "../../base/Context/abstraction.js";
import { Logger } from "../../base/Logger/abstraction.js";
import { Version } from "../../base/Version/index.js";
import { createMockLogger } from "../../__tests__/utils/mockLogger.js";

vi.mock("node:fs");

const v = (version: string) => Version.create(version);

const FULL_YARNRC = `
approvedGitRepositories:
  - "https://github.com/webiny/webiny-upgrades-v6"
enableScripts: false
npmMinimalAgeGate: 3d
npmPreapprovedPackages:
  - "@webiny/*"
`;

const PARTIAL_YARNRC = `
enableScripts: false
npmMinimalAgeGate: 3d
`;

const EMPTY_YARNRC = "";

const createContainer = (cwd = "/project") => {
    const container = new Container();

    const logger = createMockLogger();
    container.registerInstance(Logger, logger);

    const context: Context.Interface = {
        cwd,
        registry: "https://registry.npmjs.org",
        inputVersion: "6.4.0",
        targetVersion: v("6.4.0"),
        installedVersion: v("6.3.0"),
        currentVersion: v("6.3.0"),
        setCurrentVersion: vi.fn(),
        resolve: vi.fn()
    };
    container.registerInstance(Context, context);

    container.register(YarnrcGuard);

    return { container, logger };
};

const params = (target: string, breakOn: string) => ({
    targetVersion: v(target),
    breakOnVersion: v(breakOn)
});

describe("YarnrcGuard", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("returns silently when all required settings are present", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(FULL_YARNRC);
        const { container } = createContainer();
        const guard = container.resolve(YarnrcGuardToken);

        expect(() => guard.execute(params("6.4.0", "6.5.0"))).not.toThrow();
    });

    it("logs warnings when settings are missing and target is below break version", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(PARTIAL_YARNRC);
        const { container, logger } = createContainer();
        const guard = container.resolve(YarnrcGuardToken);

        guard.execute(params("6.4.0", "6.5.0"));

        const warnCalls = vi.mocked(logger.warn).mock.calls.map(c => c[0]);
        expect(warnCalls.some(msg => msg.includes("approvedGitRepositories"))).toBe(true);
        expect(warnCalls.some(msg => msg.includes("npmPreapprovedPackages"))).toBe(true);
        expect(warnCalls.some(msg => msg.includes("6.5.0"))).toBe(true);
    });

    it("does not log missing settings that are present", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(PARTIAL_YARNRC);
        const { container, logger } = createContainer();
        const guard = container.resolve(YarnrcGuardToken);

        guard.execute(params("6.4.0", "6.5.0"));

        const warnCalls = vi.mocked(logger.warn).mock.calls.map(c => c[0]);
        expect(warnCalls.some(msg => msg.includes("enableScripts"))).toBe(false);
        expect(warnCalls.some(msg => msg.includes("npmMinimalAgeGate"))).toBe(false);
    });

    it("throws YarnrcGuardError when settings are missing and target >= break version", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(PARTIAL_YARNRC);
        const { container } = createContainer();
        const guard = container.resolve(YarnrcGuardToken);

        expect(() => guard.execute(params("6.5.0", "6.5.0"))).toThrow(YarnrcGuardError);
    });

    it("throws YarnrcGuardError when target is above break version", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(PARTIAL_YARNRC);
        const { container } = createContainer();
        const guard = container.resolve(YarnrcGuardToken);

        expect(() => guard.execute(params("6.6.0", "6.5.0"))).toThrow(YarnrcGuardError);
    });

    it("includes missing setting names in the error message", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(PARTIAL_YARNRC);
        const { container } = createContainer();
        const guard = container.resolve(YarnrcGuardToken);

        expect(() => guard.execute(params("6.5.0", "6.5.0"))).toThrow(/approvedGitRepositories/);
    });

    it("treats missing .yarnrc.yml as all settings missing", () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const { container } = createContainer();
        const guard = container.resolve(YarnrcGuardToken);

        expect(() => guard.execute(params("6.5.0", "6.5.0"))).toThrow(YarnrcGuardError);
    });

    it("logs all four settings when .yarnrc.yml is missing and target is below break version", () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);
        const { container, logger } = createContainer();
        const guard = container.resolve(YarnrcGuardToken);

        guard.execute(params("6.4.0", "6.5.0"));

        const warnCalls = vi.mocked(logger.warn).mock.calls.map(c => c[0]);
        expect(warnCalls.some(msg => msg.includes("approvedGitRepositories"))).toBe(true);
        expect(warnCalls.some(msg => msg.includes("enableScripts"))).toBe(true);
        expect(warnCalls.some(msg => msg.includes("npmMinimalAgeGate"))).toBe(true);
        expect(warnCalls.some(msg => msg.includes("npmPreapprovedPackages"))).toBe(true);
    });

    it("treats empty .yarnrc.yml as all settings missing", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(EMPTY_YARNRC);
        const { container } = createContainer();
        const guard = container.resolve(YarnrcGuardToken);

        expect(() => guard.execute(params("6.5.0", "6.5.0"))).toThrow(YarnrcGuardError);
    });

    it("treats .yarnrc.yml with non-object content as all settings missing", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue("just a string");
        const { container } = createContainer();
        const guard = container.resolve(YarnrcGuardToken);

        expect(() => guard.execute(params("6.5.0", "6.5.0"))).toThrow(YarnrcGuardError);
    });

    it("reads .yarnrc.yml from context.cwd", () => {
        vi.mocked(fs.existsSync).mockReturnValue(true);
        vi.mocked(fs.readFileSync).mockReturnValue(FULL_YARNRC);
        const { container } = createContainer("/my/project");
        const guard = container.resolve(YarnrcGuardToken);

        guard.execute(params("6.4.0", "6.5.0"));

        expect(fs.existsSync).toHaveBeenCalledWith(expect.stringContaining("/my/project"));
    });
});
