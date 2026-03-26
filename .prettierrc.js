export default {
    printWidth: 100,
    trailingComma: "none",
    tabWidth: 2,
    arrowParens: "avoid",
    endOfLine: "lf",
    useTabs: false,
    semi: true,
    singleQuote: false,
    jsxSingleQuote: false,
    bracketSpacing: true,
    bracketSameLine: false,
    proseWrap: "preserve",
    htmlWhitespaceSensitivity: "css",
    vueIndentScriptAndStyle: false,
    singleAttributePerLine: false,
    embeddedLanguageFormatting: "auto",
    quoteProps: "as-needed",
    experimentalTernaries: false,
    requirePragma: false,
    insertPragma: false,
    rangeStart: 0,
    rangeEnd: Infinity,
    plugins: [],
    overrides: [
        {
            files: ["*.js", "*.ts"],
            options: {
                tabWidth: 4
            }
        }
    ]
};
