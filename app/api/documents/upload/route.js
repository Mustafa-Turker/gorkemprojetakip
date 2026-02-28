import { uploadFile } from "@/lib/sharepoint";
import { NextResponse } from "next/server";

export async function POST(request) {
    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const docUrl = formData.get("docUrl");

        if (!file || !docUrl) {
            return NextResponse.json(
                { error: "file and docUrl are required" },
                { status: 400 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = new Uint8Array(arrayBuffer);

        const result = await uploadFile(
            docUrl,
            buffer,
            file.type || "application/pdf"
        );

        return NextResponse.json({
            success: true,
            name: result.name,
            size: result.size,
            webUrl: result.webUrl,
        });
    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: error.message || "Upload failed" },
            { status: 500 }
        );
    }
}
