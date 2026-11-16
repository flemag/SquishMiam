import { randomBytes } from "node:crypto";

/**
 * Alphabet Crockford : pas de 0/1/O/I/L (codes de clés dicibles sans ambiguïté).
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export function generateLicenseKey(): string {
  const bytes = randomBytes(12);
  let code = "MIAMZ";
  for (let i = 0; i < 12; i++) {
    if (i % 4 === 0) code += "-";
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return code;
}

export function activationExpiry(
  activatedAt: Date,
  durationDays: number | null
): Date | null {
  if (durationDays === null) return null;
  return new Date(activatedAt.getTime() + durationDays * 24 * 60 * 60 * 1000);
}

export type LicenseKeyCore = {
  status: "UNUSED" | "ACTIVE" | "REVOKED";
  expiresAt: Date | null;
};

export type LicenseStatusValue = "inutilisee" | "active" | "expiree" | "revoquee";

export function licenseStatus(key: LicenseKeyCore, now: Date): LicenseStatusValue {
  if (key.status === "REVOKED") return "revoquee";
  if (key.status === "UNUSED") return "inutilisee";
  if (key.expiresAt && key.expiresAt <= now) return "expiree";
  return "active";
}
