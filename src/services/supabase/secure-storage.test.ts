import { createSecureStorage } from './secure-storage';

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

function memoryStore(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItemAsync: jest.fn(async (key: string) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key: string, value: string) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key: string) => {
      values.delete(key);
    }),
  };
}

describe('secure Supabase session storage', () => {
  it('migrates a legacy AsyncStorage session into SecureStore', async () => {
    const secure = memoryStore();
    const legacy = {
      getItem: jest.fn().mockResolvedValue('legacy-session'),
      setItem: jest.fn(),
      removeItem: jest.fn().mockResolvedValue(undefined),
    };
    const storage = createSecureStorage(secure, legacy);

    await expect(storage.getItem('supabase-session')).resolves.toBe(
      'legacy-session',
    );
    expect(secure.setItemAsync).toHaveBeenCalledWith(
      'supabase-session',
      'legacy-session',
      expect.anything(),
    );
    expect(legacy.removeItem).toHaveBeenCalledWith('supabase-session');
  });

  it('round-trips sessions larger than one SecureStore value', async () => {
    const secure = memoryStore();
    const legacy = {
      getItem: jest.fn().mockResolvedValue(null),
      setItem: jest.fn(),
      removeItem: jest.fn(),
    };
    const storage = createSecureStorage(secure, legacy);
    const session = 'x'.repeat(5000);

    await storage.setItem('supabase-session', session);

    await expect(storage.getItem('supabase-session')).resolves.toBe(session);
    expect(secure.setItemAsync).toHaveBeenCalledWith(
      'supabase-session.__manifest',
      expect.any(String),
      expect.anything(),
    );
  });
});
