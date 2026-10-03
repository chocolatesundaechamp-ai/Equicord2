import { RenderModalProps } from "@vencord/discord-types";
import { ChannelStore, GuildStore, Modal, NavigationRouter, React, useEffect, useMemo, useState, useStateFromStores } from "@webpack/common";

import { defaultFilters, MessageFilters, MessageHit, searchText, sortHits } from "./messages";
import { useMessageSearch } from "./useMessageSearch";

function openMessage(message: MessageHit, close: () => void) {
    NavigationRouter.transitionTo(`/channels/${message.guildId}/${message.channel_id}/${message.id}`);
    close();
}

function MessageCard({ message, close }: { message: MessageHit; close: () => void; }) {
    const channelName = ChannelStore.getChannel(message.channel_id)?.name ?? message.channel_id;
    return <article className="gss-message">
        <div className="gss-message-header"><strong>{message.author.global_name || message.author.username}</strong><span>@{message.author.username}{message.author.bot && " · Bot"}</span><time dateTime={message.timestamp}>{new Date(message.timestamp).toLocaleString()}</time></div>
        <div className="gss-location">{message.guildName} / #{channelName}</div>
        <p className="gss-content">{message.content || "Message contains an attachment or embed."}</p>
        {message.embeds?.slice(0, 3).map((embed, index) => <div className="gss-embed" key={index}>{embed.title && <strong>{embed.title}</strong>}{embed.description && <p>{embed.description.slice(0, 1000)}</p>}</div>)}
        {!!message.attachments?.length && <div className="gss-attachments">{message.attachments.map(attachment => <span key={attachment.id}>{attachment.filename}</span>)}</div>}
        <button className="gss-jump" onClick={() => openMessage(message, close)}>Jump to message</button>
    </article>;
}

function FilterControls({ filters, update, busy }: { filters: MessageFilters; update: (change: Partial<MessageFilters>) => void; busy: boolean; }) {
    const guilds = useStateFromStores([GuildStore], () => Object.values(GuildStore.getGuilds()).sort((left, right) => left.name.localeCompare(right.name)));
    return <fieldset className="gss-filters" disabled={busy}>
        <label>Server<select value={filters.guildId} onChange={event => update({ guildId: event.target.value, channelId: "" })}><option value="">All joined servers ({guilds.length})</option>{guilds.map(guild => <option key={guild.id} value={guild.id}>{guild.name}</option>)}</select></label>
        <label>Author ID<input placeholder="Anyone" value={filters.authorId} onChange={event => update({ authorId: event.target.value })} /></label>
        <label>Channel ID<input placeholder="All channels" disabled={!filters.guildId} value={filters.channelId} onChange={event => update({ channelId: event.target.value })} /></label>
        <label>From date<input type="date" value={filters.after} onChange={event => update({ after: event.target.value })} /></label>
        <label>Before date<input type="date" value={filters.before} onChange={event => update({ before: event.target.value })} /></label>
        <label>Contains<select value={filters.has} onChange={event => update({ has: event.target.value })}><option value="">Anything</option><option value="image">Images</option><option value="video">Videos</option><option value="link">Links</option><option value="file">Files</option><option value="embed">Embeds</option></select></label>
        <label>Sort<select value={filters.sort} onChange={event => update({ sort: event.target.value })}><option value="desc">Newest first</option><option value="asc">Oldest first</option></select></label>
    </fieldset>;
}

function SearchStatus({ search }: { search: ReturnType<typeof useMessageSearch>; }) {
    const failures = Object.values(search.state.pages).filter(page => page.error);
    const total = Object.values(search.state.pages).reduce((sum, page) => sum + page.total, 0);
    return <div className="gss-status">
        <p aria-live="polite">{search.state.status}</p>
        <small>{search.state.hits.length} loaded · {total} matches reported in searched servers{search.state.busy && ` · ${search.state.progress} server pages completed`}</small>
        {failures.length > 0 && <details><summary>{failures.length} servers could not be searched</summary>{failures.map(page => <p key={page.target.id}>{page.target.name}: {page.error}</p>)}</details>}
        {search.changed && search.state.queryKey && <p>Filters changed. Search again to apply them.</p>}
    </div>;
}

function Results({ search, close }: { search: ReturnType<typeof useMessageSearch>; close: () => void; }) {
    const [visible, setVisible] = useState(100);
    useEffect(() => setVisible(100), [search.state.queryKey]);
    const order = JSON.parse(search.state.queryKey || "{}").sort ?? "desc";
    const messages = useMemo(() => sortHits(search.state.hits, order), [search.state.hits, order]);
    return <div className="gss-results">
        {messages.slice(0, visible).map(message => <MessageCard key={message.id} message={message} close={close} />)}
        {messages.length > visible && <button className="gss-more" onClick={() => setVisible(visible + 100)}>Show next 100 loaded messages</button>}
        {!!search.state.queryKey && !search.state.busy && !messages.length && <p className="gss-empty">No messages loaded. Check your filters and any server errors above.</p>}
        {search.state.more && <button className="gss-more" disabled={search.state.busy || search.changed} onClick={search.more}>Load more messages from remaining servers</button>}
    </div>;
}

export function SearchModal(props: RenderModalProps & { initialQuery: string; }) {
    const [filters, setFilters] = useState({ ...defaultFilters, query: searchText(props.initialQuery) });
    const update = (change: Partial<MessageFilters>) => setFilters(current => ({ ...current, ...change }));
    const search = useMessageSearch(filters);
    useEffect(() => { if (searchText(props.initialQuery)) search.start(); }, []);
    return <Modal transitionState={props.transitionState} onClose={props.onClose} size="lg" title="Global message search" subtitle="Search message contents across your joined servers">
        <div className="gss-panel">
            <form onSubmit={event => { event.preventDefault(); if (!search.state.busy) search.start(); }}>
                <div className="gss-search-row"><input className="gss-query" autoFocus aria-label="Search message contents" placeholder="casino or global:casino" value={filters.query} disabled={search.state.busy} onChange={event => update({ query: event.target.value })} /><button type="submit" disabled={search.state.busy}>Search</button>{search.state.busy && <button type="button" onClick={search.stop}>Stop</button>}</div>
                <FilterControls filters={filters} update={update} busy={search.state.busy} />
            </form>
            <SearchStatus search={search} />
            <Results search={search} close={props.onClose} />
            <p className="gss-hint">Searches run server by server. Each pass loads up to 25 matches per server. Only messages available to your account can appear. Dates use your local timezone.</p>
        </div>
    </Modal>;
}
