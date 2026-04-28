import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
    const store = await cookies();
    const username = store.get("auth_token")?.value || null;
    return NextResponse.json(
        { username },
        {
            headers: {
                "Cache-Control": "no-store, max-age=0, must-revalidate",
            },
        }
    );
}
