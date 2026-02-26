import { NextResponse } from "next/server";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { fact } = body;

  // Mock update logic
  // In a real app, this would update the database
  console.log(`Updating fact ${id} to: ${fact}`);

  return NextResponse.json({ success: true, id, fact });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Mock delete logic
  console.log(`Deleting fact ${id}`);

  return NextResponse.json({ success: true, id });
}
