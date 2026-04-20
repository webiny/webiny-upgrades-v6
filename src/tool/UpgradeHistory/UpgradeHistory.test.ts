import { describe, it, expect, vi, beforeEach } from "vitest";
import { Container } from "@webiny/di";
import { UpgradeHistory as UpgradeHistoryImpl } from "./UpgradeHistory.js";
import { UpgradeHistory } from "./abstraction.js";
import { PackageJsonTool } from "../PackageJsonTool/abstraction.js";
import { PackageJsonLoadError } from "../../service/PackageJson/index.js";
import { createMockPackageJsonFile } from "../../__tests__/utils/mockPackageJsonFile.js";
import { Version } from "../../base/Version/index.js";

const v = (version: string) => Version.create(version);

const createContainer = (webinyField?: unknown) => {
    const file = createMockPackageJsonFile({ name: "test-app", version: "1.0.0" } as any);
    if (webinyField !== undefined) {
        file.set("webiny", webinyField);
    }
    const packageJsonTool: PackageJsonTool.Interface = {
        load: vi.fn().mockReturnValue(file),
        loadOrThrow: vi.fn().mockReturnValue(file),
        save: vi.fn()
    };
    const container = new Container();
    container.registerInstance(PackageJsonTool, packageJsonTool);
    container.register(UpgradeHistoryImpl);
    return { container, packageJsonTool, file };
};

describe("UpgradeHistory", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-03-31T10:00:00.000Z"));
    });

    describe("add", () => {
        it("appends an entry to an empty history", () => {
            const { container, file } = createContainer();
            const history = container.resolve(UpgradeHistory);

            history.add(v("6.1.0"));

            const webiny = file.get("webiny") as Record<string, unknown>;
            expect(webiny.history).toEqual([
                { version: "6.1.0", timestamp: "2026-03-31T10:00:00.000Z" }
            ]);
        });

        it("appends to existing history", () => {
            const { container, file } = createContainer({
                history: [{ version: "6.0.0", timestamp: "2026-03-30T09:00:00.000Z" }]
            });
            const history = container.resolve(UpgradeHistory);

            history.add(v("6.1.0"));

            const webiny = file.get("webiny") as Record<string, unknown>;
            expect((webiny.history as unknown[]).length).toBe(2);
        });

        it("preserves other webiny fields", () => {
            const { container, file } = createContainer({ theme: "dark" });
            const history = container.resolve(UpgradeHistory);

            history.add(v("6.1.0"));

            const webiny = file.get("webiny") as Record<string, unknown>;
            expect(webiny.theme).toBe("dark");
        });

        it("saves the file after adding", () => {
            const { container, packageJsonTool } = createContainer();
            const history = container.resolve(UpgradeHistory);

            history.add(v("6.1.0"));

            expect(packageJsonTool.save).toHaveBeenCalledOnce();
        });
    });

    describe("remove", () => {
        it("removes an entry by version", () => {
            const { container, file } = createContainer({
                history: [
                    { version: "6.0.0", timestamp: "2026-03-30T09:00:00.000Z" },
                    { version: "6.1.0", timestamp: "2026-03-31T10:00:00.000Z" }
                ]
            });
            const history = container.resolve(UpgradeHistory);

            history.remove(v("6.0.0"));

            const webiny = file.get("webiny") as Record<string, unknown>;
            expect(webiny.history).toEqual([
                { version: "6.1.0", timestamp: "2026-03-31T10:00:00.000Z" }
            ]);
        });

        it("does nothing when version is not in history", () => {
            const { container, file } = createContainer({
                history: [{ version: "6.0.0", timestamp: "2026-03-30T09:00:00.000Z" }]
            });
            const history = container.resolve(UpgradeHistory);

            history.remove(v("6.1.0"));

            const webiny = file.get("webiny") as Record<string, unknown>;
            expect((webiny.history as unknown[]).length).toBe(1);
        });
    });

    describe("get", () => {
        it("returns the entry for a given version", () => {
            const { container } = createContainer({
                history: [{ version: "6.0.0", timestamp: "2026-03-30T09:00:00.000Z" }]
            });
            const history = container.resolve(UpgradeHistory);

            const entry = history.get(v("6.0.0"));

            expect(entry).toEqual({ version: "6.0.0", timestamp: "2026-03-30T09:00:00.000Z" });
        });

        it("returns null when version is not found", () => {
            const { container } = createContainer();
            const history = container.resolve(UpgradeHistory);

            expect(history.get(v("6.0.0"))).toBeNull();
        });
    });

    describe("list", () => {
        it("returns all entries", () => {
            const { container } = createContainer({
                history: [
                    { version: "6.0.0", timestamp: "2026-03-30T09:00:00.000Z" },
                    { version: "6.1.0", timestamp: "2026-03-31T10:00:00.000Z" }
                ]
            });
            const history = container.resolve(UpgradeHistory);

            expect(history.list()).toHaveLength(2);
        });

        it("returns empty array when no history exists", () => {
            const { container } = createContainer();
            const history = container.resolve(UpgradeHistory);

            expect(history.list()).toEqual([]);
        });
    });

    describe("error handling", () => {
        it("throws when package.json cannot be loaded", () => {
            const container = new Container();
            container.registerInstance(PackageJsonTool, {
                load: vi.fn().mockReturnValue(null),
                loadOrThrow: vi.fn().mockImplementation(() => {
                    throw new PackageJsonLoadError("/project/package.json");
                }),
                save: vi.fn()
            });
            container.register(UpgradeHistoryImpl);
            const history = container.resolve(UpgradeHistory);

            expect(() => history.list()).toThrow(PackageJsonLoadError);
        });
    });
});
