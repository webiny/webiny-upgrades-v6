import { UpgradeHistory as UpgradeHistoryAbstraction } from "./abstraction.js";
import { PackageJsonTool } from "../PackageJsonTool/index.js";
import { Version } from "../../base/Version/index.js";

class UpgradeHistoryImpl implements UpgradeHistoryAbstraction.Interface {
    public constructor(private readonly packageJsonTool: PackageJsonTool.Interface) {}

    public add(version: Version): void {
        const file = this.loadOrThrow();
        const history = this.readHistory(file);
        history.push({
            version: version.raw,
            timestamp: new Date().toISOString()
        });
        file.set("webiny", { ...this.readWebinyField(file), history });
        this.packageJsonTool.save(file);
    }

    public remove(version: Version): void {
        const file = this.loadOrThrow();
        const history = this.readHistory(file);
        const filtered = history.filter(entry => entry.version !== version.raw);
        file.set("webiny", { ...this.readWebinyField(file), history: filtered });
        this.packageJsonTool.save(file);
    }

    public get(version: Version): UpgradeHistoryAbstraction.Entry | null {
        const file = this.loadOrThrow();
        const history = this.readHistory(file);
        return history.find(entry => entry.version === version.raw) ?? null;
    }

    public list(): UpgradeHistoryAbstraction.Entry[] {
        const file = this.loadOrThrow();
        return this.readHistory(file);
    }

    private loadOrThrow(): PackageJsonTool.File {
        const file = this.packageJsonTool.load();
        if (!file) {
            throw new Error("Failed to load package.json");
        }
        return file;
    }

    private readWebinyField(file: PackageJsonTool.File): Record<string, unknown> {
        const webiny = file.get("webiny");
        if (webiny && typeof webiny === "object" && !Array.isArray(webiny)) {
            return webiny as Record<string, unknown>;
        }
        return {};
    }

    private readHistory(file: PackageJsonTool.File): UpgradeHistoryAbstraction.Entry[] {
        const webiny = this.readWebinyField(file);
        if (Array.isArray(webiny.history)) {
            return webiny.history as UpgradeHistoryAbstraction.Entry[];
        }
        return [];
    }
}

export const UpgradeHistory = UpgradeHistoryAbstraction.createImplementation({
    implementation: UpgradeHistoryImpl,
    dependencies: [PackageJsonTool]
});
