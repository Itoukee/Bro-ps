import { createIdentityUseCases } from './identityUseCases';
import { DEFAULT_DOT_APPEARANCE, type DotAppearance } from '../domain/DotAppearance';
import { parseEmail } from '../domain/Email';
import { FakeAuthGateway, FakeProfileRepository, RIDER_ID } from '../testing/fakes';

const chosenDot: DotAppearance = { bodyColor: '#FF8FC7', helmetColor: '#2F9BFF', extra: 'ears' };

const setup = () => {
  const auth = new FakeAuthGateway();
  const profiles = new FakeProfileRepository();
  return { auth, profiles, identity: createIdentityUseCases({ auth, profiles }) };
};

describe('requesting a login code', () => {
  it('does not contact the server for a malformed email', async () => {
    const { auth, identity } = setup();

    expect(await identity.requestLoginCode('not-an-email')).toEqual({ status: 'invalid-email' });
    expect(auth.codeRequests).toEqual([]);
  });

  it('asks for a code for the cleaned up email and carries it to the next step', async () => {
    const { auth, identity } = setup();

    expect(await identity.requestLoginCode(' ana@example.com ')).toEqual({
      status: 'accepted',
      email: 'ana@example.com',
    });
    expect(auth.codeRequests).toEqual(['ana@example.com']);
  });

  it.each(['rate-limited', 'unreachable'] as const)('reports a %s server', async (outcome) => {
    const { auth, identity } = setup();
    auth.codeRequestOutcome = outcome;

    expect(await identity.requestLoginCode('ana@example.com')).toEqual({ status: outcome });
  });
});

describe('verifying a login code', () => {
  const email = parseEmail('ana@example.com')!;

  it('does not contact the server for a malformed code', async () => {
    const { auth, identity } = setup();

    expect(await identity.verifyLoginCode(email, '12')).toEqual({ status: 'invalid-code' });
    expect(auth.verifications).toEqual([]);
  });

  it.each(['verified', 'rejected', 'rate-limited', 'unreachable'] as const)(
    'reports a %s answer',
    async (outcome) => {
      const { auth, identity } = setup();
      auth.verificationOutcome = outcome;

      expect(await identity.verifyLoginCode(email, ' 123456 ')).toEqual({ status: outcome });
      expect(auth.verifications).toEqual([{ email, code: '123456' }]);
    },
  );
});

describe('resolving what a rider may access', () => {
  it('sends a rider with no session to login', async () => {
    const { identity } = setup();

    expect(await identity.resolveRiderAccess()).toEqual({ status: 'signed-out' });
  });

  it('asks for a retry when the session cannot be confirmed', async () => {
    const { auth, identity } = setup();
    auth.rider = { status: 'unavailable' };

    expect(await identity.resolveRiderAccess()).toEqual({ status: 'unavailable' });
  });

  it('asks a signed in rider with no profile to create one', async () => {
    const { auth, identity } = setup();
    auth.signIn();

    expect(await identity.resolveRiderAccess()).toEqual({
      status: 'needs-profile',
      riderId: RIDER_ID,
    });
  });

  it('lets a rider with a profile in', async () => {
    const { auth, profiles, identity } = setup();
    auth.signIn();
    profiles.add(RIDER_ID, 'Ana');

    expect(await identity.resolveRiderAccess()).toEqual({
      status: 'ready',
      profile: { riderId: RIDER_ID, displayName: 'Ana', dotAppearance: DEFAULT_DOT_APPEARANCE },
    });
  });

  it('asks for a retry, and keeps the session, when the profile cannot be fetched', async () => {
    const { auth, profiles, identity } = setup();
    auth.signIn();
    profiles.unavailable = true;

    expect(await identity.resolveRiderAccess()).toEqual({ status: 'unavailable' });
    expect(auth.rider).toEqual({ status: 'signed-in', riderId: RIDER_ID });
  });
});

describe('creating a profile', () => {
  it('refuses an invalid name without contacting the server', async () => {
    const { profiles, identity } = setup();

    expect(await identity.createProfile(RIDER_ID, '   ', chosenDot)).toEqual({
      status: 'invalid-name',
    });
    expect(await profiles.findByRider(RIDER_ID)).toEqual({ status: 'missing' });
  });

  it('stores the cleaned up name and the chosen Dot', async () => {
    const { profiles, identity } = setup();

    expect(await identity.createProfile(RIDER_ID, ' Ana ', chosenDot)).toEqual({
      status: 'created',
    });
    expect(await profiles.findByRider(RIDER_ID)).toEqual({
      status: 'found',
      profile: { riderId: RIDER_ID, displayName: 'Ana', dotAppearance: chosenDot },
    });
  });

  it('reports a server it cannot reach', async () => {
    const { profiles, identity } = setup();
    profiles.unavailable = true;

    expect(await identity.createProfile(RIDER_ID, 'Ana', chosenDot)).toEqual({
      status: 'unavailable',
    });
  });
});

describe('changing the Dot of a rider', () => {
  it('saves the new Dot and keeps the name', async () => {
    const { profiles, identity } = setup();
    profiles.add(RIDER_ID, 'Ana');

    expect(await identity.changeDotAppearance(RIDER_ID, chosenDot)).toEqual({ status: 'saved' });
    expect(await profiles.findByRider(RIDER_ID)).toEqual({
      status: 'found',
      profile: { riderId: RIDER_ID, displayName: 'Ana', dotAppearance: chosenDot },
    });
  });

  it('reports a server it cannot reach', async () => {
    const { profiles, identity } = setup();
    profiles.add(RIDER_ID, 'Ana');
    profiles.unavailable = true;

    expect(await identity.changeDotAppearance(RIDER_ID, chosenDot)).toEqual({
      status: 'unavailable',
    });
  });
});

describe('sign out notifications', () => {
  it('forwards them until unsubscribed', () => {
    const { auth, identity } = setup();
    const listener = jest.fn();

    const unsubscribe = identity.onSignedOut(listener);
    auth.emitSignedOut();
    unsubscribe();
    auth.emitSignedOut();

    expect(listener).toHaveBeenCalledTimes(1);
  });
});
