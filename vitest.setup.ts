// Pino's transport and vitest's own spies attach listeners to `process` during
// test setup. Across 30+ test files this exceeds the default 10 and triggers
// MaxListenersExceededWarning noise without any real leak.
process.setMaxListeners(50);
