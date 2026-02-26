import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Mock confirm logic
  console.log(`Confirming learning ${id}`);

  return NextResponse.json({ success: true, id, status: "confirmed" });
}
