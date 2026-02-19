import { NextResponse } from "next/server";
import { BrowserStatus } from "@/types/browser";

export async function GET() {
  // Mock status - simulate active browsing
  const status: BrowserStatus = {
    active: true,
    currentUrl: "https://www.google.com/search?q=flights+to+tokyo",
    lastScreenshotAt: new Date().toISOString(),
  };

  return NextResponse.json(status);
}
