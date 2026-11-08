import { createClient } from '@supabase/supabase-js';

type Reply = { status: number; body?: unknown } | 'offline' | 'hang';
type RecordedRequest = { url: string; method: string; body: unknown };

const STORAGE_KEY = 'test.auth';

export const RIDER_ID = '00000000-0000-0000-0000-00000000000a';

const VERSIONED = new Map([['x-supabase-api-version', '2024-01-01']]);

/** Runs the real Supabase client against scripted HTTP answers. */
export function fakeSupabaseServer() {
  const requests: RecordedRequest[] = [];
  const stored = new Map<string, string>();
  let reply: Reply = { status: 200, body: {} };

  const fakeFetch = async (input: unknown, init?: { method?: string; body?: unknown }) => {
    requests.push({
      url: String(input),
      method: init?.method ?? 'GET',
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    if (reply === 'offline') {
      throw new TypeError('Network request failed');
    }
    if (reply === 'hang') {
      return new Promise<never>(() => undefined);
    }
    const text = reply.body === undefined ? '' : JSON.stringify(reply.body);
    const { status } = reply;
    return {
      ok: status >= 200 && status < 300,
      status,
      statusText: String(status),
      headers: { get: (name: string) => VERSIONED.get(name.toLowerCase()) ?? null },
      json: async () => JSON.parse(text),
      text: async () => text,
    } as unknown as Response;
  };

  const client = createClient('https://brops-test.supabase.co', 'public-anon-key', {
    global: { fetch: fakeFetch as typeof fetch },
    auth: {
      storageKey: STORAGE_KEY,
      storage: {
        getItem: async (key) => stored.get(key) ?? null,
        setItem: async (key, value) => void stored.set(key, value),
        removeItem: async (key) => void stored.delete(key),
      },
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return {
    client,
    requests,
    reply: (next: Reply) => {
      reply = next;
    },
    hasStoredSession: () => stored.has(STORAGE_KEY),
    storeSession: ({ expiresIn }: { expiresIn: number }) => {
      stored.set(STORAGE_KEY, JSON.stringify(sessionBody(expiresIn)));
    },
  };
}

export function sessionBody(expiresIn = 3600) {
  return {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
    token_type: 'bearer',
    expires_in: expiresIn,
    expires_at: Math.round(Date.now() / 1000) + expiresIn,
    user: { id: RIDER_ID, aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '' },
  };
}
