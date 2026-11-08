import {
  isAuthApiError,
  isAuthRetryableFetchError,
  type AuthError,
  type SupabaseClient,
} from '@supabase/supabase-js';

import { withDeadline } from './withDeadline';
import type {
  AuthGateway,
  CodeRequestOutcome,
  CodeVerificationOutcome,
  CurrentRider,
} from '../domain/AuthGateway';
import type { Email } from '../domain/Email';
import type { LoginCode } from '../domain/LoginCode';
import type { RiderId } from '../domain/Profile';

// Limits requests per IP address before any account is looked up, so telling
// the rider about it reveals nothing about the email they typed.
const REQUEST_LIMIT_CODE = 'over_request_rate_limit';

// The Auth server answers 500 when it fails to send the email, which can only
// happen for a known account. The client files it under network errors.
const MAIL_FAILURE_STATUS = 500;

export function createSupabaseAuthGateway(auth: SupabaseClient['auth']): AuthGateway {
  return {
    async requestLoginCode(email: Email): Promise<CodeRequestOutcome> {
      try {
        const { error } = await auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false },
        });
        return codeRequestOutcome(error);
      } catch {
        return 'unreachable';
      }
    },

    async verifyLoginCode(email: Email, code: LoginCode): Promise<CodeVerificationOutcome> {
      try {
        const { error } = await auth.verifyOtp({ email, token: code, type: 'email' });
        if (error === null) {
          return 'verified';
        }
        if (isAuthRetryableFetchError(error)) {
          return 'unreachable';
        }
        return error.code === REQUEST_LIMIT_CODE ? 'rate-limited' : 'rejected';
      } catch {
        return 'unreachable';
      }
    },

    currentRider() {
      // Offline, the client retries an expired session for about 30 seconds.
      return withDeadline(readCurrentRider(auth), { status: 'unavailable' });
    },

    onSignedOut(listener: () => void) {
      const { data } = auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
          listener();
        }
      });
      return () => data.subscription.unsubscribe();
    },
  };
}

/**
 * Everything the server answers about the account is 'accepted'. Only failures
 * that cannot depend on the email are surfaced: known emails also meet the per
 * email send limit and mail delivery errors, while unknown emails never do.
 */
function codeRequestOutcome(error: AuthError | null): CodeRequestOutcome {
  if (error === null) {
    return 'accepted';
  }
  if (isAuthRetryableFetchError(error) && error.status !== MAIL_FAILURE_STATUS) {
    return 'unreachable';
  }
  return error.code === REQUEST_LIMIT_CODE ? 'rate-limited' : 'accepted';
}

async function readCurrentRider(auth: SupabaseClient['auth']): Promise<CurrentRider> {
  try {
    const { data, error } = await auth.getSession();
    if (error !== null) {
      const refused = isAuthApiError(error) && error.status >= 400 && error.status < 500;
      return { status: refused ? 'signed-out' : 'unavailable' };
    }
    return data.session === null
      ? { status: 'signed-out' }
      : { status: 'signed-in', riderId: data.session.user.id as RiderId };
  } catch {
    return { status: 'unavailable' };
  }
}
