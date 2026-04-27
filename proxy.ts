import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtectedRoute = createRouteMatcher([
  "/dashboard(.*)",
  "/tasks(.*)",
  "/habits(.*)",
  "/journal(.*)",
  "/timer(.*)",
  "/goals(.*)",
  "/analytics(.*)",
  "/integrations(.*)",
  "/settings(.*)",
  "/help(.*)",
]);

// Home is a static marketing page for unauthenticated visitors. Anyone
// already logged in skips it and goes straight to the dashboard. Doing this
// in middleware lets app/page.tsx be force-static (CDN-served HTML) without
// losing the redirect for return visits.
const isHomeRoute = createRouteMatcher(["/"]);

export default clerkMiddleware(async (auth, req) => {
  if (isProtectedRoute(req)) {
    await auth.protect();
    return;
  }
  if (isHomeRoute(req)) {
    const { userId } = await auth();
    if (userId) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
