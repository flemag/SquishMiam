import { describe, it, expect } from "vitest";
import { regardVers } from "@/lib/regard";

const boite = { x: 100, y: 100, largeur: 80, hauteur: 80 }; // centre (140, 140)

describe("regardVers", () => {
  it("regarde vers le curseur et sature à porteeMax", () => {
    const droite = regardVers(1000, 140, boite);
    expect(droite.dx).toBe(3);
    expect(droite.dy).toBe(0);

    const coin = regardVers(5000, 5000, boite);
    expect(Math.abs(coin.dx)).toBeLessThanOrEqual(3);
    expect(Math.abs(coin.dy)).toBeLessThanOrEqual(3);
    expect(coin.dx).toBeGreaterThan(0);
    expect(coin.dy).toBeGreaterThan(0);
  });

  it("ne regarde nulle part si le curseur est au centre", () => {
    const centre = regardVers(140, 140, boite);
    expect(centre.dx).toBe(0);
    expect(centre.dy).toBe(0);
  });

  it("porteeMax personnalisée", () => {
    const loin = regardVers(5000, 140, boite, 6);
    expect(loin.dx).toBe(6);
  });
});
