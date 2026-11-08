import type { SupabaseClient } from '@supabase/supabase-js';

import { withDeadline } from './withDeadline';
import type { DisplayName } from '../domain/DisplayName';
import type { RiderId } from '../domain/Profile';
import type { ProfileLookup, ProfileRepository } from '../domain/ProfileRepository';

const UNIQUE_VIOLATION = '23505';

type ProfileRow = { id: RiderId; display_name: DisplayName };

export function createSupabaseProfileRepository(client: SupabaseClient): ProfileRepository {
  const readProfile = async (riderId: RiderId): Promise<ProfileLookup> => {
    const { data, error } = await client
      .from('profiles')
      .select('id, display_name')
      .eq('id', riderId)
      .returns<ProfileRow[]>()
      .maybeSingle()
      // Offline, the built-in retries would hold a blank screen for 7 seconds.
      // The retry screen hands that decision to the rider instead.
      .retry(false);
    if (error !== null) {
      return { status: 'unavailable' };
    }
    return data === null
      ? { status: 'missing' }
      : { status: 'found', profile: { riderId: data.id, displayName: data.display_name } };
  };

  return {
    findByRider(riderId) {
      return withDeadline(
        readProfile(riderId).catch((): ProfileLookup => ({ status: 'unavailable' })),
        { status: 'unavailable' },
      );
    },

    async create(riderId, displayName) {
      try {
        const { error } = await client
          .from('profiles')
          .insert({ id: riderId, display_name: displayName });
        return error === null || error.code === UNIQUE_VIOLATION ? 'created' : 'unavailable';
      } catch {
        return 'unavailable';
      }
    },
  };
}
