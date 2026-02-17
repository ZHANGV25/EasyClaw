import { NextResponse } from "next/server";

/**
 * Mock onboarding endpoint.
 * In production, the backend will handle user creation, container spin-up,
 * and writing SOUL.md / USER.md to S3.
 */
export async function POST(request: Request) {
  const body = await request.json();

  // Validate required fields
  const { name, timezone, interests, assistantName } = body;
  if (!name || !timezone || !interests || !assistantName) {
    return NextResponse.json(
      { error: "MISSING_FIELDS", message: "All fields are required." },
      { status: 400 }
    );
  }

  // Mock: simulate a short delay for container provisioning
  await new Promise((resolve) => setTimeout(resolve, 800));

  return NextResponse.json({
    success: true,
    containerId: "mock-container-" + Date.now(),
  });
}
