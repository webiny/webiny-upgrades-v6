export class PackageManagerDetectionError extends Error {
    public readonly name = "PackageManagerDetectionError";

    public constructor(public readonly cwd: string) {
        super(
            `Could not detect package manager in "${cwd}". No yarn.lock, pnpm-lock.yaml, or package-lock.json found. Use --package-manager to specify one.`
        );
    }
}
