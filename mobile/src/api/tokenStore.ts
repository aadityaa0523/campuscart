// Tokens live in the OS keychain/keystore via expo-secure-store — never
// AsyncStorage, which is unencrypted on-device plaintext.
import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "campuscart.accessToken";
const REFRESH_KEY = "campuscart.refreshToken";

export const tokenStore = {
  async save(accessToken: string, refreshToken: string) {
    await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
  },
  async getAccessToken() {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefreshToken() {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};
