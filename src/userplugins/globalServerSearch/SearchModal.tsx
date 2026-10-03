import { RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, GuildStore, Modal, NavigationRouter, PermissionStore, React, useEffect, UserGuildSettingsStore,useState, useStateFromStores } from "@webpack/common";

import { collectResults } from "./data";
import { SearchFilters, SearchResult, searchResults } from "./search";

const defaults: SearchFilters = { query: "", guildId: "", kind: "all", hideMuted: false, exact: false, sort: "relevance" };
const labels = { server: "Server", text: "Text", voice: "Voice / Stage", forum: "Forum / Media", thread: "Thread" };

function openResult(result: SearchResult, close: () => void) {
    if (result.kind === "server") NavigationRouter.transitionToGuild(result.guildId);
    else NavigationRouter.transitionTo(`/channels/${result.guildId}/${result.id}`);
    close();
}

function ResultRow({ result, onClose }: { result: SearchResult; onClose: () => void; }) {
    return <button className="gss-result" onClick={() => openResult(result, onClose)}>
        <span className="gss-symbol" aria-hidden="true">{result.kind === "server" ? "S" : result.kind === "voice" ? "V" : "#"}</span>
        <span className="gss-result-details"><strong>{result.name}</strong><small>{result.guildName}{result.category && ` / ${result.category}`}</small></span>
        <span className="gss-badge">{labels[result.kind]}{result.muted && " · Muted"}</span>
    </button>;
}

function FilterControls({ filters, update }: { filters: SearchFilters; update: (change: Partial<SearchFilters>) => void; }) {
    const guilds = useStateFromStores([GuildStore], () => Object.values(GuildStore.getGuilds()).sort((left, right) => left.name.localeCompare(right.name)));
    return <div className="gss-filters">
        <label>Server<select value={filters.guildId} onChange={event => update({ guildId: event.target.value })}><option value="">All servers</option>{guilds.map(guild => <option key={guild.id} value={guild.id}>{guild.name}</option>)}</select></label>
        <label>Show<select value={filters.kind} onChange={event => update({ kind: event.target.value })}><option value="all">Servers and channels</option>{Object.entries(labels).map(([kind, label]) => <option key={kind} value={kind}>{label}</option>)}</select></label>
        <label>Sort<select value={filters.sort} onChange={event => update({ sort: event.target.value })}><option value="relevance">Best match</option><option value="name">Name</option><option value="server">Server</option></select></label>
        <label className="gss-checkbox"><input type="checkbox" checked={filters.hideMuted} onChange={event => update({ hideMuted: event.target.checked })} />Hide muted</label>
        <label className="gss-checkbox"><input type="checkbox" checked={filters.exact} onChange={event => update({ exact: event.target.checked })} />Exact name</label>
    </div>;
}

function Results({ results, onClose }: { results: SearchResult[]; onClose: () => void; }) {
    const [limit, setLimit] = useState(100);
    useEffect(() => setLimit(100), [results]);
    return <div className="gss-results">
        {results.slice(0, limit).map(result => <ResultRow key={`${result.kind}:${result.id}`} result={result} onClose={onClose} />)}
        {!results.length && <p className="gss-empty">No matches. Try another name or clear your filters.</p>}
        {results.length > limit && <button className="gss-more" onClick={() => setLimit(limit + 100)}>Show next 100 ({results.length - limit} remaining)</button>}
    </div>;
}

export function SearchModal(props: RenderModalProps) {
    const [filters, setFilters] = useState(defaults);
    const update = (change: Partial<SearchFilters>) => setFilters(current => ({ ...current, ...change }));
    const records = useStateFromStores([GuildStore, ChannelStore, PermissionStore, UserGuildSettingsStore], collectResults);
    const results = React.useMemo(() => searchResults(records, filters), [records, filters]);
    return <Modal {...props} size="lg" title="Search all servers" subtitle="Find channels and servers by name">
        <div className="gss-panel">
            <input className="gss-query" autoFocus placeholder="Search names, e.g. casino" aria-label="Search channel and server names" value={filters.query} onChange={event => update({ query: event.target.value })} onKeyDown={event => { if (event.key === "Enter" && results.length) openResult(results[0], props.onClose); }} />
            <FilterControls filters={filters} update={update} />
            <div className="gss-summary" aria-live="polite">{results.length} results<button onClick={() => setFilters(current => ({ ...defaults, query: current.query }))}>Reset filters</button></div>
            <Results results={results} onClose={props.onClose} />
            <p className="gss-hint">Enter opens the first result. Voice results open the channel without joining. Threads appear when loaded in Discord.</p>
        </div>
    </Modal>;
}
