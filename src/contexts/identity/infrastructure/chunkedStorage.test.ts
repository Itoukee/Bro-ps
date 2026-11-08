import { createChunkedStorage, type KeyValueStore } from './chunkedStorage';

const BYTE_LIMIT = 2048;
const KEY = 'brops.auth';

class FakeStore implements KeyValueStore {
  entries = new Map<string, string>();
  writes: string[] = [];
  failWritesAfter = Infinity;
  largestValueInBytes = 0;

  async getItem(key: string) {
    return this.entries.get(key) ?? null;
  }

  async setItem(key: string, value: string) {
    if (this.failWritesAfter-- <= 0) {
      throw new Error('keystore failure');
    }
    this.largestValueInBytes = Math.max(
      this.largestValueInBytes,
      new TextEncoder().encode(value).length,
    );
    this.writes.push(key);
    this.entries.set(key, value);
  }

  async deleteItem(key: string) {
    this.entries.delete(key);
  }
}

const setup = () => {
  const store = new FakeStore();
  return { store, storage: createChunkedStorage(store) };
};

const large = 'a'.repeat(5000);

describe('chunked storage', () => {
  it('returns null for a key that was never written', async () => {
    const { storage } = setup();

    expect(await storage.getItem(KEY)).toBeNull();
  });

  it.each([
    ['a short value', 'session'],
    ['an empty value', ''],
    ['a value over the size limit', large],
    ['multi-byte characters', 'é€'.repeat(3000)],
  ])('reads back %s', async (_name, value) => {
    const { storage } = setup();

    await storage.setItem(KEY, value);

    expect(await storage.getItem(KEY)).toBe(value);
  });

  it('keeps every stored value within the size limit, even at 3 bytes a character', async () => {
    const { store, storage } = setup();

    await storage.setItem(KEY, '€'.repeat(5000));

    expect(store.largestValueInBytes).toBeLessThanOrEqual(BYTE_LIMIT);
  });

  it('never splits an emoji across two chunks', async () => {
    const { store, storage } = setup();
    const value = `a${'🏍'.repeat(2000)}`;

    await storage.setItem(KEY, value);

    expect(await storage.getItem(KEY)).toBe(value);
    const chunks = [...store.entries]
      .filter(([key]) => key !== KEY)
      .map(([, chunk]) => chunk);
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk) => expect(chunk.isWellFormed()).toBe(true));
  });

  it('writes the manifest last', async () => {
    const { store, storage } = setup();

    await storage.setItem(KEY, large);

    expect(store.writes.length).toBeGreaterThan(1);
    expect(store.writes.at(-1)).toBe(KEY);
  });

  it('keeps the previous value when a write fails halfway', async () => {
    const { store, storage } = setup();
    await storage.setItem(KEY, large);

    store.failWritesAfter = 2;
    await expect(storage.setItem(KEY, 'b'.repeat(5000))).rejects.toThrow('keystore failure');

    expect(await storage.getItem(KEY)).toBe(large);
  });

  it('removes the leftovers of an interrupted write on the next one', async () => {
    const { store, storage } = setup();
    store.failWritesAfter = 3;
    await expect(storage.setItem(KEY, 'b'.repeat(5000))).rejects.toThrow();
    store.failWritesAfter = Infinity;

    await storage.setItem(KEY, 'short');

    expect(await storage.getItem(KEY)).toBe('short');
    expect(store.entries.size).toBe(2);
  });

  it('leaves no chunk of the previous value behind after a shorter write', async () => {
    const { store, storage } = setup();
    await storage.setItem(KEY, large);

    await storage.setItem(KEY, 'short');

    expect(store.entries.size).toBe(2);
  });

  it('still reports success when clearing the previous value fails', async () => {
    const { store, storage } = setup();
    await storage.setItem(KEY, large);
    jest.spyOn(store, 'deleteItem').mockRejectedValue(new Error('keystore failure'));

    await expect(storage.setItem(KEY, 'short')).resolves.toBeUndefined();

    expect(await storage.getItem(KEY)).toBe('short');
  });

  it('serializes concurrent writes so the last call wins', async () => {
    const { storage } = setup();

    await Promise.all([
      storage.setItem(KEY, 'a'.repeat(4000)),
      storage.setItem(KEY, 'b'.repeat(1000)),
      storage.setItem(KEY, 'c'.repeat(3000)),
    ]);

    expect(await storage.getItem(KEY)).toBe('c'.repeat(3000));
  });

  it('never exposes a half written value to a concurrent read', async () => {
    const { storage } = setup();
    await storage.setItem(KEY, large);

    const [, read] = await Promise.all([
      storage.setItem(KEY, 'b'.repeat(5000)),
      storage.getItem(KEY),
    ]);

    expect(read).toBe('b'.repeat(5000));
  });

  it('keeps working after a failed write', async () => {
    const { store, storage } = setup();
    store.failWritesAfter = 0;
    await expect(storage.setItem(KEY, 'lost')).rejects.toThrow();
    store.failWritesAfter = Infinity;

    await storage.setItem(KEY, 'kept');

    expect(await storage.getItem(KEY)).toBe('kept');
  });

  it('removes the value and every chunk', async () => {
    const { store, storage } = setup();
    await storage.setItem(KEY, large);

    await storage.removeItem(KEY);

    expect(await storage.getItem(KEY)).toBeNull();
    expect(store.entries.size).toBe(0);
  });

  it('removes the manifest first, so a failed cleanup cannot resurrect the value', async () => {
    const { store, storage } = setup();
    await storage.setItem(KEY, large);
    const deleteItem = store.deleteItem.bind(store);
    jest.spyOn(store, 'deleteItem').mockImplementation(async (key) => {
      if (key !== KEY) {
        throw new Error('keystore failure');
      }
      await deleteItem(key);
    });

    await expect(storage.removeItem(KEY)).rejects.toThrow('keystore failure');

    expect(await storage.getItem(KEY)).toBeNull();
  });

  it('treats a corrupt manifest as no value', async () => {
    const { store, storage } = setup();
    store.entries.set(KEY, 'not json');

    expect(await storage.getItem(KEY)).toBeNull();
  });

  it('treats a missing chunk as no value', async () => {
    const { store, storage } = setup();
    await storage.setItem(KEY, large);
    const chunkKey = [...store.entries.keys()].find((key) => key !== KEY)!;
    store.entries.delete(chunkKey);

    expect(await storage.getItem(KEY)).toBeNull();
  });

  it('only uses keys the secure store accepts', async () => {
    const { store, storage } = setup();

    await storage.setItem(KEY, large);

    [...store.entries.keys()].forEach((key) => expect(key).toMatch(/^[\w.-]+$/));
  });
});
