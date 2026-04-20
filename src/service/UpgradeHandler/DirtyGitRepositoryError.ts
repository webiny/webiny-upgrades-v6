export class DirtyGitRepositoryError extends Error {
    public readonly name = "DirtyGitRepositoryError";

    public constructor() {
        super(
            "Git repository has uncommitted changes. Please commit or stash them before upgrading."
        );
    }
}
