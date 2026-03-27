import { VersionService as VersionServiceAbstraction } from "./abstraction.js";
import { NpmService } from "~/service/Npm/index.js";

class VersionServiceImpl implements VersionServiceAbstraction.Interface {
    public constructor(private readonly npmService: NpmService.Interface) {}
}

export const VersionService = VersionServiceAbstraction.createImplementation({
    implementation: VersionServiceImpl,
    dependencies: [NpmService]
});
