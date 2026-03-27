import zod from "zod";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

const DEFAULT_REGISTRY = "https://registry.npmjs.org";

const schema = zod
    .object({
        _: zod
            .tuple([zod.string()])
            .transform(([version]) => {
                return version;
            })
            .optional()
            .default("latest"),
        cwd: zod.string().optional(),
        debug: zod.boolean(),
        registry: zod.url()
    })
    .transform(({ _, debug, registry, cwd }) => ({
        version: _,
        cwd,
        debug,
        registry
    }));

interface IGetUserInputParams {
    cwd: string;
}

interface IGetUserInputResult {
    version: string;
    debug: boolean;
    registry: string;
    cwd: string;
}

export const getUserInput = (params: IGetUserInputParams): IGetUserInputResult => {
    const input = yargs(hideBin(process.argv))
        .version(false)
        .positional("version", {
            type: "string",
            describe: "Target upgrade version.",
            default: "latest"
        })
        .option("cwd", {
            type: "string",
            describe: "Working directory"
        })
        .option("debug", {
            type: "boolean",
            default: false
        })
        .option("registry", {
            type: "string",
            default: DEFAULT_REGISTRY,
            describe: "npm registry URL"
        })
        .parseSync();

    const result = schema.safeParse(input);
    if (!result.success) {
        console.error("Invalid arguments:", zod.treeifyError(result.error));
        process.exit(1);
    }
    return {
        ...result.data,
        cwd: result.data.cwd || params.cwd
    };
};
