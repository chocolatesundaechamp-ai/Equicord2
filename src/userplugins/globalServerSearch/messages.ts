export interface MessageFilters {
    query: string;
    guildId: string;
    authorId: string;
    channelId: string;
    after: string;
    before: string;
    has: string;
    sort: string;
}

export interface SearchTarget {
    id: string;
    name: string;
}

export interface SearchMessage {
    id: string;
    channel_id: string;
    content: string;
    timestamp: string;
    hit?: boolean;
    author: { id: string; username: string; global_name?: string; bot?: boolean; };
    attachments?: { id: string; filename: string; url: string; }[];
    embeds?: { title?: string; description?: string; }[];
}

export interface MessageHit extends SearchMessage {
    guildId: string;
    guildName: string;
}

export interface SearchBody {
    messages?: SearchMessage[][];
    total_results?: number;
    retry_after?: number;
    message?: string;
}

export const defaultFilters: MessageFilters = { query: "", guildId: "", authorId: "", channelId: "", after: "", before: "", has: "", sort: "desc" };

export function searchText(value: string) {
    return value.replace(/^\s*global:\s*/i, "").trim();
}

function dateBoundary(value: string) {
    const timestamp = new Date(`${value}T00:00:00`).getTime();
    if (!Number.isFinite(timestamp) || timestamp < 1420070400000) throw new Error("Choose a valid date from 2015 onward.");
    return ((BigInt(timestamp) - 1420070400000n) << 22n).toString();
}

export function validateFilters(filters: MessageFilters) {
    if (!searchText(filters.query)) throw new Error("Enter a word or phrase to search for.");
    if (filters.authorId && !/^\d{15,22}$/.test(filters.authorId.trim())) throw new Error("Enter the author's numeric Discord user ID.");
    if (filters.channelId && !filters.guildId) throw new Error("Choose a server before filtering by channel.");
    if (filters.channelId && !/^\d{15,22}$/.test(filters.channelId.trim())) throw new Error("Enter a numeric Discord channel ID.");
    if (filters.after) dateBoundary(filters.after);
    if (filters.before) dateBoundary(filters.before);
    if (filters.after && filters.before && filters.after >= filters.before) throw new Error("The Before date must be later than the From date.");
}

export function buildQuery(filters: MessageFilters, offset: number) {
    validateFilters(filters);
    const query: Record<string, string | number> = { content: searchText(filters.query), offset, sort_by: "timestamp", sort_order: filters.sort, limit: 25 };
    if (filters.authorId) query.author_id = filters.authorId.trim();
    if (filters.channelId) query.channel_id = filters.channelId.trim();
    if (filters.has) query.has = filters.has;
    if (filters.after) query.min_id = (BigInt(dateBoundary(filters.after)) - 1n).toString();
    if (filters.before) query.max_id = dateBoundary(filters.before);
    return query;
}

export function extractHits(body: SearchBody, target: SearchTarget): MessageHit[] {
    const messages = (body.messages ?? []).flat().filter(message => message.hit !== false);
    const unique = new Map(messages.map(message => [message.id, { ...message, guildId: target.id, guildName: target.name }]));
    return [...unique.values()];
}

export function mergeHits(current: MessageHit[], incoming: MessageHit[]) {
    return [...new Map([...current, ...incoming].map(message => [message.id, message])).values()];
}

export function sortHits(messages: MessageHit[], order: string) {
    return [...messages].sort((left, right) => {
        const difference = BigInt(left.id) > BigInt(right.id) ? 1 : BigInt(left.id) < BigInt(right.id) ? -1 : 0;
        return order === "asc" ? difference : -difference;
    });
}
