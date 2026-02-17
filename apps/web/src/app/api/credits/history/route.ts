import { NextResponse } from "next/server";

export async function GET() {
  // Mock transaction history
  return NextResponse.json({
    transactions: [
      {
        id: "tx_1",
        type: "USAGE",
        amount: -0.12,
        description: "Chat session (Claude 3.5 Sonnet)",
        createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
      },
      {
        id: "tx_2",
        type: "USAGE",
        amount: -0.05,
        description: "Background research task",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
      },
      {
        id: "tx_3",
        type: "PURCHASE",
        amount: 10.00,
        description: "Credit Top-up",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), // 2 days ago
      },
      {
        id: "tx_4",
        type: "FREE_TIER",
        amount: 1.00,
        description: "Welcome Credits",
        createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), // 5 days ago
      },
    ],
  });
}
