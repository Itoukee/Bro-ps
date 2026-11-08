import { useFonts } from 'expo-font';
import { fireEvent, renderRouter, screen } from 'expo-router/testing-library';

jest.mock('expo-font', () => ({
  ...jest.requireActual('expo-font'),
  useFonts: jest.fn(),
}));

const givenFonts = (loaded: boolean, error: Error | null = null) => {
  jest.mocked(useFonts).mockReturnValue([loaded, error]);
};

const tab = (name: string) => screen.getByRole('tab', { name: new RegExp(`^${name}\\b`) });

describe('tab navigation', () => {
  beforeEach(() => givenFonts(true));

  it('opens on the Map tab', async () => {
    await renderRouter('src/app');

    expect(screen.getByRole('header', { name: 'Map' })).toBeOnTheScreen();
  });

  it('offers exactly the Map, Groups and Garage tabs to screen readers', async () => {
    await renderRouter('src/app');

    expect(tab('Map')).toBeOnTheScreen();
    expect(tab('Groups')).toBeOnTheScreen();
    expect(tab('Garage')).toBeOnTheScreen();
    expect(screen.getAllByRole('tab')).toHaveLength(3);
  });

  it('marks the pressed tab as the selected one', async () => {
    await renderRouter('src/app');

    await fireEvent.press(tab('Groups'));

    expect(tab('Groups')).toBeSelected();
    expect(tab('Map')).not.toBeSelected();
  });

  it.each([
    ['Groups', '/groups'],
    ['Garage', '/garage'],
  ])('shows the %s page when its tab is pressed', async (name, pathname) => {
    await renderRouter('src/app');

    await fireEvent.press(tab(name));

    expect(screen.getByRole('header', { name })).toBeOnTheScreen();
    expect(screen).toHavePathname(pathname);
  });

  it('returns to the Map page from another tab', async () => {
    await renderRouter('src/app');

    await fireEvent.press(tab('Garage'));
    await fireEvent.press(tab('Map'));

    expect(screen.getByRole('header', { name: 'Map' })).toBeOnTheScreen();
    expect(screen).toHavePathname('/');
  });
});

describe('font loading', () => {
  it('holds the app back until the fonts are ready', async () => {
    givenFonts(false);

    await renderRouter('src/app');

    expect(screen.queryByRole('header', { name: 'Map' })).toBeNull();
  });

  it('still opens the app when the fonts fail to load', async () => {
    givenFonts(false, new Error('font failed'));

    await renderRouter('src/app');

    expect(screen.getByRole('header', { name: 'Map' })).toBeOnTheScreen();
  });
});
