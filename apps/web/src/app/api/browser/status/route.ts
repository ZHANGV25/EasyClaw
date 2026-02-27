import { NextResponse } from "next/server";
import { BrowserStatus } from "@/types/browser";

export async function GET() {
  // Mock status - no active job in local dev
  const status: BrowserStatus = {
    active: false,
  };

  return NextResponse.json(status);
}
