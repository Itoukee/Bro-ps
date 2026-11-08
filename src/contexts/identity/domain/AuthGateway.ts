import type { Email } from './Email';
import type { LoginCode } from './LoginCode';
import type { RiderId } from './Profile';

/**
 * 'accepted' is the only answer for anything that depends on the account, so
 * that known and unknown emails cannot be told apart.
 */
export type CodeRequestOutcome = 'accepted' | 'rate-limited' | 'unreachable';

export type CodeVerificationOutcome = 'verified' | 'rejected' | 'rate-limited' | 'unreachable';

export type CurrentRider =
  | { status: 'signed-in'; riderId: RiderId }
  | { status: 'signed-out' }
  | { status: 'unavailable' };

export interface AuthGateway {
  requestLoginCode(email: Email): Promise<CodeRequestOutcome>;
  verifyLoginCode(email: Email, code: LoginCode): Promise<CodeVerificationOutcome>;
  /** Being offline is 'unavailable', never 'signed-out'. */
  currentRider(): Promise<CurrentRider>;
  onSignedOut(listener: () => void): () => void;
}
