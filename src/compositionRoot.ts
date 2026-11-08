import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

import {
  createIdentityUseCases,
  type IdentityUseCases,
} from '@/contexts/identity/application/identityUseCases';
import { createSupabaseAuthGateway } from '@/contexts/identity/infrastructure/SupabaseAuthGateway';
import { createSupabaseProfileRepository } from '@/contexts/identity/infrastructure/SupabaseProfileRepository';

let identity: IdentityUseCases | undefined;

export function identityUseCases(): IdentityUseCases {
  identity ??= buildIdentityUseCases();
  return identity;
}

function buildIdentityUseCases() {
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error('Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.');
  }

  const client = createClient(url, anonKey, {
    auth: {
      storageKey: 'brops.auth',
      storage: {
        getItem: (key) => SecureStore.getItemAsync(key),
        setItem: (key, value) => SecureStore.setItemAsync(key, value),
        removeItem: (key) => SecureStore.deleteItemAsync(key),
      },
      persistSession: true,
      autoRefreshToken: true,
      // Links are untrusted input: a session never comes from a URL.
      detectSessionInUrl: false,
    },
  });

  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      void client.auth.startAutoRefresh();
    } else {
      void client.auth.stopAutoRefresh();
    }
  });

  return createIdentityUseCases({
    auth: createSupabaseAuthGateway(client.auth),
    profiles: createSupabaseProfileRepository(client),
  });
}
