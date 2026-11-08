import type { DisplayName } from './DisplayName';
import type { Profile, RiderId } from './Profile';

export type ProfileLookup =
  | { status: 'found'; profile: Profile }
  | { status: 'missing' }
  | { status: 'unavailable' };

export interface ProfileRepository {
  /** 'missing' only when the server answered that there is no profile. */
  findByRider(riderId: RiderId): Promise<ProfileLookup>;
  /** A profile that already exists counts as created, and is left unchanged. */
  create(riderId: RiderId, displayName: DisplayName): Promise<'created' | 'unavailable'>;
}
