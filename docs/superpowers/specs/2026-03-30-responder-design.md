# Responder — Design Spec

## Summary

Replace the hardcoded `respond` function and `process.exit` calls in `Application.ts` with an injectable `Responder` abstraction. Adds a `done` method to `Logger` for the terminal signal. Makes `Application` fully testable and gives the webiny CLI a clean, typed termination line on stdout.

## Logger changes

Add `done(message: string): void` to `Logger.Interface`.

- **`JsonLogger`**: writes `{"type":"done","message":"..."}` to stdout — distinct `type` value the webiny CLI listens for as the termination signal
- **`PinoLogger`**: delegates to `success` level (pretty output, no structural change)

## Responder abstraction

New abstraction at `src/base/Responder/` (four-file pattern).

```ts
interface IResponder {
    success(duration: number): never;
    error(message: string, duration: number, error?: Error): never;
}
```

`never` return type — both methods always terminate the process (or throw in tests).

### `ProcessResponder` (real implementation)

Injects `Logger`. On `success`: calls `logger.done(...)` then `process.exit(0)`. On `error`: calls `logger.error(...)` then `logger.done(...)` then `process.exit(1)`.

### `MockResponder` (for tests)

Records last call (`{ type, duration, message?, error? }`), throws a `ResponderCalledError` instead of exiting — lets `Application` tests assert on outcome without the process dying.

## Application changes

- Inject `Responder` alongside `UpgradeRunner` and `Logger`
- Remove `respond` private function and all `process.exit` calls
- Call `this.responder.success(duration)` / `this.responder.error(ex.message, duration, ex)` in place of `respond({...})`

## Naming convention

All implementation files follow:
- Import abstraction as `<Name>Abstraction`
- Class: `class <Name>Impl implements <Name>Abstraction.Interface`
- Export: `export const <Name> = <Name>Abstraction.createImplementation({ implementation: <Name>Impl, ... })`

## Testing

- `JsonLogger.done` writes correct NDJSON line
- `PinoLogger.done` delegates to success (no crash)
- `ProcessResponder.success` calls `logger.done` and exits 0
- `ProcessResponder.error` calls `logger.error`, `logger.done`, exits 1
- `Application.execute` — success path: `responder.success` called with correct duration
- `Application.execute` — error path: `responder.error` called with error message
