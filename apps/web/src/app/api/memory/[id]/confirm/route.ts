import { NextResponse } from "next/server";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  // Mock confirm logic
  console.log(`Confirming learning ${id}`);

  return NextResponse.json({ success: true, id, status: "confirmed" });
}
