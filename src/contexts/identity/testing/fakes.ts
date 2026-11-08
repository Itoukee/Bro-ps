import type {
  AuthGateway,
  CodeRequestOutcome,
  CodeVerificationOutcome,
  CurrentRider,
} from '../domain/AuthGateway';
import type { DisplayName } from '../domain/DisplayName';
import { DEFAULT_DOT_APPEARANCE, type DotAppearance } from '../domain/DotAppearance';
import type { Email } from '../domain/Email';
import type { LoginCode } from '../domain/LoginCode';
import type { Profile, RiderId } from '../domain/Profile';
import type { ProfileLookup, ProfileRepository } from '../domain/ProfileRepository';

export const RIDER_ID = '00000000-0000-0000-0000-00000000000a' as RiderId;

export class FakeAuthGateway implements AuthGateway {
  rider: CurrentRider = { status: 'signed-out' };
  codeRequestOutcome: CodeRequestOutcome = 'accepted';
  verificationOutcome: CodeVerificationOutcome = 'verified';
  codeRequests: Email[] = [];
  verifications: { email: Email; code: LoginCode }[] = [];
  private listeners = new Set<() => void>();

  signIn(riderId: RiderId = RIDER_ID) {
    this.rider = { status: 'signed-in', riderId };
  }

  emitSignedOut() {
    this.rider = { status: 'signed-out' };
    this.listeners.forEach((listener) => listener());
  }

  async requestLoginCode(email: Email) {
    this.codeRequests.push(email);
    return this.codeRequestOutcome;
  }

  async verifyLoginCode(email: Email, code: LoginCode) {
    this.verifications.push({ email, code });
    if (this.verificationOutcome === 'verified') {
      this.signIn();
    }
    return this.verificationOutcome;
  }

  async currentRider() {
    return this.rider;
  }

  onSignedOut(listener: () => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export class FakeProfileRepository implements ProfileRepository {
  unavailable = false;
  private profiles = new Map<RiderId, Profile>();

  add(
    riderId: RiderId,
    displayName: string,
    dotAppearance: DotAppearance = DEFAULT_DOT_APPEARANCE,
  ) {
    this.profiles.set(riderId, {
      riderId,
      displayName: displayName as DisplayName,
      dotAppearance,
    });
  }

  async findByRider(riderId: RiderId): Promise<ProfileLookup> {
    if (this.unavailable) {
      return { status: 'unavailable' };
    }
    const profile = this.profiles.get(riderId);
    return profile === undefined ? { status: 'missing' } : { status: 'found', profile };
  }

  async create(riderId: RiderId, displayName: DisplayName, dotAppearance: DotAppearance) {
    if (this.unavailable) {
      return 'unavailable' as const;
    }
    if (!this.profiles.has(riderId)) {
      this.profiles.set(riderId, { riderId, displayName, dotAppearance });
    }
    return 'created' as const;
  }

  async updateDotAppearance(riderId: RiderId, dotAppearance: DotAppearance) {
    const profile = this.profiles.get(riderId);
    if (this.unavailable || profile === undefined) {
      return 'unavailable' as const;
    }
    this.profiles.set(riderId, { ...profile, dotAppearance });
    return 'saved' as const;
  }
}
