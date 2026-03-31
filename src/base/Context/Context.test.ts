import { describe, it, expect } from "vitest";
import path from "node:path";
import { Context } from "./Context.js";
import { Version } from "../Version/index.js";

const v = (version: string) => Version.create(version);

const createContext = (overrides: Partial<ConstructorParameters<typeof Context>[0]> = {}) => {
    return new Context({
        cwd: "/project",
        registry: "https://registry.npmjs.org",
        inputVersion: "6.1.0",
        targetVersion: v("6.1.0"),
        installedVersion: v("6.0.0"),
        ...overrides
    });
};

describe("Context", () => {
    describe("currentVersion", () => {
        it("starts as installedVersion", () => {
            const ctx = createContext({ installedVersion: v("6.0.0") });
            expect(ctx.currentVersion).toEqual(v("6.0.0"));
        });

        it("installedVersion never changes after setCurrentVersion", () => {
            const ctx = createContext({ installedVersion: v("6.0.0") });
            ctx.setCurrentVersion(v("6.1.0"));
            expect(ctx.installedVersion).toEqual(v("6.0.0"));
        });
    });

    describe("setCurrentVersion", () => {
        it("updates currentVersion", () => {
            const ctx = createContext();
            ctx.setCurrentVersion(v("6.1.0"));
            expect(ctx.currentVersion).toEqual(v("6.1.0"));
        });

        it("can be advanced multiple times", () => {
            const ctx = createContext();
            ctx.setCurrentVersion(v("6.0.1"));
            ctx.setCurrentVersion(v("6.1.0"));
            expect(ctx.currentVersion).toEqual(v("6.1.0"));
        });
    });

    describe("resolve", () => {
        it("resolves a single segment relative to cwd", () => {
            const ctx = createContext({ cwd: "/project" });
            expect(ctx.resolve("package.json")).toBe(path.resolve("/project", "package.json"));
        });

        it("resolves multiple segments relative to cwd", () => {
            const ctx = createContext({ cwd: "/project" });
            expect(ctx.resolve("apps", "api", "package.json")).toBe(
                path.resolve("/project", "apps", "api", "package.json")
            );
        });

        it("returns an absolute path when given an absolute segment", () => {
            const ctx = createContext({ cwd: "/project" });
            expect(ctx.resolve("/absolute/path")).toBe(path.resolve("/absolute/path"));
        });
    });
});
