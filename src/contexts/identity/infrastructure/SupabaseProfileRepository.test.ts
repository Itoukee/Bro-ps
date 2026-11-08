import { createSupabaseProfileRepository } from './SupabaseProfileRepository';
import { fakeSupabaseServer, RIDER_ID } from '../testing/supabaseFakeServer';
import type { DisplayName } from '../domain/DisplayName';
import type { RiderId } from '../domain/Profile';

const riderId = RIDER_ID as RiderId;
const ana = 'Ana' as DisplayName;

const setup = () => {
  const server = fakeSupabaseServer();
  return { server, profiles: createSupabaseProfileRepository(server.client) };
};

describe('finding a profile', () => {
  afterEach(() => jest.useRealTimers());

  it('reads the named columns of the rider only', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 200, body: [] });

    await profiles.findByRider(riderId);

    const url = new URL(server.requests[0]!.url);
    expect(url.pathname).toBe('/rest/v1/profiles');
    expect(url.searchParams.get('select')).toBe('id,display_name');
    expect(url.searchParams.get('id')).toBe(`eq.${RIDER_ID}`);
  });

  it('returns the profile', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 200, body: [{ id: RIDER_ID, display_name: 'Ana' }] });

    expect(await profiles.findByRider(riderId)).toEqual({
      status: 'found',
      profile: { riderId, displayName: 'Ana' },
    });
  });

  it('reports a rider with no profile', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 200, body: [] });

    expect(await profiles.findByRider(riderId)).toEqual({ status: 'missing' });
  });

  it('never mistakes a phone that is offline for a missing profile', async () => {
    const { server, profiles } = setup();
    server.reply('offline');

    expect(await profiles.findByRider(riderId)).toEqual({ status: 'unavailable' });
  });

  it('never mistakes a server error for a missing profile', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 500, body: { code: 'XX000', message: 'boom' } });

    expect(await profiles.findByRider(riderId)).toEqual({ status: 'unavailable' });
  });

  it('gives up on a server that never answers', async () => {
    jest.useFakeTimers();
    const { server, profiles } = setup();
    server.reply('hang');

    const lookup = profiles.findByRider(riderId);
    await jest.advanceTimersByTimeAsync(8_000);

    expect(await lookup).toEqual({ status: 'unavailable' });
  });
});

describe('creating a profile', () => {
  it('inserts the rider and the name only', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 201 });

    expect(await profiles.create(riderId, ana)).toBe('created');

    expect(server.requests[0]!.method).toBe('POST');
    expect(server.requests[0]!.url).toContain('/rest/v1/profiles');
    expect(server.requests[0]!.body).toEqual({ id: RIDER_ID, display_name: 'Ana' });
  });

  it('treats an existing profile as created', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 409, body: { code: '23505', message: 'duplicate key' } });

    expect(await profiles.create(riderId, ana)).toBe('created');
  });

  it.each([
    ['a refused insert', { status: 403, body: { code: '42501', message: 'denied' } }],
    ['a server error', { status: 500, body: { code: 'XX000', message: 'boom' } }],
  ])('reports %s', async (_name, reply) => {
    const { server, profiles } = setup();
    server.reply(reply);

    expect(await profiles.create(riderId, ana)).toBe('unavailable');
  });

  it('reports a phone that is offline', async () => {
    const { server, profiles } = setup();
    server.reply('offline');

    expect(await profiles.create(riderId, ana)).toBe('unavailable');
  });
});
