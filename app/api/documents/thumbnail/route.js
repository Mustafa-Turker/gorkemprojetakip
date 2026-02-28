import { getThumbnails } from "@/lib/sharepoint";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const itemId = searchParams.get("itemId");

        if (!itemId) {
            return NextResponse.json(
                { error: "itemId parameter is required" },
                { status: 400 }
            );
        }

        const thumbnails = await getThumbnails(itemId);

        if (!thumbnails) {
            return NextResponse.json(
                { error: "No thumbnails available" },
                { status: 404 }
            );
        }

        return NextResponse.json(thumbnails);
    } catch (error) {
        console.error("Thumbnail fetch error:", error);
        return NextResponse.json(
            { error: "Failed to fetch thumbnails" },
            { status: 500 }
        );
    }
}
