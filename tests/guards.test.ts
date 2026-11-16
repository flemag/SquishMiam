import { describe, it, expect } from "vitest";
import { routeGuard } from "@/lib/guards";

describe("routeGuard", () => {
  it("visiteur sans session → /connexion", () => {
    expect(routeGuard("/plan", { hasSession: false, isAdmin: false, licenseOk: false })).toEqual({
      allow: false,
      redirectTo: "/connexion",
    });
  });

  it("session sans clé active → /connexion?erreur=cle", () => {
    expect(routeGuard("/plan", { hasSession: true, isAdmin: false, licenseOk: false })).toEqual({
      allow: false,
      redirectTo: "/connexion?erreur=cle",
    });
  });

  it("session + clé active → autorisé", () => {
    expect(routeGuard("/plan", { hasSession: true, isAdmin: false, licenseOk: true }).allow).toBe(
      true
    );
  });

  it("non-admin sur /admin → /", () => {
    expect(routeGuard("/admin/cles", { hasSession: true, isAdmin: false, licenseOk: true })).toEqual(
      { allow: false, redirectTo: "/" }
    );
  });

  it("admin sur /admin → autorisé", () => {
    expect(routeGuard("/admin/cles", { hasSession: true, isAdmin: true, licenseOk: true }).allow).toBe(
      true
    );
  });
});
