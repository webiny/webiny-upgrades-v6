import chalk from "chalk";

export interface Log {
    setDebug: (value: boolean) => void;
    debug: (message: string, ...args: unknown[]) => void;
    info: (message: string, ...args: unknown[]) => void;
    success: (message: string, ...args: unknown[]) => void;
    warning: (message: string, ...args: unknown[]) => void;
    error: (message: string, ...args: unknown[]) => void;
}

const format = (message: string, args: unknown[]): string => {
    return args.reduce<string>((acc, arg) => acc.replace("%s", String(arg)), message);
};

let debugEnabled = false;

const log: Log = {
    setDebug(value) {
        debugEnabled = value;
    },
    debug(message, ...args) {
        if (!debugEnabled) {
            return;
        }
        console.log(chalk.gray(`[debug] ${format(message, args)}`));
    },
    info(message, ...args) {
        console.log(chalk.cyan(format(message, args)));
    },
    success(message, ...args) {
        console.log(chalk.green(format(message, args)));
    },
    warning(message, ...args) {
        console.log(chalk.yellow(format(message, args)));
    },
    error(message, ...args) {
        console.log(chalk.red(format(message, args)));
    }
};

export default log;
