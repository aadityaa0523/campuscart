import { useEffect } from "react";
import { io, type Socket } from "socket.io-client";
import { useQueryClient } from "@tanstack/react-query";
import { tokenStore } from "./tokenStore";
import { BASE_URL } from "./client";
import { groupKey } from "./hooks";

let socket: Socket | undefined;

async function getSocket(): Promise<Socket> {
  if (socket?.connected) return socket;
  const token = await tokenStore.getAccessToken();
  socket = io(BASE_URL, { auth: { token }, transports: ["websocket"] });
  return socket;
}

/** Replaces the reference app's 3-second polling (spec §9/§8): subscribes
 * to this group's room and invalidates the query cache the instant the
 * backend broadcasts a change, so useGroup's refetchInterval is just a
 * safety net for a missed event, not the primary update path. */
export function useGroupRealtime(groupId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!groupId) return;
    let cancelled = false;
    let activeSocket: Socket | undefined;

    getSocket().then((s) => {
      if (cancelled) return;
      activeSocket = s;
      s.emit("group:subscribe", groupId);
      const invalidate = () => qc.invalidateQueries({ queryKey: groupKey(groupId) });
      s.on("group:update", invalidate);
      s.on("contribution:update", invalidate);
      s.on("group:disputed", invalidate);
    });

    return () => {
      cancelled = true;
      activeSocket?.emit("group:unsubscribe", groupId);
      activeSocket?.off("group:update");
      activeSocket?.off("contribution:update");
      activeSocket?.off("group:disputed");
    };
  }, [groupId, qc]);
}
