import type { AuthGateway, CodeVerificationOutcome } from '../domain/AuthGateway';
import { parseDisplayName } from '../domain/DisplayName';
import type { Email } from '../domain/Email';
import { parseEmail } from '../domain/Email';
import { parseLoginCode } from '../domain/LoginCode';
import type { Profile, RiderId } from '../domain/Profile';
import type { ProfileRepository } from '../domain/ProfileRepository';

export type CodeRequestResult =
  | { status: 'accepted'; email: Email }
  | { status: 'invalid-email' | 'rate-limited' | 'unreachable' };

export type CodeVerificationResult = { status: CodeVerificationOutcome | 'invalid-code' };

export type RiderAccess =
  | { status: 'signed-out' }
  | { status: 'unavailable' }
  | { status: 'needs-profile'; riderId: RiderId }
  | { status: 'ready'; profile: Profile };

export type ProfileCreationResult = { status: 'created' | 'invalid-name' | 'unavailable' };

export type IdentityUseCases = ReturnType<typeof createIdentityUseCases>;

export function createIdentityUseCases({
  auth,
  profiles,
}: {
  auth: AuthGateway;
  profiles: ProfileRepository;
}) {
  return {
    async requestLoginCode(rawEmail: string): Promise<CodeRequestResult> {
      const email = parseEmail(rawEmail);
      if (email === null) {
        return { status: 'invalid-email' };
      }
      const outcome = await auth.requestLoginCode(email);
      return outcome === 'accepted' ? { status: 'accepted', email } : { status: outcome };
    },

    async verifyLoginCode(email: Email, rawCode: string): Promise<CodeVerificationResult> {
      const code = parseLoginCode(rawCode);
      if (code === null) {
        return { status: 'invalid-code' };
      }
      return { status: await auth.verifyLoginCode(email, code) };
    },

    async resolveRiderAccess(): Promise<RiderAccess> {
      const rider = await auth.currentRider();
      if (rider.status !== 'signed-in') {
        return rider;
      }
      const lookup = await profiles.findByRider(rider.riderId);
      switch (lookup.status) {
        case 'found':
          return { status: 'ready', profile: lookup.profile };
        case 'missing':
          return { status: 'needs-profile', riderId: rider.riderId };
        case 'unavailable':
          return { status: 'unavailable' };
      }
    },

    async createProfile(riderId: RiderId, rawName: string): Promise<ProfileCreationResult> {
      const displayName = parseDisplayName(rawName);
      if (displayName === null) {
        return { status: 'invalid-name' };
      }
      return { status: await profiles.create(riderId, displayName) };
    },

    onSignedOut(listener: () => void) {
      return auth.onSignedOut(listener);
    },
  };
}
