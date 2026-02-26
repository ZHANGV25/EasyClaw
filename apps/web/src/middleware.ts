import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isProtectedRoute = createRouteMatcher(["/chat(.*)", "/dashboard(.*)", "/onboarding(.*)"]);
const isMockApiRoute = createRouteMatcher(["/api(.*)"]);

const isExternalBackend = (process.env.NEXT_PUBLIC_API_URL ?? "").length > 0;

export default clerkMiddleware(async (auth, req) => {
  // In production (real backend configured), block mock API routes so the
  // frontend never accidentally hits local mock data.
  if (isExternalBackend && isMockApiRoute(req)) {
    return NextResponse.json(
      { error: "MOCK_DISABLED", message: "Mock API routes are disabled in production. Use NEXT_PUBLIC_API_URL." },
      { status: 404 }
    );
  }

  if (isProtectedRoute(req)) {
    const session = await auth();
    if (!session.userId) {
      return session.redirectToSignIn();
    }
  }
});

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/", "/(api|trpc)(.*)"],
};
