import { createSupabaseAuthGateway } from './SupabaseAuthGateway';
import { fakeSupabaseServer, RIDER_ID, sessionBody } from '../testing/supabaseFakeServer';
import { parseEmail } from '../domain/Email';
import { parseLoginCode } from '../domain/LoginCode';

const email = parseEmail('ana@example.com')!;
const code = parseLoginCode('123456')!;

const setup = () => {
  const server = fakeSupabaseServer();
  return { server, gateway: createSupabaseAuthGateway(server.client.auth) };
};

const apiError = (status: number, errorCode: string) => ({
  status,
  body: { code: errorCode, message: 'server message' },
});

describe('requesting a login code', () => {
  it('never lets the server create an account', async () => {
    const { server, gateway } = setup();

    await gateway.requestLoginCode(email);

    expect(server.requests).toHaveLength(1);
    expect(server.requests[0]!.url).toContain('/auth/v1/otp');
    expect(server.requests[0]!.body).toMatchObject({ email, create_user: false });
  });

  it('accepts a known email', async () => {
    const { gateway } = setup();

    expect(await gateway.requestLoginCode(email)).toBe('accepted');
  });

  it.each([
    ['an unknown email', 422, 'otp_disabled'],
    ['closed signups', 422, 'signup_disabled'],
    ['an unconfirmed account', 400, 'user_not_found'],
    ['the per email send limit, which only known emails can reach', 429, 'over_email_send_rate_limit'],
    ['a mail delivery failure, which only known emails can reach', 500, 'unexpected_failure'],
  ])('answers %s exactly like a known email', async (_name, status, errorCode) => {
    const { server, gateway } = setup();
    server.reply(apiError(status, errorCode));

    expect(await gateway.requestLoginCode(email)).toBe('accepted');
  });

  it('reports the per address request limit, which does not depend on the account', async () => {
    const { server, gateway } = setup();
    server.reply(apiError(429, 'over_request_rate_limit'));

    expect(await gateway.requestLoginCode(email)).toBe('rate-limited');
  });

  it('reports a phone that is offline', async () => {
    const { server, gateway } = setup();
    server.reply('offline');

    expect(await gateway.requestLoginCode(email)).toBe('unreachable');
  });

  it('reports a gateway that is down', async () => {
    const { server, gateway } = setup();
    server.reply({ status: 503 });

    expect(await gateway.requestLoginCode(email)).toBe('unreachable');
  });
});

describe('verifying a login code', () => {
  it('exchanges the code for a session and keeps it', async () => {
    const { server, gateway } = setup();
    server.reply({ status: 200, body: sessionBody() });

    expect(await gateway.verifyLoginCode(email, code)).toBe('verified');

    expect(server.requests[0]!.url).toContain('/auth/v1/verify');
    expect(server.requests[0]!.body).toMatchObject({ email, token: code, type: 'email' });
    expect(server.hasStoredSession()).toBe(true);
  });

  it('rejects a wrong or expired code, and a code for an unknown email', async () => {
    const { server, gateway } = setup();
    server.reply(apiError(403, 'otp_expired'));

    expect(await gateway.verifyLoginCode(email, code)).toBe('rejected');
  });

  it('reports the request limit', async () => {
    const { server, gateway } = setup();
    server.reply(apiError(429, 'over_request_rate_limit'));

    expect(await gateway.verifyLoginCode(email, code)).toBe('rate-limited');
  });

  it('reports a phone that is offline', async () => {
    const { server, gateway } = setup();
    server.reply('offline');

    expect(await gateway.verifyLoginCode(email, code)).toBe('unreachable');
  });
});

describe('finding the current rider', () => {
  afterEach(() => jest.useRealTimers());

  it('is signed out with no stored session', async () => {
    const { gateway } = setup();

    expect(await gateway.currentRider()).toEqual({ status: 'signed-out' });
  });

  it('restores a stored session without calling the server', async () => {
    const { server, gateway } = setup();
    server.storeSession({ expiresIn: 3600 });

    expect(await gateway.currentRider()).toEqual({ status: 'signed-in', riderId: RIDER_ID });
    expect(server.requests).toEqual([]);
  });

  it('refreshes an expired session', async () => {
    const { server, gateway } = setup();
    server.storeSession({ expiresIn: -60 });
    server.reply({ status: 200, body: sessionBody() });

    expect(await gateway.currentRider()).toEqual({ status: 'signed-in', riderId: RIDER_ID });
  });

  it('gives up on an expired session offline within seconds, and keeps it', async () => {
    jest.useFakeTimers();
    const { server, gateway } = setup();
    server.storeSession({ expiresIn: -60 });
    server.reply('offline');

    const rider = gateway.currentRider();
    await jest.advanceTimersByTimeAsync(8_000);

    expect(await rider).toEqual({ status: 'unavailable' });
    expect(server.hasStoredSession()).toBe(true);
  });

  it('signs out when the server refuses the refresh token', async () => {
    const { server, gateway } = setup();
    server.storeSession({ expiresIn: -60 });
    server.reply(apiError(400, 'refresh_token_not_found'));

    expect(await gateway.currentRider()).toEqual({ status: 'signed-out' });
  });
});

describe('sign out notifications', () => {
  it('fires on sign out only, until unsubscribed', async () => {
    const { server, gateway } = setup();
    server.storeSession({ expiresIn: 3600 });
    const listener = jest.fn();
    const unsubscribe = gateway.onSignedOut(listener);

    await gateway.currentRider();
    expect(listener).not.toHaveBeenCalled();

    server.reply({ status: 204 });
    await server.client.auth.signOut();
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    await server.client.auth.signOut();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
