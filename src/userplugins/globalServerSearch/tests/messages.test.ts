import assert from "node:assert/strict";
import test from "node:test";

import { buildQuery, defaultFilters, extractHits, mergeHits, searchText, sortHits, validateFilters } from "../messages";
import { MessageSearchSession, SearchPage, SearchRequest } from "../session";

const filters = { ...defaultFilters, query: "global:casino" };
const target = { id: "alpha", name: "Alpha" };
const message = (id: string, changes = {}) => ({ id, channel_id: "channel", content: "casino", timestamp: "2026-10-03T00:00:00Z", hit: true, author: { id: "author", username: "Player" }, ...changes });
const response = (id: string, total = 1) => ({ status: 200, body: { total_results: total, messages: [[message(id)]] } });
const session = (request: ConstructorParameters<typeof MessageSearchSession>[0]["request"], changes: Partial<ConstructorParameters<typeof MessageSearchSession>[0]> = {}) => new MessageSearchSession({ filters, targets: [target], request, wait: async () => {}, ...changes });
const pages = async (search: MessageSearchSession) => {
    const result: SearchPage[] = [];
    for await (const page of search.pages()) result.push(page);
    return result;
};

test("strips the global prefix", () => assert.equal(searchText(" GLOBAL: casino "), "casino"));
test("searches message contents", () => assert.equal(buildQuery(filters, 0).content, "casino"));
test("preserves pagination", () => assert.equal(buildQuery(filters, 25).offset, 25));
test("rejects an empty query", () => assert.throws(() => validateFilters({ ...filters, query: "global:" })));
test("requires numeric author IDs", () => assert.throws(() => validateFilters({ ...filters, authorId: "Player" })));
test("requires a server for channel filtering", () => assert.throws(() => validateFilters({ ...filters, channelId: "123456789012345678" })));
test("rejects reversed dates", () => assert.throws(() => validateFilters({ ...filters, after: "2026-10-03", before: "2026-10-02" })));
test("preserves author filters", () => assert.equal(buildQuery({ ...filters, authorId: "123456789012345678" }, 0).author_id, "123456789012345678"));
test("converts dates into search boundaries", () => assert.match(String(buildQuery({ ...filters, after: "2026-10-01" }, 0).min_id), /^\d+$/));
test("excludes context messages", () => assert.deepEqual(extractHits({ messages: [[message("1"), message("2", { hit: false })]] }, target).map(hit => hit.id), ["1"]));
test("deduplicates loaded messages", () => {
    const hits = extractHits(response("1").body, target);
    assert.equal(mergeHits(hits, hits).length, 1);
});
test("sorts snowflakes without rounding", () => assert.deepEqual(sortHits(extractHits({ messages: [[message("123456789012345679"), message("123456789012345678")]] }, target), "asc").map(hit => hit.id), ["123456789012345678", "123456789012345679"]));
test("requests every selected server", async () => {
    const visited: string[] = [];
    await pages(session(async (request: SearchRequest) => { visited.push(request.url); return response("1"); }, { targets: [target, { id: "beta", name: "Beta" }] }));
    assert.deepEqual(visited, ["/guilds/alpha/messages/search", "/guilds/beta/messages/search"]);
});
test("loads the next page without restarting", async () => {
    const offsets: number[] = [];
    const search = session(async (request: SearchRequest) => { offsets.push(Number(request.query.offset)); return response(String(offsets.length), 2); });
    await pages(search);
    await pages(search);
    assert.deepEqual(offsets, [0, 1]);
});
test("counts result groups rather than context messages", async () => {
    const offsets: number[] = [];
    const search = session(async (request: SearchRequest) => { offsets.push(Number(request.query.offset)); return { status: 200, body: { total_results: 2, messages: [[message("1"), message("2", { hit: false })]] } }; });
    await pages(search);
    await pages(search);
    assert.deepEqual(offsets, [0, 1]);
});
test("retries indexing responses", async () => {
    let calls = 0;
    const result = await pages(session(async () => ++calls === 1 ? { status: 202, body: { retry_after: 1 } } : response("1")));
    assert.equal(result[0].hits.length, 1);
});
test("honors rate limit retry times", async () => {
    let calls = 0;
    const delays: number[] = [];
    await pages(session(async () => ++calls === 1 ? { status: 429, body: { retry_after: 3 } } : response("1"), { wait: async (delay: number) => { delays.push(delay); } }));
    assert.deepEqual(delays, [3250]);
});
test("retries rejected REST rate limits", async () => {
    let calls = 0;
    const result = await pages(session(async () => { if (++calls === 1) throw { status: 429, body: { retry_after: 1 } }; return response("1"); }));
    assert.equal(result[0].hits.length, 1);
});
test("continues after a server denies permission", async () => {
    const result = await pages(session(async (request: SearchRequest) => { if (request.url.includes("alpha")) throw { status: 403 }; return response("1"); }, { targets: [target, { id: "beta", name: "Beta" }] }));
    assert.deepEqual(result.map(page => page.error || page.hits[0].id), ["No permission to search this server.", "1"]);
});
test("cancellation discards in-flight results", async () => {
    let search: MessageSearchSession;
    search = session(async () => { search.cancel(); return response("1"); });
    await assert.rejects(pages(search), /Search stopped/);
});
test("empty pages finish pagination", async () => {
    const search = session(async () => ({ status: 200, body: { total_results: 100, messages: [] } }));
    await pages(search);
    assert.equal(search.hasMore, false);
});
test("bounds retries and reports indexing failures", async () => {
    let calls = 0;
    const result = await pages(session(async () => { calls++; return { status: 202, body: {} }; }));
    assert.deepEqual([calls, result[0].error.includes("still indexing")], [5, true]);
});
