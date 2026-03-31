import { describe, expect, it } from "vitest";
import { Version } from "../../../src/base/Version/index.js";
import { PackageJsonFile } from "../../../src/service/PackageJson/PackageJsonFile.js";
import type { PackageJsonFile as PackageJsonFileAbstraction } from "../../../src/service/PackageJson/abstraction.js";

const createFile = (raw: Partial<PackageJsonFileAbstraction.Data> = {}): PackageJsonFile => {
    return new PackageJsonFile({
        path: "/project/package.json",
        raw: raw as PackageJsonFileAbstraction.Data
    });
};

describe("PackageJsonFile", () => {
    describe("dependencies", () => {
        it("returns empty object when dependencies are not set", () => {
            const file = createFile();
            expect(file.getDependencies()).toEqual({});
        });

        it("sets and gets a dependency", () => {
            const file = createFile();
            file.setDependency("lodash", "4.17.21");
            expect(file.getDependency("lodash")).toBe("4.17.21");
        });

        it("sets a dependency using a SemVer object", () => {
            const file = createFile();
            file.setDependency("lodash", Version.create("4.17.21"));
            expect(file.getDependency("lodash")).toBe("4.17.21");
        });

        it("sets a dependency when dependencies section already exists", () => {
            const file = createFile({ dependencies: { existing: "1.0.0" } });
            file.setDependency("lodash", "4.17.21");
            expect(file.getDependency("existing")).toBe("1.0.0");
            expect(file.getDependency("lodash")).toBe("4.17.21");
        });

        it("returns null for a missing dependency", () => {
            const file = createFile();
            expect(file.getDependency("lodash")).toBeNull();
        });

        it("removes a dependency", () => {
            const file = createFile({ dependencies: { lodash: "4.17.21" } });
            file.removeDependency("lodash");
            expect(file.getDependency("lodash")).toBeNull();
        });

        it("does not throw when removing a missing dependency", () => {
            const file = createFile();
            expect(() => file.removeDependency("lodash")).not.toThrow();
        });
    });

    describe("devDependencies", () => {
        it("returns empty object when devDependencies are not set", () => {
            const file = createFile();
            expect(file.getDevDependencies()).toEqual({});
        });

        it("sets and gets a devDependency", () => {
            const file = createFile();
            file.setDevDependency("vitest", "4.0.0");
            expect(file.getDevDependency("vitest")).toBe("4.0.0");
        });

        it("sets a devDependency when devDependencies section already exists", () => {
            const file = createFile({ devDependencies: { existing: "1.0.0" } });
            file.setDevDependency("vitest", "4.0.0");
            expect(file.getDevDependency("existing")).toBe("1.0.0");
            expect(file.getDevDependency("vitest")).toBe("4.0.0");
        });

        it("returns null for a missing devDependency", () => {
            const file = createFile();
            expect(file.getDevDependency("vitest")).toBeNull();
        });

        it("removes a devDependency", () => {
            const file = createFile({ devDependencies: { vitest: "4.0.0" } });
            file.removeDevDependency("vitest");
            expect(file.getDevDependency("vitest")).toBeNull();
        });

        it("does not throw when removing a missing devDependency", () => {
            const file = createFile();
            expect(() => file.removeDevDependency("vitest")).not.toThrow();
        });
    });

    describe("peerDependencies", () => {
        it("returns empty object when peerDependencies are not set", () => {
            const file = createFile();
            expect(file.getPeerDependencies()).toEqual({});
        });

        it("sets and gets a peerDependency", () => {
            const file = createFile();
            file.setPeerDependency("react", "18.0.0");
            expect(file.getPeerDependency("react")).toBe("18.0.0");
        });

        it("sets a peerDependency when peerDependencies section already exists", () => {
            const file = createFile({ peerDependencies: { existing: "1.0.0" } });
            file.setPeerDependency("react", "18.0.0");
            expect(file.getPeerDependency("existing")).toBe("1.0.0");
            expect(file.getPeerDependency("react")).toBe("18.0.0");
        });

        it("removes a peerDependency", () => {
            const file = createFile({ peerDependencies: { react: "18.0.0" } });
            file.removePeerDependency("react");
            expect(file.getPeerDependency("react")).toBeNull();
        });

        it("does not throw when removing a missing peerDependency", () => {
            const file = createFile();
            expect(() => file.removePeerDependency("react")).not.toThrow();
        });
    });

    describe("resolutions", () => {
        it("returns empty object when resolutions are not set", () => {
            const file = createFile();
            expect(file.getResolutions()).toEqual({});
        });

        it("sets and gets a resolution", () => {
            const file = createFile();
            file.setResolution("lodash", "4.17.21");
            expect(file.getResolution("lodash")).toBe("4.17.21");
        });

        it("sets a resolution when resolutions section already exists", () => {
            const file = createFile({ resolutions: { existing: "1.0.0" } });
            file.setResolution("lodash", "4.17.21");
            expect(file.getResolution("existing")).toBe("1.0.0");
            expect(file.getResolution("lodash")).toBe("4.17.21");
        });

        it("removes a resolution", () => {
            const file = createFile({ resolutions: { lodash: "4.17.21" } });
            file.removeResolution("lodash");
            expect(file.getResolution("lodash")).toBeNull();
        });

        it("does not throw when removing a missing resolution", () => {
            const file = createFile();
            expect(() => file.removeResolution("lodash")).not.toThrow();
        });
    });

    describe("get / set (custom fields)", () => {
        it("returns null for a missing key", () => {
            const file = createFile();
            expect(file.get("webiny")).toBeNull();
        });

        it("sets and gets a custom key", () => {
            const file = createFile();
            file.set("webiny", { upgrades: [] });
            expect(file.get("webiny")).toEqual({ upgrades: [] });
        });

        it("overwrites an existing custom key", () => {
            const file = createFile();
            file.set("webiny", { upgrades: [] });
            file.set("webiny", { upgrades: [{ version: "6.0.0" }] });
            expect(file.get("webiny")).toEqual({ upgrades: [{ version: "6.0.0" }] });
        });
    });

    describe("getVersion", () => {
        it("returns null when version is not set", () => {
            const file = createFile();
            expect(file.getVersion()).toBeNull();
        });

        it("returns the version string", () => {
            const file = createFile({ version: "1.2.3" });
            expect(file.getVersion()).toBe("1.2.3");
        });
    });
});
