import { createAbstraction } from "~/utils/createAbstraction.js";

interface IVersionService {}

export const VersionService = createAbstraction<IVersionService>("Service/VersionService");

export namespace VersionService {
    export type Interface = IVersionService;
}
