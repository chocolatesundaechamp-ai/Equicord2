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

- Click **Find or start a conversation** on the Home page.
- Click the new magnifying glass above the server list.
- Press **Ctrl+Shift+K**, or **Cmd+Shift+K** on macOS.
- Hold Shift while clicking the original Home search button to use Discord's original quick switcher.

The Home button integration can be disabled in this plugin's settings. It depends on Discord's `searchBarComponent_` class, so if Discord changes it, use the dedicated button or shortcut.

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

Built against Equicord main commit `ab9b98472acb281cc7ec4d2c7a612219993bb3cb`. Full repository TypeScript check and standalone desktop build passed. Search tests passed. Live Discord interaction has not been tested in this environment.

Run the included tests with Node.js 22.18 or newer:

```sh
node --test src/userplugins/globalServerSearch/tests/search.test.mjs
```
