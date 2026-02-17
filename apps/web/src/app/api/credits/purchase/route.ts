import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { amountUsd } = await req.json();

  if (!amountUsd || amountUsd <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // Mock returning a checkout URL (in reality, Stripe session)
  // We'll redirect to dashboard with a query param to simulate success
  return NextResponse.json({
    checkoutUrl: `/dashboard?payment=success&amount=${amountUsd}`,
  });
}
