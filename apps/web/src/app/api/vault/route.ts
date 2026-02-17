import { NextResponse } from "next/server";

// Mock in-memory store for secrets (reset on restart)
let secrets = [
  { id: "s_1", key: "NOTION_API_KEY", createdAt: new Date().toISOString() },
  { id: "s_2", key: "OPENAI_API_KEY", createdAt: new Date().toISOString() },
];

export async function GET() {
  return NextResponse.json({ secrets });
}

export async function POST(req: Request) {
  const { key, value } = await req.json();
  
  if (!key || !value) {
    return NextResponse.json({ error: "Missing key or value" }, { status: 400 });
  }

  const newSecret = {
    id: `s_${Date.now()}`,
    key,
    createdAt: new Date().toISOString(),
  };
  
  secrets.push(newSecret);
  
  return NextResponse.json({ success: true, secret: newSecret });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  secrets = secrets.filter((s) => s.id !== id);
  
  return NextResponse.json({ success: true });
}
