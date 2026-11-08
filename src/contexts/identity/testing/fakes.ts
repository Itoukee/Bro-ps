import type {
  AuthGateway,
  CodeRequestOutcome,
  CodeVerificationOutcome,
  CurrentRider,
} from '../domain/AuthGateway';
import type { DisplayName } from '../domain/DisplayName';
import type { Email } from '../domain/Email';
import type { LoginCode } from '../domain/LoginCode';
import type { RiderId } from '../domain/Profile';
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
  private names = new Map<RiderId, DisplayName>();

  add(riderId: RiderId, displayName: string) {
    this.names.set(riderId, displayName as DisplayName);
  }

  async findByRider(riderId: RiderId): Promise<ProfileLookup> {
    if (this.unavailable) {
      return { status: 'unavailable' };
    }
    const displayName = this.names.get(riderId);
    return displayName === undefined
      ? { status: 'missing' }
      : { status: 'found', profile: { riderId, displayName } };
  }

  async create(riderId: RiderId, displayName: DisplayName) {
    if (this.unavailable) {
      return 'unavailable' as const;
    }
    if (!this.names.has(riderId)) {
      this.names.set(riderId, displayName);
    }
    return 'created' as const;
  }
}
