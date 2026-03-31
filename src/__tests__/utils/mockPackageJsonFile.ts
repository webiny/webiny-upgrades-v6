import { PackageJsonFile as PackageJsonFileAbstraction } from "../../service/PackageJson/abstraction.js";
import { PackageJsonFile } from "../../service/PackageJson/PackageJsonFile.js";

const initialData: Partial<PackageJsonFileAbstraction.Data> = {
    packageManager: "yarn@4.10.0",
    name: "my-app",
    version: "1.0.0",
    dependencies: {
        lodash: "4.17.21"
    },
    devDependencies: {
        jest: "27.0.0"
    },
    peerDependencies: {
        react: "17.0.0"
    },
    resolutions: {
        lodash: "4.17.21"
    }
};

export const createMockPackageJsonFile = (
    raw?: Partial<PackageJsonFileAbstraction.Data>
): PackageJsonFile => {
    return new PackageJsonFile({
        path: "/project/package.json",
        raw: raw || initialData
    });
};
