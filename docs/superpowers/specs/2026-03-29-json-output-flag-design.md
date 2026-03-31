# `--json` Output Flag — Design Spec

## Summary

Add a `--json` CLI flag that switches Logger output from pino-pretty (human-readable) to NDJSON (one JSON object per line on stdout). Opt-in — default behavior is unchanged. The Webiny upgrade command passes `--json` automatically and renders the output for the user.

## What Changes

### `src/utils/userInput.ts`
Add `--json` boolean option to yargs (default `false`). Add `json` to the zod schema and the `IGetUserInputResult` type.

### `src/base/Input/abstraction.ts` + `feature.ts`
Add `json: boolean` to `IInput` and `IInputParams`. Flow it through like `debug` already does.

### `src/service/Logger/JsonLogger.ts` (new file)
Implements `Logger.Interface`. Each method writes one line to stdout:

```ts
process.stdout.write(JSON.stringify({ type: "success", message }) + "\n")
```

Type mapping: `debug → "debug"`, `success → "success"`, `warning → "warning"`, `error → "error"`.

### `src/service/Logger/feature.ts`
`LoggerFeatureParams` gains `json: boolean`. When `json: true`, registers `JsonLogger`; otherwise registers `PinoLogger` as today.

### `src/container.ts`
Pass `json` from input params to `LoggerFeature.register(container, { debug, json })`.

## NDJSON Line Schema

```ts
{ type: "debug" | "success" | "warning" | "error", message: string }
```

No extra fields at this stage — extended when actual log call sites are wired up.

## What Does NOT Change

`Logger.Interface` is unchanged. All callers (`UpWebiny`, upgrade scripts, `DependencyGuard`, etc.) call `logger.success(...)` as normal — the flag only affects the Logger implementation.

## Usage

```bash
# default: pino-pretty output
npx ... 6.1.1

# JSON mode: NDJSON on stdout
npx ... 6.1.1 --json
```

## Testing

- `JsonLogger` unit tests: each method writes correct NDJSON line to stdout (mock `process.stdout.write`)
- `userInput` test: `--json` flag parsed correctly, defaults to `false`
- `LoggerFeature` test: registers `JsonLogger` when `json: true`, `PinoLogger` otherwise
