import { createAbstraction } from "../../utils/createAbstraction.js";
import { Version } from "../../base/Version/index.js";

interface IUpgradeHistoryEntry {
    version: string;
    timestamp: string;
}

interface IUpgradeHistory {
    add(version: Version): void;
    remove(version: Version): void;
    get(version: Version): IUpgradeHistoryEntry | null;
    list(): IUpgradeHistoryEntry[];
}

export const UpgradeHistory = createAbstraction<IUpgradeHistory>("Tool/UpgradeHistory");

export namespace UpgradeHistory {
    export type Interface = IUpgradeHistory;
    export type Entry = IUpgradeHistoryEntry;
}
