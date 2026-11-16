import { auth } from "@/lib/auth";
import { routeGuard } from "@/lib/guards";
import { db } from "@/lib/db";
import { licenseStatus } from "@/lib/licenses";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export default auth(async (req) => {
  const pathname = new URL(req.url).pathname;
  const ctx = { hasSession: false, isAdmin: false, licenseOk: false };

  const userId = (req.auth?.user as { id?: string } | undefined)?.id;
  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        licenseKeys: { where: { status: "ACTIVE" }, select: { expiresAt: true } },
      },
    });
    if (user) {
      ctx.hasSession = true;
      ctx.isAdmin = user.role === "ADMIN";
      ctx.licenseOk =
        ctx.isAdmin ||
        user.licenseKeys.some(
          (k) => licenseStatus({ status: "ACTIVE", expiresAt: k.expiresAt }, new Date()) === "active"
        );
    }
  }

  const decision = routeGuard(pathname, ctx);
  if (!decision.allow && decision.redirectTo) {
    return NextResponse.redirect(new URL(decision.redirectTo, req.url));
  }
  return NextResponse.next();
});

export const config = {
  matcher: ["/plan/:path*", "/recettes/:path*", "/courses/:path*", "/admin/:path*", "/api/admin/:path*"],
};
