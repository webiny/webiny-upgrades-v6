export class YarnrcGuardError extends Error {
    public constructor(missingSettings: string[]) {
        const list = missingSettings.map(s => `  - ${s}`).join("\n");
        super(
            `The following required .yarnrc.yml settings are missing:\n${list}\n` +
                `Please configure these settings before upgrading. ` +
                `See https://www.webiny.com/docs/infrastructure/yarnrc-security.md for details.`
        );
        this.name = "YarnrcGuardError";
    }
}
