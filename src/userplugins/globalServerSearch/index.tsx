import "./styles.css";

import { addServerListElement, removeServerListElement, ServerListRenderPosition } from "@api/ServerList";
import definePlugin from "@utils/types";
import { closeModal, FluxDispatcher, openModal, React } from "@webpack/common";

import { SearchModal } from "./SearchModal";

const modalKey = "global-server-message-search";

function openSearch(query = "") {
    openModal(props => <SearchModal {...props} initialQuery={query} />, { modalKey });
}

function SearchButton() {
    return <button className="gss-launcher" title="Search messages across servers (Ctrl+Shift+K)" aria-label="Global message search" onClick={() => openSearch()}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="6" stroke="currentColor" strokeWidth="2" /><path d="m15 15 5 5" stroke="currentColor" strokeWidth="2" /></svg>
    </button>;
}

function handleSearchKey(event: KeyboardEvent) {
    if (event.repeat || event.isComposing || event.altKey) return;
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.code === "KeyK") {
        event.preventDefault();
        event.stopImmediatePropagation();
        openSearch();
        return;
    }
    if (event.key !== "Enter" || !(event.target instanceof HTMLInputElement)) return;
    if (!event.target.closest('[class*="quickswitcher_"]') || !/^\s*global:/i.test(event.target.value)) return;
    const query = event.target.value;
    event.preventDefault();
    event.stopImmediatePropagation();
    FluxDispatcher.dispatch({ type: "QUICKSWITCHER_HIDE" });
    openSearch(query);
}

export default definePlugin({
    name: "GlobalServerSearch",
    description: "Search message contents across joined servers using global:query, with server, author, date and attachment filters.",
    authors: [{ name: "StuxFian", id: 0n }],
    start() {
        addServerListElement(ServerListRenderPosition.Above, SearchButton);
        document.addEventListener("keydown", handleSearchKey, true);
    },
    stop() {
        removeServerListElement(ServerListRenderPosition.Above, SearchButton);
        document.removeEventListener("keydown", handleSearchKey, true);
        closeModal(modalKey);
    }
});
