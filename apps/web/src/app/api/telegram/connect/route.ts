import { NextResponse } from "next/server";

export async function POST() {
  // Mock response with a deep link to the bot
  // In production, this would generate a unique token and store it in the DB
  return NextResponse.json({
    botUrl: "https://t.me/EasyClawBot?start=user_123_mock_token",
    connected: false, // Initial state
  });
}
