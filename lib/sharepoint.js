let cachedToken = null;
let tokenExpiry = 0;

async function getEnv() {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    return env;
}

export async function getAccessToken() {
    if (cachedToken && Date.now() < tokenExpiry) {
        return cachedToken;
    }

    const env = await getEnv();
    const tenantId = env.SP_TENANT_ID;
    const clientId = env.SP_CLIENT_ID;
    const clientSecret = env.SP_CLIENT_SECRET;

    const resp = await fetch(
        `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
        {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                scope: "https://graph.microsoft.com/.default",
                grant_type: "client_credentials",
            }),
        }
    );

    if (!resp.ok) {
        throw new Error(`Token request failed: ${resp.status}`);
    }

    const data = await resp.json();
    cachedToken = data.access_token;
    // Cache for 50 minutes (tokens last 60 min)
    tokenExpiry = Date.now() + 50 * 60 * 1000;
    return cachedToken;
}

function extractGraphPath(docUrl) {
    // doc URLs look like:
    // https://gorkem.sharepoint.com/Documentation/SUBELER/IQ/INFO CENTER/06.ACCOUNTING/01.CASH-REPORTS/2023/06/06/EKLER/IQ.HQ.230606.001.pdf
    // The Graph API drive root IS the Documentation library, so strip the domain + /Documentation/
    try {
        const url = new URL(docUrl);
        const fullPath = decodeURIComponent(url.pathname);
        // Remove /Documentation/ prefix
        const idx = fullPath.indexOf("/Documentation/");
        if (idx !== -1) {
            return fullPath.substring(idx + "/Documentation/".length);
        }
        // Fallback: just use path after first /
        return fullPath.substring(1);
    } catch {
        return docUrl;
    }
}

export async function checkFileExists(docUrl) {
    const token = await getAccessToken();
    const env = await getEnv();
    const driveId = env.SP_DRIVE_ID;
    const path = extractGraphPath(docUrl);

    const resp = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root:/${encodeURI(path)}`,
        {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
        }
    );

    return resp.status === 200;
}

export async function batchCheckFiles(docUrls) {
    const token = await getAccessToken();
    const env = await getEnv();
    const driveId = env.SP_DRIVE_ID;

    const results = {};
    // Process in parallel batches of 20
    const batchSize = 20;
    for (let i = 0; i < docUrls.length; i += batchSize) {
        const batch = docUrls.slice(i, i + batchSize);
        const checks = batch.map(async (docUrl) => {
            const path = extractGraphPath(docUrl);
            try {
                const resp = await fetch(
                    `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root:/${encodeURI(path)}`,
                    {
                        method: "GET",
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                results[docUrl] = resp.status === 200;
            } catch {
                results[docUrl] = false;
            }
        });
        await Promise.all(checks);
    }

    return results;
}

export async function uploadFile(docUrl, fileBuffer, contentType = "application/pdf") {
    const token = await getAccessToken();
    const env = await getEnv();
    const driveId = env.SP_DRIVE_ID;
    const path = extractGraphPath(docUrl);

    // Simple upload (< 4MB) via PUT - auto-creates folders
    const resp = await fetch(
        `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root:/${encodeURI(path)}:/content`,
        {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": contentType,
            },
            body: fileBuffer,
        }
    );

    if (!resp.ok) {
        const error = await resp.text();
        throw new Error(`Upload failed (${resp.status}): ${error}`);
    }

    return await resp.json();
}
