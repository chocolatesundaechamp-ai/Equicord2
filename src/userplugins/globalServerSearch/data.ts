import { Channel } from "@vencord/discord-types";
import { ChannelStore, GuildStore, PermissionStore, UserGuildSettingsStore } from "@webpack/common";

import { ResultKind, SearchResult } from "./search";

const kinds: Record<number, ResultKind> = { 0: "text", 2: "voice", 5: "text", 10: "thread", 11: "thread", 12: "thread", 13: "voice", 15: "forum", 16: "forum" };

function channelResult(channel: Channel, guildName: string): SearchResult {
    return {
        id: channel.id,
        name: channel.name,
        guildId: channel.guild_id,
        guildName,
        category: ChannelStore.getChannel(channel.parent_id)?.name ?? "",
        kind: kinds[channel.type],
        muted: UserGuildSettingsStore.isGuildOrCategoryOrChannelMuted(channel.guild_id, channel.id)
    };
}

export function collectResults(): SearchResult[] {
    return Object.values(GuildStore.getGuilds()).flatMap(guild => {
        const server: SearchResult = {
            id: guild.id, name: guild.name, guildId: guild.id, guildName: guild.name,
            category: "", kind: "server", muted: UserGuildSettingsStore.isMuted(guild.id)
        };
        const channels = Object.values(ChannelStore.getMutableGuildChannelsForGuild(guild.id));
        const visible = channels.filter(channel => kinds[channel.type] && PermissionStore.can(1024n, channel));
        return [server, ...visible.map(channel => channelResult(channel, guild.name))];
    });
}
