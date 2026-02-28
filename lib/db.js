import { Client } from 'pg';

export async function query(text, params) {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = await getCloudflareContext();
    const client = new Client({ connectionString: env.HYPERDRIVE.connectionString });
    try {
        await client.connect();
        return await client.query(text, params);
    } finally {
        await client.end();
    }
}
