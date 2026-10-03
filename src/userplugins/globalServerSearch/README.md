# GlobalServerSearch

Search other people's message contents across all servers you have joined. For example, `global:casino` searches messages containing `casino`. Without an author filter, messages from anyone, including you and bots, can appear.

## Install or update

1. Replace your existing `src/userplugins/globalServerSearch` folder with the `globalServerSearch` folder from this archive.
2. In the Equicord source folder, run `pnpm install` and `pnpm build`.
3. If this source checkout is not already installed into Discord, run `pnpm inject` and choose your Discord installation.
4. Fully quit Discord, including its tray process, and reopen it.
5. Enable **GlobalServerSearch** in Equicord's plugin settings.

VS Code having the source file does not mean Discord is running that build. Build the same checkout that you injected into Discord.

## Use

Press **Ctrl+K**, type **global:casino**, and press **Enter**. The global message search window opens and starts searching.

You can also use the search button above the server list or **Ctrl+Shift+K** (**Cmd+Shift+K** on macOS). Enter a word or phrase and click **Search**.

Results show the author, message contents, server, channel, and date. Click **Jump to message** to open the original message.

Filters include:

- Server: all joined servers or one selected server.
- Author ID: anyone by default, or one numeric Discord user ID.
- Channel ID: one channel within a selected server.
- From date: inclusive, using your local timezone.
- Before date: exclusive, using your local timezone.
- Contains: images, videos, links, files, or embeds.
- Sort: newest or oldest first.

Enable Discord Developer Mode and use **Copy User ID** or **Copy Channel ID** for the ID filters. Change filters and click **Search** to apply them.

## Search behavior

Discord provides message search per server. This plugin searches each joined server sequentially and combines the results. The first pass loads up to 25 matches per server. Use **Load more messages from remaining servers** for subsequent pages. Large server lists take time.

Only messages your account can access can appear. Direct messages and servers you have not joined are excluded. Discord's search index and permission checks determine availability. A server failure appears in the search status and does not stop the other servers.

The plugin respects Discord's retry delays, bounds retries, and lets you stop searching. Stopping or closing the window discards any unfinished response and prevents further requests. Loaded messages stay visible after Stop. Searches approaching Discord's pagination limit need narrower filters.

Messages display as plain text with attachment filenames and embed text. Use Jump to message for Discord's full rendering.

## Verification

From the Equicord source folder:

```sh
node --import tsx --test src/userplugins/globalServerSearch/tests/messages.test.ts
pnpm exec tsc --noEmit
pnpm buildStandalone
```

The tests cover message queries, filters, cross-server requests, pagination, context exclusion, indexing retries, rate limits, permission failures, and cancellation. Live Discord behavior must be checked after installing the build.
