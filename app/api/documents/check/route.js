import { batchCheckFiles } from "@/lib/sharepoint";
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

        // Limit batch size to prevent timeout
        if (docUrls.length > 100) {
            return NextResponse.json(
                { error: "Maximum 100 URLs per batch" },
                { status: 400 }
            );
        }

        const results = await batchCheckFiles(docUrls);

        return NextResponse.json(results);
    } catch (error) {
        console.error("Document check error:", error);
        return NextResponse.json(
            { error: "Failed to check documents" },
            { status: 500 }
        );
    }
}
