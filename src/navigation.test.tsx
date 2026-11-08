import { useFonts } from 'expo-font';
import { act, fireEvent, renderRouter, screen } from 'expo-router/testing-library';

import { createIdentityUseCases } from '@/contexts/identity/application/identityUseCases';
import {
  FakeAuthGateway,
  FakeProfileRepository,
  RIDER_ID,
} from '@/contexts/identity/testing/fakes';
import { identityUseCases } from '@/compositionRoot';

jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: jest.fn(),
}));

jest.mock('@/compositionRoot', () => ({ identityUseCases: jest.fn() }));

jest.mock('@/ui/organisms/FriendlyMap', () => ({ FriendlyMap: () => null }));

let auth: FakeAuthGateway;
let profiles: FakeProfileRepository;

beforeEach(() => {
  auth = new FakeAuthGateway();
  profiles = new FakeProfileRepository();
  jest.mocked(identityUseCases).mockReturnValue(createIdentityUseCases({ auth, profiles }));
});

const givenFonts = (loaded: boolean, error: Error | null = null) => {
  jest.mocked(useFonts).mockReturnValue([loaded, error]);
};

const givenRiderWithProfile = () => {
  auth.signIn();
  profiles.add(RIDER_ID, 'Ana');
};

const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}\\b`) });

const openApp = async (initialUrl?: string) => {
  await renderRouter('src/app', { initialUrl });
};

const openAppSignedIn = async () => {
  givenRiderWithProfile();
  await openApp();
  await screen.findByRole('header', { name: 'Map' });
};

describe('tab navigation', () => {
  beforeEach(() => givenFonts(true));

  it('opens on the Map tab', async () => {
    await openAppSignedIn();

    expect(screen.getByRole('header', { name: 'Map' })).toBeOnTheScreen();
  });

  it('offers exactly the Map, Groups and Garage tabs to screen readers', async () => {
    await openAppSignedIn();

    expect(tab('Map')).toBeOnTheScreen();
    expect(tab('Groups')).toBeOnTheScreen();
    expect(tab('Garage')).toBeOnTheScreen();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('marks the pressed tab as the selected one', async () => {
    await openAppSignedIn();

    await fireEvent.press(tab('Groups'));

    expect(tab('Groups')).toBeSelected();
    expect(tab('Map')).not.toBeSelected();
  });

  it.each([
    ['Groups', '/groups'],
    ['Garage', '/garage'],
  ])('shows the %s page when its tab is pressed', async (name, pathname) => {
    await openAppSignedIn();

    await fireEvent.press(tab(name));

    expect(screen.getByRole('header', { name })).toBeOnTheScreen();
    expect(screen).toHavePathname(pathname);
  });

  it('returns to the Map page from another tab', async () => {
    await openAppSignedIn();

    await fireEvent.press(tab('Garage'));
    await fireEvent.press(tab('Map'));

    expect(screen.getByRole('header', { name: 'Map' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
  });
});

describe('changing my Dot', () => {
  beforeEach(() => givenFonts(true));

  it('opens the Dot picker from the Garage tab, without adding a tab', async () => {
    await openAppSignedIn();
    await fireEvent.press(tab('Garage'));

    await fireEvent.press(screen.getByRole('button', { name: 'Change my Dot' }));

    expect(await screen.findByRole('header', { name: 'Your Dot' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/garage/profile');
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });
});

describe('font loading', () => {
  it('holds the app back until the fonts are ready', async () => {
    givenFonts(false);
    givenRiderWithProfile();

    await openApp();

    expect(screen.queryByRole('header', { name: 'Map' })).toBeNull();
  });

  it('still opens the app when the fonts fail to load', async () => {
    givenFonts(false, new Error('font failed'));

    await openAppSignedIn();

    expect(screen.getByRole('header', { name: 'Map' })).toBeOnTheScreen();
  });
});

describe('access to the app', () => {
  beforeEach(() => givenFonts(true));

  it('shows the login page, and no tabs, to a rider with no session', async () => {
    await openApp();

    expect(await screen.findByRole('header', { name: 'Sign in' })).toBeOnTheScreen();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('does not let a link skip the login page', async () => {
    await openApp('/groups');

    expect(await screen.findByRole('header', { name: 'Sign in' })).toBeOnTheScreen();
    expect(screen.queryByRole('header', { name: 'Groups' })).toBeNull();
  });

  it('asks a signed in rider with no profile for a name, and no tabs', async () => {
    auth.signIn();

    await openApp();

    expect(await screen.findByRole('header', { name: 'Pick your rider name' })).toBeOnTheScreen();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });

  it('takes a new rider from the email to the map', async () => {
    await openApp();
    await fireEvent.changeText(await screen.findByLabelText('Email'), 'ana@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Send my code' }));
    await fireEvent.changeText(await screen.findByLabelText('6-digit code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
    await fireEvent.changeText(await screen.findByLabelText('Display name'), 'Ana');
    await fireEvent.press(screen.getByRole('button', { name: 'Save my name' }));

    expect(await screen.findByRole('header', { name: 'Map' })).toBeOnTheScreen();
  });

  it('skips the name step for a returning rider who signs in again', async () => {
    profiles.add(RIDER_ID, 'Ana');

    await openApp();
    await fireEvent.changeText(await screen.findByLabelText('Email'), 'ana@example.com');
    await fireEvent.press(screen.getByRole('button', { name: 'Send my code' }));
    await fireEvent.changeText(await screen.findByLabelText('6-digit code'), '123456');
    await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('header', { name: 'Map' })).toBeOnTheScreen();
  });

  describe('when the profile cannot be fetched', () => {
    beforeEach(() => {
      auth.signIn();
      profiles.add(RIDER_ID, 'Ana');
      profiles.unavailable = true;
    });

    it('shows a retry screen and keeps the rider signed in', async () => {
      await openApp();

      expect(await screen.findByRole('button', { name: 'Try again' })).toBeOnTheScreen();
      expect(screen.queryByRole('header', { name: 'Sign in' })).toBeNull();
      expect(auth.rider).toEqual({ status: 'signed-in', riderId: RIDER_ID });
    });

    it('stays on the retry screen while still offline', async () => {
      await openApp();

      await fireEvent.press(await screen.findByRole('button', { name: 'Try again' }));

      expect(await screen.findByRole('button', { name: 'Try again' })).toBeOnTheScreen();
    });

    it('opens the app once the retry succeeds', async () => {
      await openApp();
      const retry = await screen.findByRole('button', { name: 'Try again' });

      profiles.unavailable = false;
      await fireEvent.press(retry);

      expect(await screen.findByRole('header', { name: 'Map' })).toBeOnTheScreen();
    });
  });

  it('shows the retry screen when the session cannot be confirmed', async () => {
    auth.rider = { status: 'unavailable' };

    await openApp();

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeOnTheScreen();
  });

  it('returns to the login page when the session ends', async () => {
    await openAppSignedIn();

    await act(async () => auth.emitSignedOut());

    expect(await screen.findByRole('header', { name: 'Sign in' })).toBeOnTheScreen();
    expect(screen.queryAllByRole('tab')).toHaveLength(0);
  });
});
