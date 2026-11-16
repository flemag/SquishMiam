import { describe, it, expect } from "vitest";
import { generateBatchCodes } from "@/lib/keys-service";

describe("generateBatchCodes", () => {
  it("renvoie N codes uniques au bon format", () => {
    const codes = generateBatchCodes(25);
    expect(codes).toHaveLength(25);
    expect(new Set(codes).size).toBe(25);
    codes.forEach((c) => expect(c).toMatch(/^MIAMZ(-[23456789ABCDEFGHJKMNPQRSTVWXYZ]{4}){3}$/));
  });
});
