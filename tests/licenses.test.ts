import { describe, it, expect } from "vitest";
import { generateLicenseKey, activationExpiry, licenseStatus } from "@/lib/licenses";

describe("generateLicenseKey", () => {
  it("respecte le format MIAMZ-XXXX-XXXX-XXXX sans caractères ambigus", () => {
    for (let i = 0; i < 50; i++) {
      const k = generateLicenseKey();
      expect(k).toMatch(/^MIAMZ(-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}){3}$/);
    }
  });
});

describe("activationExpiry", () => {
  it("renvoie null pour une durée illimitée", () => {
    expect(activationExpiry(new Date("2026-11-16T00:00:00Z"), null)).toBeNull();
  });

  it("ajoute durationDays à la date d'activation", () => {
    expect(activationExpiry(new Date("2026-11-16T00:00:00Z"), 30)).toEqual(
      new Date("2026-12-16T00:00:00Z")
    );
  });
});

describe("licenseStatus", () => {
  const now = new Date("2026-11-16T12:00:00Z");

  it("clé révoquée → revoquee", () => {
    expect(licenseStatus({ status: "REVOKED", expiresAt: null }, now)).toBe("revoquee");
  });

  it("clé jamais activée → inutilisee", () => {
    expect(licenseStatus({ status: "UNUSED", expiresAt: null }, now)).toBe("inutilisee");
  });

  it("clé active non expirée → active", () => {
    expect(
      licenseStatus({ status: "ACTIVE", expiresAt: new Date("2026-11-17T00:00:00Z") }, now)
    ).toBe("active");
  });

  it("clé active expirée exactement à now → expiree (frontière incluse)", () => {
    expect(licenseStatus({ status: "ACTIVE", expiresAt: now }, now)).toBe("expiree");
  });
});
