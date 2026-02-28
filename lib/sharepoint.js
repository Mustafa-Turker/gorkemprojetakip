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

/**
 * Parse a doc URL into its folder path and filename.
 * Example URL: https://gorkem.sharepoint.com/Documentation/SUBELER/IQ/INFO CENTER/06.ACCOUNTING/01.CASH-REPORTS/2024/03/15/EKLER/IQ.HQ.240315.001.pdf
 * Returns: { folderPath: "SUBELER/IQ/INFO CENTER/06.ACCOUNTING/01.CASH-REPORTS/2024/03/15/EKLER", filename: "IQ.HQ.240315.001.pdf" }
 */
function parseDocUrl(docUrl) {
    const graphPath = extractGraphPath(docUrl);
    const parts = graphPath.split("/");
    if (parts.length < 2) return null;
    const filename = parts[parts.length - 1];
    const folderPath = parts.slice(0, -1).join("/");
    return { folderPath, filename };
}

/**
 * List all filenames in a specific folder using Graph API children endpoint.
 * Unlike search(), children reliably returns ALL items in a folder.
 */
async function listFolder(driveId, folderPath, token) {
    const filenames = new Set();
    let apiCalls = 0;
    let url = `https://graph.microsoft.com/v1.0/drives/${encodeURIComponent(driveId)}/root:/${encodeURI(folderPath)}:/children?$select=name&$top=200`;

    while (url) {
        apiCalls++;
        const resp = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
        });

        if (resp.status === 404) {
            return { filenames: null, apiCalls };
        }

        if (!resp.ok) {
            console.error(`List failed for ${folderPath}: ${resp.status}`);
            return { filenames: null, apiCalls };
        }

        const data = await resp.json();
        if (data.value) {
            for (const item of data.value) {
                if (item.name) {
                    filenames.add(item.name);
                }
            }
        }

        url = data["@odata.nextLink"] || null;
    }

    return { filenames, apiCalls };
}

export async function searchBasedCheck(docUrls) {
    const token = await getAccessToken();
    const env = await getEnv();
    const driveId = env.SP_DRIVE_ID;

    // Parse all URLs and group by parent folder
    const scopeMap = new Map(); // folderPath -> [{ docUrl, filename }]
    const unparseable = [];

    for (const docUrl of docUrls) {
        const parsed = parseDocUrl(docUrl);
        if (!parsed) {
            unparseable.push(docUrl);
            continue;
        }
        if (!scopeMap.has(parsed.folderPath)) {
            scopeMap.set(parsed.folderPath, []);
        }
        scopeMap.get(parsed.folderPath).push({ docUrl, filename: parsed.filename });
    }

    const results = {};
    const perScope = [];

    for (const url of unparseable) {
        results[url] = false;
    }

    // Process folders 10 at a time (more granular folders = more scopes, so higher concurrency)
    const scopes = Array.from(scopeMap.entries());
    const concurrency = 10;

    for (let i = 0; i < scopes.length; i += concurrency) {
        const batch = scopes.slice(i, i + concurrency);
        await Promise.all(
            batch.map(async ([scope, entries]) => {
                const { filenames: existingFiles, apiCalls } = await listFolder(driveId, scope, token);
                const folderExists = existingFiles !== null;
                let found = 0;
                let missing = 0;

                for (const { docUrl, filename } of entries) {
                    if (!folderExists) {
                        results[docUrl] = false;
                        missing++;
                    } else {
                        const exists = existingFiles.has(filename);
                        results[docUrl] = exists;
                        if (exists) found++;
                        else missing++;
                    }
                }

                perScope.push({
                    scope,
                    apiCalls,
                    filesInScope: folderExists ? existingFiles.size : 0,
                    checked: entries.length,
                    found,
                    missing,
                    folderExists,
                });
            })
        );
    }

    perScope.sort((a, b) => a.scope.localeCompare(b.scope));

    const totalFound = perScope.reduce((sum, s) => sum + s.found, 0);
    const totalMissing = perScope.reduce((sum, s) => sum + s.missing, 0);

    const stats = {
        totalUrls: docUrls.length,
        unparseable: unparseable.length,
        totalScopes: perScope.length,
        totalApiCalls: perScope.reduce((sum, s) => sum + s.apiCalls, 0),
        totalFilesFound: perScope.reduce((sum, s) => sum + s.filesInScope, 0),
        found: totalFound,
        missing: totalMissing,
        perScope,
    };

    return { results, stats };
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
