export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
};

type Slot = 'a' | 'b';
type Manifest = { slot: Slot; chunks: number };

// Budget of 2048 bytes per stored value. A UTF-16 code unit takes at most 3
// bytes in UTF-8, so 682 of them always fit, whatever the value contains.
const MAX_CHUNK_UNITS = 682;

/**
 * Stores a value across several entries of a small key-value store.
 *
 * Chunks are written to the slot the current manifest does not use, and the
 * manifest is written last. That single write is the commit, so a failure at
 * any earlier point leaves the previous value readable. Operations run one at
 * a time, so a read never sees a value that is being replaced.
 */
export function createChunkedStorage(store: KeyValueStore) {
  let tail: Promise<unknown> = Promise.resolve();

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const result = tail.then(operation);
    tail = result.catch(() => undefined);
    return result;
  };

  const chunkKey = (key: string, slot: Slot, index: number) => `${key}.${slot}.${index}`;

  const readManifest = async (key: string): Promise<Manifest | null> => {
    const raw = await store.getItem(key);
    if (raw === null) {
      return null;
    }
    try {
      const parsed = JSON.parse(raw) as Partial<Manifest>;
      const valid =
        (parsed.slot === 'a' || parsed.slot === 'b') &&
        Number.isInteger(parsed.chunks) &&
        (parsed.chunks as number) >= 0;
      return valid ? (parsed as Manifest) : null;
    } catch {
      return null;
    }
  };

  // Deletes from the last chunk down, so an interrupted clear can be resumed:
  // the count below stops at the first missing chunk.
  const clearSlot = async (key: string, slot: Slot) => {
    let count = 0;
    while ((await store.getItem(chunkKey(key, slot, count))) !== null) {
      count += 1;
    }
    for (let index = count - 1; index >= 0; index -= 1) {
      await store.deleteItem(chunkKey(key, slot, index));
    }
  };

  const read = async (key: string) => {
    const manifest = await readManifest(key);
    if (manifest === null) {
      return null;
    }
    let value = '';
    for (let index = 0; index < manifest.chunks; index += 1) {
      const chunk = await store.getItem(chunkKey(key, manifest.slot, index));
      if (chunk === null) {
        return null;
      }
      value += chunk;
    }
    return value;
  };

  const write = async (key: string, value: string) => {
    const current = await readManifest(key);
    const slot: Slot = current?.slot === 'a' ? 'b' : 'a';
    await clearSlot(key, slot);

    const chunks = split(value);
    for (const [index, chunk] of chunks.entries()) {
      await store.setItem(chunkKey(key, slot, index), chunk);
    }
    await store.setItem(key, JSON.stringify({ slot, chunks: chunks.length } satisfies Manifest));

    if (current !== null) {
      // The new value is committed. Stale chunks are cleared by a later write.
      await clearSlot(key, current.slot).catch(() => undefined);
    }
  };

  const remove = async (key: string) => {
    await store.deleteItem(key);
    await clearSlot(key, 'a');
    await clearSlot(key, 'b');
  };

  return {
    getItem: (key: string) => enqueue(() => read(key)),
    setItem: (key: string, value: string) => enqueue(() => write(key, value)),
    removeItem: (key: string) => enqueue(() => remove(key)),
  };
}

function split(value: string) {
  const chunks: string[] = [];
  let start = 0;
  while (start < value.length) {
    let end = Math.min(start + MAX_CHUNK_UNITS, value.length);
    if (end < value.length && isHighSurrogate(value.charCodeAt(end - 1))) {
      end -= 1;
    }
    chunks.push(value.slice(start, end));
    start = end;
  }
  return chunks;
}

function isHighSurrogate(codeUnit: number) {
  return codeUnit >= 0xd800 && codeUnit <= 0xdbff;
}
