import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Mock reject logic
  console.log(`Rejecting learning ${id}`);

  return NextResponse.json({ success: true, id, status: "rejected" });
}
