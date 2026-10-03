import { buildQuery, extractHits, MessageFilters, MessageHit, SearchBody, SearchTarget } from "./messages";

export interface SearchRequest {
    url: string;
    query: Record<string, string | number>;
    retries: number;
}

export interface SearchResponse {
    status?: number;
    body: SearchBody;
}

export interface SearchPage {
    target: SearchTarget;
    hits: MessageHit[];
    total: number;
    error: string;
    more: boolean;
}

interface Cursor extends SearchTarget {
    offset: number;
    total: number;
    done: boolean;
}

interface SessionOptions {
    filters: MessageFilters;
    targets: SearchTarget[];
    request: (request: SearchRequest) => Promise<SearchResponse>;
    wait?: (milliseconds: number, signal: AbortSignal) => Promise<void>;
}

export function waitForSearch(milliseconds: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
        const cancel = () => { clearTimeout(timer); reject(new Error("Search stopped.")); };
        const finish = () => { signal.removeEventListener("abort", cancel); resolve(); };
        const timer = setTimeout(finish, milliseconds);
        signal.addEventListener("abort", cancel, { once: true });
        if (signal.aborted) cancel();
    });
}

function searchFailure(error: unknown) {
    const response = error as { status?: number; body?: SearchBody; message?: string; };
    if (response.status === 403) return "No permission to search this server.";
    if (response.status === 404) return "Server is unavailable.";
    return response.body?.message ?? response.message ?? "Discord could not search this server.";
}

export class MessageSearchSession {
    private readonly controller = new AbortController();
    private readonly cursors: Cursor[];

    constructor(private readonly options: SessionOptions) {
        this.cursors = options.targets.map(target => ({ ...target, offset: 0, total: 0, done: false }));
    }

    get stopped() { return this.controller.signal.aborted; }
    get hasMore() { return this.cursors.some(cursor => !cursor.done); }
    get filters() { return this.options.filters; }
    get targetCount() { return this.cursors.length; }

    cancel() {
        this.controller.abort();
    }

    private async response(cursor: Cursor): Promise<SearchResponse> {
        try {
            return await this.options.request({ url: `/guilds/${cursor.id}/messages/search`, query: buildQuery(this.options.filters, cursor.offset), retries: 0 });
        } catch (error) {
            const response = error as SearchResponse;
            if (response.status === 429 && response.body) return response;
            throw error;
        }
    }

    private async requestPage(cursor: Cursor): Promise<SearchBody> {
        for (let attempt = 0; attempt < 5; attempt++) {
            if (this.stopped) throw new Error("Search stopped.");
            const response = await this.response(cursor);
            if (this.stopped) throw new Error("Search stopped.");
            if (response.status !== 202 && response.status !== 429) {
                if ((response.status ?? 200) >= 400) throw response;
                return response.body;
            }
            const delay = Math.max(1000, Number(response.body.retry_after ?? 2) * 1000 + 250);
            await (this.options.wait ?? waitForSearch)(delay, this.controller.signal);
        }
        throw new Error("Discord is still indexing or rate limiting this search. Try this server again later.");
    }

    private async load(cursor: Cursor): Promise<SearchPage> {
        try {
            const body = await this.requestPage(cursor);
            const count = body.messages?.length ?? 0;
            cursor.total = body.total_results ?? 0;
            cursor.offset += count;
            cursor.done = !count || cursor.offset >= cursor.total || cursor.offset >= 9975;
            return { target: cursor, hits: extractHits(body, cursor), total: cursor.total, error: "", more: !cursor.done };
        } catch (error) {
            if (this.stopped) throw error;
            cursor.done = true;
            return { target: cursor, hits: [], total: 0, error: searchFailure(error), more: false };
        }
    }

    async *pages(): AsyncGenerator<SearchPage> {
        const pending = this.cursors.filter(cursor => !cursor.done);
        for (const cursor of pending) {
            if (this.stopped) return;
            const page = await this.load(cursor);
            if (this.stopped) return;
            yield page;
            if (cursor !== pending[pending.length - 1]) await (this.options.wait ?? waitForSearch)(1000, this.controller.signal);
        }
    }
}
