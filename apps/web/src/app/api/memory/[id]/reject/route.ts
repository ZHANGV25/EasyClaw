import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Mock reject logic
  console.log(`Rejecting learning ${id}`);

  return NextResponse.json({ success: true, id, status: "rejected" });
}
