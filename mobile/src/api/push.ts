import { useEffect } from "react";
import { Platform } from "react-native";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { api } from "./client";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

/** Registers this device for Expo push once, when a user is signed in.
 * Physical-device-only and silently no-ops on a simulator/denied
 * permission — push is a nice-to-have, never something that should block
 * or crash the app. */
export function usePushRegistration(enabled: boolean) {
  useEffect(() => {
    if (!enabled || !Device.isDevice) return;
    let cancelled = false;

    (async () => {
      const { status: existing } = await Notifications.getPermissionsAsync();
      let status = existing;
      if (status !== "granted") {
        ({ status } = await Notifications.requestPermissionsAsync());
      }
      if (status !== "granted" || cancelled) return;

      const { data: token } = await Notifications.getExpoPushTokenAsync();
      if (cancelled) return;
      await api.registerPushToken(token, Platform.OS === "ios" ? "ios" : "android").catch(() => {});
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled]);
}
