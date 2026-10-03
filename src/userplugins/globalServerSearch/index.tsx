import "./styles.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import { definePluginSettings } from "@api/Settings";
import definePlugin, { OptionType } from "@utils/types";
import { closeModal, openModal, React } from "@webpack/common";

import { SearchModal } from "./SearchModal";

const modalKey = "global-server-search";
const settings = definePluginSettings({
    replaceHomeSearch: { type: OptionType.BOOLEAN, description: "Open Global Server Search from the Find or start a conversation button. Hold Shift to use Discord's original search.", default: true }
});

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

function handleHomeSearch(event: MouseEvent) {
    if (!settings.store.replaceHomeSearch || event.shiftKey || !(event.target instanceof Element)) return;
    if (!event.target.closest('[class*="searchBarComponent_"]')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    openSearch();
}

export default definePlugin({
    name: "GlobalServerSearch",
    description: "Instantly search channel and server names across all joined servers with type, server and mute filters.",
    authors: [{ name: "StuxFian", id: 0n }],
    settings,
    start() {
        addServerListElement(ServerListRenderPosition.Above, SearchButton);
        document.addEventListener("keydown", handleShortcut, true);
        document.addEventListener("click", handleHomeSearch, true);
    },
    stop() {
        removeServerListElement(ServerListRenderPosition.Above, SearchButton);
        document.removeEventListener("keydown", handleShortcut, true);
        document.removeEventListener("click", handleHomeSearch, true);
        closeModal(modalKey);
    }
});
