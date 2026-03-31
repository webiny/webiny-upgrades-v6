import semver, { type SemVer } from "semver";

export class Version {
    public readonly raw: string;
    private readonly _semver: SemVer;

    /**
     * Creates a Version, throwing on invalid input.
     * Use when the input is known to be valid (hardcoded strings, trusted sources).
     */
    public static create(version: string | SemVer): Version {
        return new Version(version);
    }

    /**
     * Parses a version string, returning null if invalid.
     * Use at system boundaries (user input, registry responses, file reads).
     */
    public static parse(version: string): Version | null {
        const parsed = semver.parse(version.trim());
        if (!parsed) {
            return null;
        }
        return new Version(parsed);
    }

    private constructor(version: string | SemVer) {
        if (typeof version === "string") {
            this.raw = version.trim();
            const parsed = semver.parse(this.raw);
            if (!parsed) {
                throw new Error(`Invalid semver version: "${version.trim()}"`);
            }
            this._semver = parsed;
        } else {
            this.raw = version.raw;
            this._semver = version;
        }
    }

    private unwrap(other: Version | SemVer): SemVer {
        return other instanceof Version ? other._semver : other;
    }

    /**
     * Strips pre-release and build metadata from a version, returning a plain
     * major.minor.patch SemVer. All comparison methods use this so that suffixes
     * like -beta.0, -alpha.1, -unstable.0, -local-npm.11, … are ignored when
     * deciding version order.
     */
    private release(v: Version | SemVer): SemVer {
        const s = this.unwrap(v);
        return new semver.SemVer(`${s.major}.${s.minor}.${s.patch}`);
    }

    public gt(other: Version | SemVer): boolean {
        return semver.gt(this.release(this._semver), this.release(other));
    }

    public gte(other: Version | SemVer): boolean {
        return semver.gte(this.release(this._semver), this.release(other));
    }

    public lt(other: Version | SemVer): boolean {
        return semver.lt(this.release(this._semver), this.release(other));
    }

    public lte(other: Version | SemVer): boolean {
        return semver.lte(this.release(this._semver), this.release(other));
    }

    public equal(other: Version | SemVer): boolean {
        return semver.eq(this.release(this._semver), this.release(other));
    }

    /**
     * Returns true when this version falls in the range (lower, upper].
     * Lower bound uses raw semver so that pre-release < release
     * (e.g. 6.1.0 > 6.1.0-local-npm.11 is true).
     * Upper bound is normalised to major.minor.patch so that a target of
     * 6.1.0-beta.0 is treated as 6.1.0.
     * Used in canHandle: between(currentVersion, targetVersion).
     */
    public between(lower: Version | SemVer, upper: Version | SemVer): boolean {
        return (
            semver.gt(this._semver, this.unwrap(lower)) &&
            semver.lte(this._semver, this.release(upper))
        );
    }

    /**
     * Returns -1, 0, or 1. Suitable for use in Array.sort comparators.
     * Compares raw semver values including pre-release for precise ordering.
     */
    public compareTo(other: Version | SemVer): number {
        return semver.compare(this._semver, this.unwrap(other));
    }

    public format(): string {
        return this._semver.format();
    }

    public toSemVer(): SemVer {
        return this._semver;
    }
}
