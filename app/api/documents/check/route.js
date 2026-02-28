import { searchBasedCheck } from "@/lib/sharepoint";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const { docUrls } = await request.json();

        if (!Array.isArray(docUrls) || docUrls.length === 0) {
            return NextResponse.json(
                { error: "docUrls array is required" },
                { status: 400 }
            );
        }

        if (docUrls.length > 15000) {
            return NextResponse.json(
                { error: "Maximum 15000 URLs per request" },
                { status: 400 }
            );
        }

        const results = await searchBasedCheck(docUrls);

        return NextResponse.json(results);
    } catch (error) {
        console.error("Document check error:", error);
        return NextResponse.json(
            { error: "Failed to check documents" },
            { status: 500 }
        );
    }
}
