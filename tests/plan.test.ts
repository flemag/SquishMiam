import { describe, it, expect } from "vitest";
import { getWeekDates, weekStart } from "@/lib/plan";

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
