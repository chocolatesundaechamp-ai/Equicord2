# Global Server Search

A custom Equicord plugin that searches channel and server names across all servers you have joined. Type `casino` to find matching names instantly.

## Installation

This is a source plugin for a custom Equicord build. It cannot be imported into the Plugins settings page as a ZIP.

1. Use an Equicord source checkout with Node.js 22 or newer and pnpm installed.
2. Copy the entire `globalServerSearch` folder into `src/userplugins/`. The final path must be `src/userplugins/globalServerSearch/index.tsx`.
3. From the Equicord root, run:

```sh
pnpm install
pnpm build
pnpm inject
```

4. Restart Discord, open Equicord Settings > Plugins, and enable **GlobalServerSearch**.

If you use Equibop or a browser build, follow Equicord's installation instructions for that client instead of `pnpm inject`.

## Opening search

- Open Discord's normal quick switcher with Ctrl+K or the Home page's Find or start a conversation button. Type `global:casino` to search channel and server names across every joined server.
- The `global:` prefix is case insensitive. Type `global:` by itself to list all available names. Ordinary queries keep Discord's regular search behavior.
- Click the magnifying glass above the server list, or press Ctrl+Shift+K (Cmd+Shift+K on macOS), to open the separate window with filters. It also accepts `global:casino`.
- Rebuild and restart Discord after updating. Enable GlobalServerSearch and restart once more if you enabled it after launch, because the native quick switcher integration uses a startup patch.
- Disable FrequentQuickSwitcher if enabled because it also replaces the native quick switcher's result list.

## Filters

- Select all servers or a specific server.
- Show all results, servers, text channels, voice/stage channels, forum/media channels, or threads.
- Hide muted servers and channels, including channels inside muted categories.
- Match the exact name or search for words anywhere in the name.
- Sort by best match, name, or server.
- Reset filters without deleting the search query.

Names match without regard to case. Spaces, hyphens and underscores are treated alike. A leading `#` is optional. Each result shows its server and parent category. Click to open it, press Enter to open the first match, or use Tab to navigate result buttons. Voice results open the channel without joining a call.

## Scope

Search uses Discord's locally loaded server and channel stores and respects channel visibility permissions. It does not search message contents. Threads appear only if Discord has loaded them. The list displays 100 results at a time, with a button to show more.

## Validation

Built against Equicord main commit `ab9b98472acb281cc7ec4d2c7a612219993bb3cb`. Full repository TypeScript check and standalone desktop build passed. All 17 search tests passed. The global prefix integration follows the quick switcher patch used by existing Equicord plugins. Live Discord interaction has not been tested in this environment.

Run the included tests with Node.js 22.18 or newer:

```sh
node --test src/userplugins/globalServerSearch/tests/search.test.mjs
```
