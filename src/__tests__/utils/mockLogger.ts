import { vi } from "vitest";
import type { Logger } from "../../base/Logger/abstraction.js";

export const createMockLogger = (): Logger.Interface => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    fatal: vi.fn(),
    done: vi.fn()
});
