import { describe, it, expect } from "vitest";
import { HUMEURS, VARIANTES_PAR_HUMEUR, pickVariante, pickMessage } from "@/lib/humeurs";

describe("catalogue", () => {
  it("contient les 14 humeurs de la spec", () => {
    expect(HUMEURS).toHaveLength(14);
    expect(HUMEURS).toContain("fete");
    expect(HUMEURS).toContain("endormi");
  });

  it("chaque humeur a 3 ou 4 variantes et au moins 3 messages", () => {
    for (const h of HUMEURS) {
      expect(VARIANTES_PAR_HUMEUR[h]).toBeGreaterThanOrEqual(3);
      expect(VARIANTES_PAR_HUMEUR[h]).toBeLessThanOrEqual(4);
      expect(pickMessage(h, 0)).toBeTruthy();
    }
  });
});

describe("pickVariante", () => {
  it("est déterministe et reste dans les bornes", () => {
    expect(pickVariante("content", 42)).toBe(pickVariante("content", 42));
    for (let g = 0; g < 200; g++) {
      expect(pickVariante("content", g)).toBeGreaterThanOrEqual(0);
      expect(pickVariante("content", g)).toBeLessThan(VARIANTES_PAR_HUMEUR.content);
    }
  });
});
