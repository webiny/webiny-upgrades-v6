import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Container } from "@webiny/di";
import { Application } from "./base/Application/index.js";
import { Context } from "./base/Context/index.js";
import { Logger } from "./base/Logger/index.js";
import { UpgradeHistory } from "./tool/UpgradeHistory/index.js";
import { UpWebiny } from "./tool/UpWebiny/index.js";

vi.mock("execa", () => ({ execa: vi.fn() }));
vi.mock("load-json-file", () => ({ loadJsonFileSync: vi.fn() }));
vi.mock("node:fs");

import { loadJsonFileSync } from "load-json-file";
import fs from "node:fs";
import { createContainer } from "./container.js";
import { createTarball } from "./__tests__/utils/createTarball.js";
import { ReferencesService } from "./service/References/index.js";

const TARBALL_URL = "https://registry.test/tarball.tgz";

/**
 * Every version in `versions` points at one tarball that holds `references.json` in both the
 * `@webiny/cli` and the `@webiny/dependency-versions` layout.
 */
const mockRegistry = (
    versions: Record<string, unknown>,
    latest: string,
    tarball: Buffer | null = createTarball({
        "files/references.json": JSON.stringify({
            references: [{ name: "react", versions: [{ version: "18.3.1" }] }]
        }),
        "references.json": JSON.stringify({
            references: [{ name: "react", versions: [{ version: "19.3.1" }] }]
        })
    })
) => {
    const withTarballs = Object.fromEntries(
        Object.keys(versions).map(version => [version, { dist: { tarball: TARBALL_URL } }])
    );
    vi.spyOn(global, "fetch").mockImplementation(async input => {
        if (input === TARBALL_URL) {
            return {
                ok: tarball !== null,
                status: tarball ? 200 : 404,
                arrayBuffer: async () => tarball
            } as unknown as Response;
        }
        return {
            ok: true,
            json: async () => ({ "dist-tags": { latest }, versions: withTarballs })
        } as Response;
    });
};

const mockFs = (installedVersion: string) => {
    (loadJsonFileSync as any).mockImplementation((filePath: string) => {
        if (filePath.includes("node_modules/webiny/package.json")) {
            return { name: "webiny", version: installedVersion };
        }
        return { name: "test", version: "1.0.0" };
    });
    (fs.existsSync as any).mockImplementation((filePath: string) => {
        return filePath.includes("yarn.lock");
    });
};

const joinPath = (...segments: string[]) => segments.join("/");

const createParams = (overrides: Record<string, unknown> = {}) => ({
    version: "6.1.0",
    logLevel: "error" as const,
    json: false,
    forceUpgrade: false,
    registry: "https://registry.npmjs.org",
    cwd: "/project",
    skipDependencyGuard: true,
    dryRun: false,
    joinPath,
    ...overrides
});

describe("createContainer", () => {
    let exitSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
        vi.clearAllMocks();
        exitSpy = vi.spyOn(process, "exit").mockImplementation((() => {
            throw new Error("process.exit called");
        }) as never);
    });

    afterEach(() => {
        exitSpy.mockRestore();
    });

    it("returns a Container instance", async () => {
        mockRegistry({ "6.1.0": {} }, "6.1.0");
        mockFs("6.0.0");

        const container = await createContainer(createParams());

        expect(container).toBeInstanceOf(Container);
    });

    it("resolves Application from the container", async () => {
        mockRegistry({ "6.1.0": {} }, "6.1.0");
        mockFs("6.0.0");

        const container = await createContainer(createParams());
        const app = container.resolve(Application);

        expect(typeof app.execute).toBe("function");
    });

    it("resolves Context with correct target and installed versions", async () => {
        mockRegistry({ "6.1.0": {} }, "6.1.0");
        mockFs("6.0.0");

        const container = await createContainer(createParams());
        const ctx = container.resolve(Context);

        expect(ctx.targetVersion.format()).toBe("6.1.0");
        expect(ctx.installedVersion.format()).toBe("6.0.0");
    });

    it("resolves Logger from the container", async () => {
        mockRegistry({ "6.1.0": {} }, "6.1.0");
        mockFs("6.0.0");

        const container = await createContainer(createParams());
        const logger = container.resolve(Logger);

        expect(typeof logger.info).toBe("function");
        expect(typeof logger.error).toBe("function");
    });

    it("resolves UpgradeHistory from the container", async () => {
        mockRegistry({ "6.1.0": {} }, "6.1.0");
        mockFs("6.0.0");

        const container = await createContainer(createParams());
        const history = container.resolve(UpgradeHistory);

        expect(typeof history.add).toBe("function");
        expect(typeof history.list).toBe("function");
    });

    it("resolves UpWebiny from the container", async () => {
        mockRegistry({ "6.1.0": {} }, "6.1.0");
        mockFs("6.0.0");

        const container = await createContainer(createParams());
        const upWebiny = container.resolve(UpWebiny);

        expect(typeof upWebiny.execute).toBe("function");
    });

    it("resolves latest version when version param is 'latest'", async () => {
        mockRegistry({ "6.2.0": {} }, "6.2.0");
        mockFs("6.0.0");

        const container = await createContainer(createParams({ version: "latest" }));
        const ctx = container.resolve(Context);

        expect(ctx.targetVersion.format()).toBe("6.2.0");
    });

    it("calls process.exit when registry fetch fails", async () => {
        vi.spyOn(global, "fetch").mockResolvedValue({
            ok: false,
            status: 404,
            json: async () => ({})
        } as Response);
        mockFs("6.0.0");

        await expect(createContainer(createParams())).rejects.toThrow("process.exit called");
    });

    it("exits when version does not exist in registry", async () => {
        mockRegistry({}, "6.1.0");
        mockFs("6.0.0");

        await expect(createContainer(createParams({ version: "6.99.0" }))).rejects.toThrow(
            "process.exit called"
        );
    });

    it("exits when latest version cannot be fetched", async () => {
        vi.spyOn(global, "fetch").mockResolvedValue({
            ok: true,
            json: async () => ({ "dist-tags": {}, versions: {} })
        } as Response);
        mockFs("6.0.0");

        await expect(createContainer(createParams({ version: "latest" }))).rejects.toThrow(
            "process.exit called"
        );
    });

    it("exits when installed package.json cannot be loaded", async () => {
        mockRegistry({ "6.1.0": {} }, "6.1.0");
        (loadJsonFileSync as any).mockImplementation(() => {
            throw new Error("ENOENT");
        });
        (fs.existsSync as any).mockImplementation((p: string) => p.includes("yarn.lock"));

        await expect(createContainer(createParams())).rejects.toThrow("process.exit called");
    });

    it("exits when installed version is not valid semver", async () => {
        mockRegistry({ "6.1.0": {} }, "6.1.0");
        (loadJsonFileSync as any).mockReturnValue({ name: "webiny", version: "not-semver" });
        (fs.existsSync as any).mockImplementation((p: string) => p.includes("yarn.lock"));

        await expect(createContainer(createParams())).rejects.toThrow("process.exit called");
    });

    it("uses joinPath to build the installed package path", async () => {
        mockRegistry({ "6.1.0": {} }, "6.1.0");
        mockFs("6.0.0");

        await createContainer(createParams());

        expect(loadJsonFileSync).toHaveBeenCalledWith("/project/node_modules/webiny/package.json");
    });

    it("registers references.json read from the registry tarball", async () => {
        mockRegistry({ "6.1.0": {} }, "6.1.0");
        mockFs("6.0.0");

        const container = await createContainer(createParams());
        const references = container.resolve(ReferencesService);

        expect(references.getVersion("react")).toBe("19.3.1");
        expect(fetch).toHaveBeenCalledWith(
            "https://registry.npmjs.org/@webiny/dependency-versions"
        );
    });

    it("exits when no package in the registry has references.json for the version", async () => {
        mockRegistry({ "6.1.0": {} }, "6.1.0", null);
        mockFs("6.0.0");

        await expect(createContainer(createParams())).rejects.toThrow("process.exit called");
    });

    it("uses installVersion for registry validation and positional version for targetVersion", async () => {
        mockRegistry({ "0.0.0-unstable.abcde": {} }, "6.1.0");
        mockFs("6.0.0");

        const container = await createContainer(
            createParams({ version: "6.2.0", installVersion: "0.0.0-unstable.abcde" })
        );
        const ctx = container.resolve(Context);

        expect(ctx.targetVersion.format()).toBe("6.2.0");
    });

    it("exits when installVersion is set but positional version is not valid semver", async () => {
        mockRegistry({ "0.0.0-unstable.abcde": {} }, "6.1.0");
        mockFs("6.0.0");

        await expect(
            createContainer(
                createParams({ version: "not-semver", installVersion: "0.0.0-unstable.abcde" })
            )
        ).rejects.toThrow("process.exit called");
    });
});
