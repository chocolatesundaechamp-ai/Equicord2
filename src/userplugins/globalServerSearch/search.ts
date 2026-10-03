export type ResultKind = "server" | "text" | "voice" | "forum" | "thread";

export interface SearchResult {
    id: string;
    name: string;
    guildId: string;
    guildName: string;
    category: string;
    kind: ResultKind;
    muted: boolean;
}

export interface SearchFilters {
    query: string;
    guildId: string;
    kind: string;
    hideMuted: boolean;
    exact: boolean;
    sort: string;
}

export function normalize(value: string) {
    return value.replace(/^\s*global:\s*/i, "").normalize("NFKC").toLocaleLowerCase().replace(/[\s_-]+/g, " ").trim();
}

function matches(result: SearchResult, filters: SearchFilters) {
    if (filters.guildId && result.guildId !== filters.guildId) return false;
    if (filters.kind !== "all" && result.kind !== filters.kind) return false;
    if (filters.hideMuted && result.muted) return false;
    const query = normalize(filters.query.replace(/^#/, ""));
    const name = normalize(result.name);
    if (filters.exact) return name === query;
    return query.split(" ").every(term => name.includes(term));
}

function compareResults(filters: SearchFilters) {
    const query = normalize(filters.query.replace(/^#/, ""));
    const rank = (name: string) => normalize(name) === query ? 0 : normalize(name).startsWith(query) ? 1 : 2;
    return (left: SearchResult, right: SearchResult) => {
        if (filters.sort === "server") return left.guildName.localeCompare(right.guildName) || left.name.localeCompare(right.name);
        if (filters.sort === "name") return left.name.localeCompare(right.name) || left.guildName.localeCompare(right.guildName);
        return rank(left.name) - rank(right.name) || left.name.localeCompare(right.name) || left.guildName.localeCompare(right.guildName);
    };
}

export function searchResults(results: SearchResult[], filters: SearchFilters) {
    return results.filter(result => matches(result, filters)).sort(compareResults(filters));
}
