import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800;
const MANIFEST_SUFFIX = '.__manifest';
const secureOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

type SecureStorage = Pick<
  typeof SecureStore,
  'getItemAsync' | 'setItemAsync' | 'deleteItemAsync'
>;

type LegacyStorage = Pick<
  typeof AsyncStorage,
  'getItem' | 'setItem' | 'removeItem'
>;

function chunkKey(key: string, index: number) {
  return `${key}.__chunk.${index}`;
}

export function createSecureStorage(
  secure: SecureStorage = SecureStore,
  legacy: LegacyStorage = AsyncStorage,
) {
  async function removeLegacyValue(key: string) {
    try {
      await legacy.removeItem(key);
    } catch {
      // A later secure read/write retries cleanup without blocking auth.
    }
  }

  async function removeSecureValue(key: string) {
    const manifest = await secure.getItemAsync(`${key}${MANIFEST_SUFFIX}`);
    if (manifest) {
      const count = Number.parseInt(manifest, 10);
      await Promise.all(
        Array.from({ length: Number.isFinite(count) ? count : 0 }, (_, index) =>
          secure.deleteItemAsync(chunkKey(key, index)),
        ),
      );
    }
    await Promise.all([
      secure.deleteItemAsync(key),
      secure.deleteItemAsync(`${key}${MANIFEST_SUFFIX}`),
    ]);
  }

  async function setItem(key: string, value: string) {
    await removeSecureValue(key);
    if (value.length <= CHUNK_SIZE) {
      await secure.setItemAsync(key, value, secureOptions);
      await removeLegacyValue(key);
      return;
    }

    const chunks = Array.from(
      { length: Math.ceil(value.length / CHUNK_SIZE) },
      (_, index) => value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );
    await Promise.all(
      chunks.map((chunk, index) =>
        secure.setItemAsync(chunkKey(key, index), chunk, secureOptions),
      ),
    );
    await secure.setItemAsync(
      `${key}${MANIFEST_SUFFIX}`,
      String(chunks.length),
      secureOptions,
    );
    await removeLegacyValue(key);
  }

  async function getSecureValue(key: string) {
    const direct = await secure.getItemAsync(key);
    if (direct !== null) return direct;

    const manifest = await secure.getItemAsync(`${key}${MANIFEST_SUFFIX}`);
    if (!manifest) return null;
    const count = Number.parseInt(manifest, 10);
    if (!Number.isFinite(count) || count < 1) return null;
    const chunks = await Promise.all(
      Array.from({ length: count }, (_, index) =>
        secure.getItemAsync(chunkKey(key, index)),
      ),
    );
    return chunks.every((chunk): chunk is string => chunk !== null)
      ? chunks.join('')
      : null;
  }

  return {
    async getItem(key: string) {
      const secured = await getSecureValue(key);
      if (secured !== null) {
        await removeLegacyValue(key);
        return secured;
      }

      const legacyValue = await legacy.getItem(key);
      if (legacyValue === null) return null;
      await setItem(key, legacyValue);
      return legacyValue;
    },
    setItem,
    async removeItem(key: string) {
      await Promise.all([removeSecureValue(key), legacy.removeItem(key)]);
    },
  };
}

export const secureSessionStorage = createSecureStorage();
