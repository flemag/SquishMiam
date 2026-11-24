import { describe, it, expect } from "vitest";
import { getWeekDates, prochainsJours, weekStart } from "@/lib/plan";

describe("getWeekDates", () => {
  it("renvoie lundi → dimanche quel que soit le jour fourni", () => {
    const week = getWeekDates(new Date("2026-11-18T15:00:00Z")); // mercredi
    expect(week).toHaveLength(7);
    expect(week[0].getUTCDay()).toBe(1); // lundi
    expect(week[6].getUTCDay()).toBe(0); // dimanche
    expect(week[0].toISOString().slice(0, 10)).toBe("2026-11-16");
    expect(week[6].toISOString().slice(0, 10)).toBe("2026-11-22");
  });

  it("gère le passage d'année", () => {
    const week = getWeekDates(new Date("2027-01-01T00:00:00Z")); // vendredi
    expect(week[0].toISOString().slice(0, 10)).toBe("2026-12-28");
    expect(week[6].toISOString().slice(0, 10)).toBe("2027-01-03");
  });
});

describe("weekStart", () => {
  it("renvoie le lundi 00:00 de la semaine", () => {
    expect(weekStart(new Date("2026-11-18T15:00:00Z")).toISOString().slice(0, 10)).toBe("2026-11-16");
  });
});

describe("prochainsJours", () => {
  it("part du jour fourni et avance de 7 jours", () => {
    const jours = prochainsJours(new Date("2026-11-24T22:30:00Z"));
    expect(jours).toHaveLength(7);
    expect(jours[0].toISOString().slice(0, 10)).toBe("2026-11-24");
    expect(jours[6].toISOString().slice(0, 10)).toBe("2026-11-30");
  });

  it("gère le passage de mois et respecte le nombre demandé", () => {
    const jours = prochainsJours(new Date("2026-12-30T08:00:00Z"), 4);
    expect(jours.map((d) => d.toISOString().slice(0, 10))).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });
});
