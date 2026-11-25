import { Upgrade as UpgradeAbstraction } from "../../base/Upgrade/index.js";
import { PackageJsonTool } from "../../tool/PackageJsonTool/index.js";
import { WebinyConfigTool } from "../../tool/WebinyConfigTool/index.js";
import { Version } from "../../base/Version/index.js";
import { Logger } from "../../base/Logger/index.js";

class UpgradeImpl implements UpgradeAbstraction.Interface {
    public readonly version = Version.create("6.6.0");

    public constructor(
        private readonly packageJsonTool: PackageJsonTool.Interface,
        private readonly webinyConfigTool: WebinyConfigTool.Interface,
        private readonly logger: Logger.Interface
    ) {}

    public async canHandle({
        targetVersion,
        currentVersion
    }: UpgradeAbstraction.Params): Promise<boolean> {
        return this.version.between(currentVersion, targetVersion);
    }

    public async execute(): Promise<void> {
        // From 6.6.0, `@webiny/cli` is `@webiny/cli-aws`, and `webiny` has two optional peers that
        // an AWS project has to install itself: `@webiny/project-aws` (behind `webiny/infra`) and
        // `@webiny/db-dynamodb` (behind `webiny/api/db`). Every project older than 6.6.0 is an AWS
        // project with `@webiny/cli`. UpWebiny pins all three to the target version afterwards.
        const packageJson = this.packageJsonTool.loadOrThrow();
        if (
            packageJson.getDependency("@webiny/cli") ||
            packageJson.getDevDependency("@webiny/cli")
        ) {
            packageJson.removeDependency("@webiny/cli");
            packageJson.removeDevDependency("@webiny/cli");
            packageJson.setDependency("@webiny/cli-aws", this.version);
            packageJson.setDependency("@webiny/project-aws", this.version);
            packageJson.setDependency("@webiny/db-dynamodb", this.version);
            this.packageJsonTool.save(packageJson);
        }

        // From 6.6.0, production environments get DynamoDB point-in-time recovery and S3 bucket
        // versioning by default. Existing projects opt out so the next deploy leaves their
        // infrastructure as it is.
        const webinyConfig = this.webinyConfigTool.read();
        webinyConfig.jsx.addChild("Infra.Core.DynamoDb.Pitr", {
            comment:
                "DynamoDB point-in-time recovery and S3 bucket versioning are on by default for production environments. Remove these two lines to enable them.",
            props: { enabled: "false" }
        });
        webinyConfig.jsx.addChild("Infra.Core.S3Bucket.Versioning", {
            props: { enabled: "false" }
        });

        // From 6.6.0, SMTP is no longer built in: a project sends mail through the transport it
        // renders. Projects that set SMTP in code already render `<Api.Mailer.Smtp ... />`, which
        // now also mounts the transport. The rest get it without props, so the settings stored in
        // Settings > Mailer are used as before.
        if (!webinyConfig.jsx.contains("Api.Mailer.Smtp")) {
            webinyConfig.jsx.addChild("Api.Mailer.Smtp", {
                comment:
                    "SMTP mail, set in Settings > Mailer. To use Resend, SendGrid or SES, install that extension and remove this."
            });
            if (webinyConfig.jsx.contains("Api.Mailer.Smtp")) {
                webinyConfig.imports.add({ package: "webiny/extensions", imports: ["Api"] });
            } else {
                this.logger.warn(
                    'Could not add <Api.Mailer.Smtp /> to webiny.config.tsx. Without it, the project sends no mail. Add `import { Api } from "webiny/extensions";` and render <Api.Mailer.Smtp /> in the Extensions component.'
                );
            }
        }
        this.webinyConfigTool.save(webinyConfig);
    }
}

export const Upgrade = UpgradeAbstraction.createImplementation({
    implementation: UpgradeImpl,
    dependencies: [PackageJsonTool, WebinyConfigTool, Logger]
});
