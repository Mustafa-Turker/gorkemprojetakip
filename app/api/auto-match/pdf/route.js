import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/sharepoint";

async function getEnv() {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    return env;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const year = searchParams.get("year");
        const month = searchParams.get("month");
        const day = searchParams.get("day");

        if (!year || !month || !day) {
            return NextResponse.json({ error: "year, month, day required" }, { status: 400 });
        }

        const mm = String(month).padStart(2, "0");
        const path = `SUBELER/GRJV/COMMON/06.ACCOUNTING/02.REPORTS/${year} Attachments/${mm}-${year}/${day}.pdf`;

        const token = await getAccessToken();
        const env = await getEnv();
        const driveId = env.SP_DRIVE_ID;

        const url = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root:/${encodeURI(path)}:/content`;
        const resp = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
            redirect: "follow",
        });

        if (!resp.ok) {
            if (resp.status === 404) {
                return NextResponse.json({ error: `PDF not found: ${path}` }, { status: 404 });
            }
            return NextResponse.json({ error: `Download failed (${resp.status})` }, { status: resp.status });
        }

        const buffer = await resp.arrayBuffer();
        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${day}.pdf"`,
            },
        });
    } catch (error) {
        console.error("PDF download error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
