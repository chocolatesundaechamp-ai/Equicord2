import "./styles.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import definePlugin from "@utils/types";
import { ChannelStore, closeModal, GuildStore, openModal, React } from "@webpack/common";

import { collectResults } from "./data";
import { SearchModal } from "./SearchModal";
import { searchResults } from "./search";

const modalKey = "global-server-search";

function openSearch() {
    openModal(props => <SearchModal {...props} />, { modalKey });
}

function SearchButton() {
    return <button className="gss-launcher" title="Search all servers (Ctrl+Shift+K)" aria-label="Search all servers" onClick={openSearch}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" /><path d="m15 15 5 5" stroke="currentColor" strokeWidth="2" /></svg>
    </button>;
}

function handleShortcut(event: KeyboardEvent) {
    if (event.repeat || event.altKey || !(event.ctrlKey || event.metaKey) || !event.shiftKey || event.code !== "KeyK") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openSearch();
}

function getQuickSwitcherResults(query: string, original: unknown[]) {
    if (!/^\s*global:/i.test(query)) return original;
    const filters = { query, guildId: "", kind: "all", hideMuted: false, exact: false, sort: "relevance" };
    return searchResults(collectResults(), filters).flatMap(result => {
        const record = result.kind === "server" ? GuildStore.getGuild(result.id) : ChannelStore.getChannel(result.id);
        if (!record) return [];
        return [{
            type: result.kind === "server" ? "GUILD" : result.kind === "voice" ? "VOICE_CHANNEL" : "TEXT_CHANNEL",
            record,
            score: 100,
            comparator: query.replace(/^\s*global:\s*/i, ""),
            sortable: `${result.name} ${result.guildName}`
        }];
    });
}

export default definePlugin({
    name: "GlobalServerSearch",
    description: "Instantly search channel and server names across all joined servers with type, server and mute filters.",
    authors: [{ name: "StuxFian", id: 0n }],
    getQuickSwitcherResults,
    patches: [{
        find: "#{intl::QUICKSWITCHER_PLACEHOLDER}",
        replacement: {
            match: /let{selectedIndex:\i,results:\i}/,
            replace: "this.props.results=$self.getQuickSwitcherResults(this.state.query,this.props.results);$&"
        }
    }],
    start() {
        addServerListElement(ServerListRenderPosition.Above, SearchButton);
        document.addEventListener("keydown", handleShortcut, true);
    },
    stop() {
        removeServerListElement(ServerListRenderPosition.Above, SearchButton);
        document.removeEventListener("keydown", handleShortcut, true);
        closeModal(modalKey);
    }
});
