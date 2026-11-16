import { generateLicenseKey } from "@/lib/licenses";
import { db } from "@/lib/db";

export function generateBatchCodes(count: number): string[] {
  const codes = new Set<string>();
  while (codes.size < count) {
    codes.add(generateLicenseKey());
  }
  return [...codes];
}

export async function createKeys(
  count: number,
  durationDays: number | null
): Promise<{ code: string; durationDays: number | null }[]> {
  const codes = generateBatchCodes(count);
  await db.licenseKey.createMany({
    data: codes.map((code) => ({ code, durationDays })),
  });
  return codes.map((code) => ({ code, durationDays }));
}

export async function revokeKey(id: string): Promise<void> {
  await db.licenseKey.update({ where: { id }, data: { status: "REVOKED" } });
}
