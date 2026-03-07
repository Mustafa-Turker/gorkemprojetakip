/**
 * Test: DeepSeek fallback from deepseek-reasoner to deepseek-chat
 *
 * Simulates the classify API's fallback logic locally:
 * 1. Calls deepseek-reasoner with an intentionally invalid API key prefix to force failure
 * 2. Falls back to deepseek-chat with the real key
 * 3. Verifies the fallback produces a valid cost code suggestion
 *
 * Usage: node test-classify-fallback.mjs
 */

const API_KEY = "sk-a358ee19d8974abf9bf91b9340b5bee9";

const systemMessage = `You are a cost code classifier. Given a transaction description, return a cost code.
Return ONLY valid JSON: {"costCode": "XX.XX.XX.XX"}`;

const userMessage = "Description: Fuel purchase for company vehicle\nVendor: SHELL PETROL";

async function callDeepSeek(apiKey, model, system, user) {
    const start = Date.now();
    const resp = await fetch("https://api.deepseek.com/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
            model,
            messages: [
                { role: "system", content: system },
                { role: "user", content: user },
            ],
            response_format: { type: "json_object" },
        }),
    });
    const durationMs = Date.now() - start;
    const data = await resp.json();
    return { ok: resp.ok, status: resp.status, data, durationMs };
}

async function testFallback() {
    console.log("=== Test: Fallback from deepseek-reasoner to deepseek-chat ===\n");

    // Step 1: Force reasoner to fail with a bad key
    console.log("1. Calling deepseek-reasoner with INVALID key (should fail)...");
    const badKey = "sk-invalid-key-for-testing-fallback";
    const reasonerResult = await callDeepSeek(badKey, "deepseek-reasoner", systemMessage, userMessage);
    console.log(`   Status: ${reasonerResult.status} (ok=${reasonerResult.ok})`);
    console.log(`   Duration: ${reasonerResult.durationMs}ms`);
    console.log(`   Error: ${reasonerResult.data?.error?.message || "none"}`);

    if (reasonerResult.ok) {
        console.log("\n   UNEXPECTED: Reasoner succeeded with bad key. Test invalid.");
        process.exit(1);
    }

    console.log("\n   Reasoner failed as expected. Falling back...\n");

    // Step 2: Fallback to deepseek-chat with the real key
    console.log("2. Calling deepseek-chat with VALID key (fallback)...");
    const chatResult = await callDeepSeek(API_KEY, "deepseek-chat", systemMessage, userMessage);
    console.log(`   Status: ${chatResult.status} (ok=${chatResult.ok})`);
    console.log(`   Duration: ${chatResult.durationMs}ms`);

    if (!chatResult.ok) {
        console.log(`   ERROR: Fallback also failed: ${chatResult.data?.error?.message}`);
        process.exit(1);
    }

    const content = chatResult.data.choices?.[0]?.message?.content || "";
    console.log(`   Content: ${content}`);

    // Parse suggestion
    const match = content.match(/\{[^}]*"costCode"\s*:\s*"([^"]+)"[^}]*\}/);
    const suggestion = match ? match[1] : null;
    console.log(`   Parsed costCode: ${suggestion}`);

    const usage = chatResult.data.usage || {};
    console.log(`   Tokens — cache hit: ${usage.prompt_cache_hit_tokens || 0}, cache miss: ${usage.prompt_cache_miss_tokens || 0}, output: ${usage.completion_tokens || 0}`);

    // Step 3: Verify
    console.log("\n=== Results ===");
    console.log(`Reasoner failed: YES (status ${reasonerResult.status})`);
    console.log(`Chat fallback succeeded: ${chatResult.ok ? "YES" : "NO"}`);
    console.log(`Got valid suggestion: ${suggestion ? "YES" : "NO"} (${suggestion})`);

    if (chatResult.ok && suggestion) {
        console.log("\nFALLBACK TEST PASSED");
    } else {
        console.log("\nFALLBACK TEST FAILED");
        process.exit(1);
    }
}

testFallback().catch((err) => {
    console.error("Test error:", err);
    process.exit(1);
});
