import { createSupabaseProfileRepository } from './SupabaseProfileRepository';
import { fakeSupabaseServer, RIDER_ID } from '../testing/supabaseFakeServer';
import type { DisplayName } from '../domain/DisplayName';
import { DEFAULT_DOT_APPEARANCE, type DotAppearance } from '../domain/DotAppearance';
import type { RiderId } from '../domain/Profile';

const riderId = RIDER_ID as RiderId;
const ana = 'Ana' as DisplayName;
const dot: DotAppearance = { bodyColor: '#FF8FC7', helmetColor: '#2F9BFF', extra: 'ears' };
const row = {
  id: RIDER_ID,
  display_name: 'Ana',
  dot_body_color: '#FF8FC7',
  dot_helmet_color: '#2F9BFF',
  dot_extra: 'ears',
};

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
    expect(url.searchParams.get('select')).toBe(
      'id,display_name,dot_body_color,dot_helmet_color,dot_extra',
    );
    expect(url.searchParams.get('id')).toBe(`eq.${RIDER_ID}`);
  });

  it('returns the profile with its Dot', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 200, body: [row] });

    expect(await profiles.findByRider(riderId)).toEqual({
      status: 'found',
      profile: { riderId, displayName: 'Ana', dotAppearance: dot },
    });
  });

  it('falls back to the default Dot for a stored look this version does not know', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 200, body: [{ ...row, dot_extra: 'wings' }] });

    expect(await profiles.findByRider(riderId)).toEqual({
      status: 'found',
      profile: { riderId, displayName: 'Ana', dotAppearance: DEFAULT_DOT_APPEARANCE },
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
  it('inserts the rider, the name and the Dot only', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 201 });

    expect(await profiles.create(riderId, ana, dot)).toBe('created');

    expect(server.requests[0]!.method).toBe('POST');
    expect(server.requests[0]!.url).toContain('/rest/v1/profiles');
    expect(server.requests[0]!.body).toEqual(row);
  });

  it('treats an existing profile as created', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 409, body: { code: '23505', message: 'duplicate key' } });

    expect(await profiles.create(riderId, ana, dot)).toBe('created');
  });

  it.each([
    ['a refused insert', { status: 403, body: { code: '42501', message: 'denied' } }],
    ['a server error', { status: 500, body: { code: 'XX000', message: 'boom' } }],
  ])('reports %s', async (_name, reply) => {
    const { server, profiles } = setup();
    server.reply(reply);

    expect(await profiles.create(riderId, ana, dot)).toBe('unavailable');
  });

  it('reports a phone that is offline', async () => {
    const { server, profiles } = setup();
    server.reply('offline');

    expect(await profiles.create(riderId, ana, dot)).toBe('unavailable');
  });
});

describe('updating a Dot', () => {
  afterEach(() => jest.useRealTimers());

  it('sends the three Dot columns only, for this rider only', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 200, body: [{ id: RIDER_ID }] });

    expect(await profiles.updateDotAppearance(riderId, dot)).toBe('saved');

    const request = server.requests[0]!;
    const url = new URL(request.url);
    expect(request.method).toBe('PATCH');
    expect(url.pathname).toBe('/rest/v1/profiles');
    expect(url.searchParams.get('id')).toBe(`eq.${RIDER_ID}`);
    expect(url.searchParams.get('select')).toBe('id');
    expect(request.body).toEqual({
      dot_body_color: '#FF8FC7',
      dot_helmet_color: '#2F9BFF',
      dot_extra: 'ears',
    });
  });

  it('does not report a save when no profile was updated', async () => {
    const { server, profiles } = setup();
    server.reply({ status: 200, body: [] });

    expect(await profiles.updateDotAppearance(riderId, dot)).toBe('unavailable');
  });

  it.each([
    ['a refused update', { status: 403, body: { code: '42501', message: 'denied' } }],
    ['a color the database refuses', { status: 400, body: { code: '23514', message: 'check' } }],
    ['a server error', { status: 500, body: { code: 'XX000', message: 'boom' } }],
  ])('reports %s', async (_name, reply) => {
    const { server, profiles } = setup();
    server.reply(reply);

    expect(await profiles.updateDotAppearance(riderId, dot)).toBe('unavailable');
  });

  it('reports a phone that is offline', async () => {
    const { server, profiles } = setup();
    server.reply('offline');

    expect(await profiles.updateDotAppearance(riderId, dot)).toBe('unavailable');
  });

  it('gives up on a server that never answers', async () => {
    jest.useFakeTimers();
    const { server, profiles } = setup();
    server.reply('hang');

    const update = profiles.updateDotAppearance(riderId, dot);
    await jest.advanceTimersByTimeAsync(8_000);

    expect(await update).toBe('unavailable');
  });
});
