import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
    const store = await cookies();
    const username = store.get("auth_token")?.value || null;
    return NextResponse.json({ username });
}
