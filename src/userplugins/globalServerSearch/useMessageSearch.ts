import { GuildStore, RestAPI, useEffect, useRef, useState } from "@webpack/common";

import { mergeHits, MessageFilters, MessageHit, validateFilters } from "./messages";
import { MessageSearchSession, SearchPage } from "./session";

interface SearchState {
    hits: MessageHit[];
    pages: Record<string, SearchPage>;
    busy: boolean;
    status: string;
    progress: number;
    more: boolean;
    queryKey: string;
}

const emptyState: SearchState = { hits: [], pages: {}, busy: false, status: "Search message contents across your joined servers.", progress: 0, more: false, queryKey: "" };
type UpdateState = (change: (current: SearchState) => SearchState) => void;

function createSession(filters: MessageFilters) {
    validateFilters(filters);
    const guilds = Object.values(GuildStore.getGuilds()).filter(guild => !filters.guildId || guild.id === filters.guildId);
    if (!guilds.length) throw new Error("No joined servers are available for this search.");
    const targets = guilds.map(guild => ({ id: guild.id, name: guild.name })).sort((left, right) => left.name.localeCompare(right.name));
    return new MessageSearchSession({ filters: { ...filters }, targets, request: request => RestAPI.get(request) });
}

async function runRound(session: MessageSearchSession, update: UpdateState) {
    try {
        for await (const page of session.pages()) {
            if (session.stopped) return;
            update(current => ({ ...current, hits: mergeHits(current.hits, page.hits), pages: { ...current.pages, [page.target.id]: page }, progress: current.progress + 1, status: `Searched ${page.target.name}` }));
        }
        if (!session.stopped) update(current => ({ ...current, busy: false, more: session.hasMore, status: `Finished searching ${session.targetCount} servers. ${current.hits.length} messages loaded.` }));
    } catch (error) {
        if (!session.stopped) update(current => ({ ...current, busy: false, status: error instanceof Error ? error.message : "Search failed." }));
    }
}

function startSearch(context: { session: { current: MessageSearchSession | undefined; }; update: UpdateState; }, filters: MessageFilters) {
    try {
        const session = createSession(filters);
        context.session.current?.cancel();
        context.session.current = session;
        context.update(() => ({ ...emptyState, busy: true, queryKey: JSON.stringify(filters), status: `Searching ${session.targetCount} servers…` }));
        void runRound(session, context.update);
    } catch (error) {
        context.update(current => ({ ...current, status: error instanceof Error ? error.message : "Invalid search." }));
    }
}

export function useMessageSearch(filters: MessageFilters) {
    const [state, update] = useState(emptyState);
    const session = useRef<MessageSearchSession | undefined>(undefined);
    useEffect(() => () => session.current?.cancel(), []);
    const context = { session, update };
    const stop = () => {
        session.current?.cancel();
        update(current => ({ ...current, busy: false, more: false, status: "Search stopped. Loaded messages are kept." }));
    };
    const more = () => {
        if (!session.current || state.busy || !session.current.hasMore || session.current.stopped) return;
        update(current => ({ ...current, busy: true, progress: 0, status: "Loading the next page from each remaining server…" }));
        void runRound(session.current, update);
    };
    return { state, start: () => startSearch(context, filters), stop, more, changed: state.queryKey !== JSON.stringify(filters) };
}
