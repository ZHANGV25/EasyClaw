import { NextResponse } from "next/server";

export async function GET() {
  // Mock daily usage data for the last 7 days
  const today = new Date();
  const data = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - i));
    
    // Random usage data
    const cost = Math.random() * 0.5; // $0.00 - $0.50
    const messages = Math.floor(Math.random() * 20);
    
    return {
      date: date.toISOString().split("T")[0], // YYYY-MM-DD
      costUsd: parseFloat(cost.toFixed(2)),
      messages,
      tokensIn: messages * 50,
      tokensOut: messages * 150,
    };
  });

  return NextResponse.json({
    period: "7d",
    totalCost: data.reduce((acc, d) => acc + d.costUsd, 0),
    daily: data,
  });
}
