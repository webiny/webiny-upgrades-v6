import { describe, it, expect } from "vitest";
import { Version } from "./Version.js";
import { InvalidSemverError } from "./InvalidSemverError.js";

const v = (version: string) => Version.create(version).toSemVer();

describe("Version", () => {
    describe("create", () => {
        it("accepts a plain version string", () => {
            expect(() => Version.create("6.1.0")).not.toThrow();
        });

        it("accepts a SemVer object", () => {
            expect(() => Version.create(v("6.1.0"))).not.toThrow();
        });

        it("throws InvalidSemverError on invalid version string", () => {
            expect(() => Version.create("not-a-version")).toThrow(InvalidSemverError);
        });

        it("attaches the bad input to the thrown error", () => {
            try {
                Version.create("not-a-version");
                expect.unreachable();
            } catch (err) {
                expect(err).toBeInstanceOf(InvalidSemverError);
                expect((err as InvalidSemverError).input).toBe("not-a-version");
            }
        });
    });

    describe("parse", () => {
        it("returns a Version for a valid string", () => {
            expect(Version.parse("6.1.0")).toBeInstanceOf(Version);
        });

        it("returns null for an invalid string", () => {
            expect(Version.parse("not-a-version")).toBeNull();
        });

        it("trims whitespace before parsing", () => {
            expect(Version.parse("  6.1.0  ")).toBeInstanceOf(Version);
        });
    });

    describe("raw", () => {
        it("returns the trimmed input string", () => {
            expect(Version.create("  6.1.0  ").raw).toBe("6.1.0");
        });

        it("preserves prerelease tags", () => {
            expect(Version.create("6.1.0-local-npm-ts.0").raw).toBe("6.1.0-local-npm-ts.0");
        });

        it("returns SemVer.raw when constructed from a SemVer", () => {
            expect(Version.create(v("6.1.0")).raw).toBe("6.1.0");
        });

        it("returns SemVer.raw with prerelease when constructed from a SemVer", () => {
            expect(Version.create(v("6.1.0-alpha.1")).raw).toBe("6.1.0-alpha.1");
        });
    });

    describe("gt", () => {
        it("returns true when this is greater than other", () => {
            expect(Version.create("6.1.0").gt(Version.create("6.0.0"))).toBe(true);
        });

        it("returns false when equal", () => {
            expect(Version.create("6.1.0").gt(Version.create("6.1.0"))).toBe(false);
        });

        it("returns false when less than other", () => {
            expect(Version.create("6.0.0").gt(Version.create("6.1.0"))).toBe(false);
        });

        it("accepts a SemVer as argument", () => {
            expect(Version.create("6.1.0").gt(v("6.0.0"))).toBe(true);
        });

        it("treats pre-release as its base version", () => {
            expect(Version.create("6.1.0").gt(Version.create("6.1.0-beta.0"))).toBe(false);
            expect(Version.create("6.0.0").gt(Version.create("6.1.0-beta.0"))).toBe(false);
            expect(Version.create("6.2.0").gt(Version.create("6.1.0-beta.0"))).toBe(true);
        });
    });

    describe("gte", () => {
        it("returns true when greater", () => {
            expect(Version.create("6.1.0").gte(Version.create("6.0.0"))).toBe(true);
        });

        it("returns true when equal", () => {
            expect(Version.create("6.1.0").gte(Version.create("6.1.0"))).toBe(true);
        });

        it("returns false when less", () => {
            expect(Version.create("6.0.0").gte(Version.create("6.1.0"))).toBe(false);
        });

        it("treats pre-release as its base version", () => {
            expect(Version.create("6.1.0").gte(Version.create("6.1.0-beta.0"))).toBe(true);
            expect(Version.create("6.0.0").gte(Version.create("6.1.0-beta.0"))).toBe(false);
        });
    });

    describe("lt", () => {
        it("returns true when less than other", () => {
            expect(Version.create("6.0.0").lt(Version.create("6.1.0"))).toBe(true);
        });

        it("returns false when equal", () => {
            expect(Version.create("6.1.0").lt(Version.create("6.1.0"))).toBe(false);
        });

        it("returns false when greater", () => {
            expect(Version.create("6.1.0").lt(Version.create("6.0.0"))).toBe(false);
        });

        it("treats pre-release as its base version", () => {
            expect(Version.create("6.1.0").lt(Version.create("6.1.0-beta.0"))).toBe(false);
            expect(Version.create("6.0.0").lt(Version.create("6.1.0-beta.0"))).toBe(true);
        });
    });

    describe("lte", () => {
        it("returns true when less", () => {
            expect(Version.create("6.0.0").lte(Version.create("6.1.0"))).toBe(true);
        });

        it("returns true when equal", () => {
            expect(Version.create("6.1.0").lte(Version.create("6.1.0"))).toBe(true);
        });

        it("returns false when greater", () => {
            expect(Version.create("6.1.0").lte(Version.create("6.0.0"))).toBe(false);
        });

        it("treats pre-release as its base version", () => {
            expect(Version.create("6.1.0").lte(Version.create("6.1.0-beta.0"))).toBe(true);
            expect(Version.create("6.2.0").lte(Version.create("6.1.0-beta.0"))).toBe(false);
        });
    });

    describe("equal", () => {
        it("returns true when equal", () => {
            expect(Version.create("6.1.0").equal(Version.create("6.1.0"))).toBe(true);
        });

        it("returns false when not equal", () => {
            expect(Version.create("6.1.0").equal(Version.create("6.0.0"))).toBe(false);
        });

        it("accepts a SemVer as argument", () => {
            expect(Version.create("6.1.0").equal(v("6.1.0"))).toBe(true);
        });

        it("treats pre-release as its base version", () => {
            expect(Version.create("6.1.0").equal(Version.create("6.1.0-beta.0"))).toBe(true);
            expect(Version.create("6.1.0-beta.0").equal(Version.create("6.1.0-rc.1"))).toBe(true);
            expect(Version.create("6.1.0-beta.0").equal(Version.create("6.0.0"))).toBe(false);
        });
    });

    describe("between", () => {
        it("returns true when strictly inside the range", () => {
            expect(
                Version.create("6.1.0").between(Version.create("6.0.0"), Version.create("6.2.0"))
            ).toBe(true);
        });

        it("returns true when equal to upper bound (inclusive)", () => {
            expect(
                Version.create("6.1.0").between(Version.create("6.0.0"), Version.create("6.1.0"))
            ).toBe(true);
        });

        it("returns false when equal to lower bound (exclusive)", () => {
            expect(
                Version.create("6.1.0").between(Version.create("6.1.0"), Version.create("6.2.0"))
            ).toBe(false);
        });

        it("returns false when below the range", () => {
            expect(
                Version.create("5.9.0").between(Version.create("6.0.0"), Version.create("6.1.0"))
            ).toBe(false);
        });

        it("returns false when above the range", () => {
            expect(
                Version.create("6.2.0").between(Version.create("6.0.0"), Version.create("6.1.0"))
            ).toBe(false);
        });

        it("accepts SemVer arguments", () => {
            expect(Version.create("6.1.0").between(v("6.0.0"), v("6.2.0"))).toBe(true);
        });

        it("returns true when upper bound is a pre-release of this version", () => {
            expect(
                Version.create("6.1.0").between(
                    Version.create("6.0.0"),
                    Version.create("6.1.0-beta.0")
                )
            ).toBe(true);
        });

        it("returns true when upper bound is any pre-release tag of this version", () => {
            expect(
                Version.create("6.1.0").between(
                    Version.create("6.0.0"),
                    Version.create("6.1.0-unstable.0")
                )
            ).toBe(true);
            expect(
                Version.create("6.1.0").between(
                    Version.create("6.0.0"),
                    Version.create("6.1.0-alpha.1")
                )
            ).toBe(true);
        });

        it("returns false when upper bound pre-release is for a lower version", () => {
            expect(
                Version.create("6.1.0").between(
                    Version.create("6.0.0"),
                    Version.create("6.0.9-beta.0")
                )
            ).toBe(false);
        });

        it("returns true when lower bound is a pre-release of this version (raw: release > pre-release)", () => {
            expect(
                Version.create("6.1.0").between(
                    Version.create("6.1.0-beta.0"),
                    Version.create("6.2.0")
                )
            ).toBe(true);
        });

        it("returns true when lower bound is any pre-release tag of this version", () => {
            expect(
                Version.create("6.1.0").between(
                    Version.create("6.1.0-unstable.0"),
                    Version.create("6.2.0")
                )
            ).toBe(true);
            expect(
                Version.create("6.1.0").between(
                    Version.create("6.1.0-local-npm.11"),
                    Version.create("6.2.0")
                )
            ).toBe(true);
        });

        it("returns true when both bounds are pre-releases of this version", () => {
            expect(
                Version.create("6.1.0").between(
                    Version.create("6.1.0-local-npm.11"),
                    Version.create("6.1.0-beta.0")
                )
            ).toBe(true);
        });
    });

    describe("format", () => {
        it("returns the formatted version string", () => {
            expect(Version.create("6.1.0").format()).toBe("6.1.0");
        });

        it("includes prerelease in formatted output", () => {
            expect(Version.create("6.1.0-alpha.1").format()).toBe("6.1.0-alpha.1");
        });
    });

    describe("toSemVer", () => {
        it("returns a SemVer equivalent to the input", () => {
            expect(Version.create("6.1.0").toSemVer()).toEqual(v("6.1.0"));
        });
    });
});
