import assert from "node:assert/strict";
import test from "node:test";

import { searchResults } from "../search.ts";

const defaults = { query: "casino", guildId: "", kind: "all", hideMuted: false, exact: false, sort: "relevance" };
const result = (id, changes = {}) => ({ id, name: "casino", guildId: "alpha", guildName: "Alpha", category: "", kind: "text", muted: false, ...changes });
const records = [result("exact"), result("prefix", { name: "casino-games", guildId: "beta", guildName: "Beta", muted: true }), result("inside", { name: "general-casino", kind: "voice" }), result("server", { name: "Casino Club", kind: "server" }), result("other", { name: "general" })];
const ids = (changes = {}) => searchResults(records, { ...defaults, ...changes }).map(item => item.id);

test("finds names across multiple servers", () => assert.deepEqual(ids(), ["exact", "server", "prefix", "inside"]));
test("filters to one server", () => assert.deepEqual(ids({ guildId: "beta" }), ["prefix"]));
test("filters voice channels", () => assert.deepEqual(ids({ kind: "voice" }), ["inside"]));
test("filters servers", () => assert.deepEqual(ids({ kind: "server" }), ["server"]));
test("excludes muted results", () => assert.deepEqual(ids({ hideMuted: true }), ["exact", "server", "inside"]));
test("matches exact names", () => assert.deepEqual(ids({ exact: true }), ["exact"]));
test("ignores case and leading hash", () => assert.deepEqual(ids({ query: "#CASINO" }), ids()));
test("normalizes channel separators", () => assert.deepEqual(ids({ query: "casino games" }), ["prefix"]));
test("returns no matches for missing words", () => assert.deepEqual(ids({ query: "missing" }), []));
test("empty search includes all records", () => assert.equal(ids({ query: "" }).length, records.length));
test("filters can be combined", () => assert.deepEqual(ids({ guildId: "beta", hideMuted: true }), []));
test("sorts names alphabetically", () => assert.deepEqual(ids({ sort: "name" }), ["exact", "server", "prefix", "inside"]));
test("does not mutate the source records", () => {
    const original = structuredClone(records);
    ids({ sort: "server" });
    assert.deepEqual(records, original);
});
