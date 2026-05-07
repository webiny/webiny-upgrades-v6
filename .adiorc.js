export default {
  ignore: {
    src: ["~tests", "~"],
    dependencies: ["typescript", "pino-pretty"],
    devDependencies: [
      "@types/node",
      "@types/semver",
      "@types/yargs",
      "@vitest/coverage-v8",
      "adio",
      "oxfmt",
      "prettier"
    ],
    peerDependencies: true
  },
  ignoreDirs: ["node_modules/", "dist/", "build/", "nextjs/"],
  packages: ["./"]
};
