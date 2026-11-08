import type { SupabaseClient } from '@supabase/supabase-js';

import { withDeadline } from './withDeadline';
import type { DisplayName } from '../domain/DisplayName';
import {
  DEFAULT_DOT_APPEARANCE,
  parseDotAppearance,
  type DotAppearance,
} from '../domain/DotAppearance';
import type { RiderId } from '../domain/Profile';
import type { ProfileLookup, ProfileRepository } from '../domain/ProfileRepository';

const UNIQUE_VIOLATION = '23505';

type ProfileRow = {
  id: RiderId;
  display_name: DisplayName;
  dot_body_color: string;
  dot_helmet_color: string;
  dot_extra: string;
};

const dotColumns = (appearance: DotAppearance) => ({
  dot_body_color: appearance.bodyColor,
  dot_helmet_color: appearance.helmetColor,
  dot_extra: appearance.extra,
});

// A later version may add to the palette: an older app still shows a valid Dot.
const toDotAppearance = (row: ProfileRow) =>
  parseDotAppearance({
    bodyColor: row.dot_body_color,
    helmetColor: row.dot_helmet_color,
    extra: row.dot_extra,
  }) ?? DEFAULT_DOT_APPEARANCE;

export function createSupabaseProfileRepository(client: SupabaseClient): ProfileRepository {
  const readProfile = async (riderId: RiderId): Promise<ProfileLookup> => {
    const { data, error } = await client
      .from('profiles')
      .select('id, display_name, dot_body_color, dot_helmet_color, dot_extra')
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
      : {
          status: 'found',
          profile: {
            riderId: data.id,
            displayName: data.display_name,
            dotAppearance: toDotAppearance(data),
          },
        };
  };

  const writeDotAppearance = async (riderId: RiderId, appearance: DotAppearance) => {
    const { data, error } = await client
      .from('profiles')
      .update(dotColumns(appearance))
      .eq('id', riderId)
      .select('id');
    return error === null && data.length === 1 ? 'saved' : 'unavailable';
  };

  return {
    findByRider(riderId) {
      return withDeadline(
        readProfile(riderId).catch((): ProfileLookup => ({ status: 'unavailable' })),
        { status: 'unavailable' },
      );
    },

    async create(riderId, displayName, appearance) {
      try {
        const { error } = await client
          .from('profiles')
          .insert({ id: riderId, display_name: displayName, ...dotColumns(appearance) });
        return error === null || error.code === UNIQUE_VIOLATION ? 'created' : 'unavailable';
      } catch {
        return 'unavailable';
      }
    },

    updateDotAppearance(riderId, appearance) {
      return withDeadline<'saved' | 'unavailable'>(
        writeDotAppearance(riderId, appearance).catch(() => 'unavailable'),
        'unavailable',
      );
    },
  };
}
