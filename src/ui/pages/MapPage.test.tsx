import { render, screen } from '@testing-library/react-native';

import { FriendlyMap } from '@/ui/organisms/FriendlyMap';
import { MapPage } from '@/ui/pages/MapPage';

jest.mock('@/ui/organisms/FriendlyMap', () => ({ FriendlyMap: jest.fn(() => null) }));

const MISSING_KEY_MESSAGE = 'The map needs a little setup before it can show up.';

const savedKey = process.env.EXPO_PUBLIC_MAPTILER_KEY;

const setKey = (key: string | undefined) => {
  if (key === undefined) {
    delete process.env.EXPO_PUBLIC_MAPTILER_KEY;
  } else {
    process.env.EXPO_PUBLIC_MAPTILER_KEY = key;
  }
};

afterEach(() => {
  setKey(savedKey);
  jest.mocked(FriendlyMap).mockClear();
});

describe('MapPage', () => {
  describe('with a MapTiler key', () => {
    beforeEach(() => setKey('test-key'));

    it('keeps its Map header', async () => {
      await render(<MapPage />);

      expect(screen.getByRole('header', { name: 'Map' })).toBeOnTheScreen();
    });

    it('draws the friendly style with the key', async () => {
      await render(<MapPage />);

      expect(jest.mocked(FriendlyMap).mock.calls[0]?.[0].mapStyle.glyphs).toContain('key=test-key');
      expect(screen.queryByText(MISSING_KEY_MESSAGE)).toBeNull();
    });

    it('starts empty: no riders and no groups', async () => {
      await render(<MapPage />);

      expect(screen.getByRole('header', { name: "Who's out riding" })).toBeOnTheScreen();
      expect(screen.getByText("Nobody's out riding right now.")).toBeOnTheScreen();
      expect(screen.getByText('No groups yet.')).toBeOnTheScreen();
    });

    it("offers a labelled Let's ride! button", async () => {
      await render(<MapPage />);

      expect(screen.getByRole('button', { name: "Let's ride!" })).toBeOnTheScreen();
    });
  });

  describe.each([
    ['missing', undefined],
    ['blank', ''],
  ])('with a %s MapTiler key', (_label, key) => {
    beforeEach(() => setKey(key));

    it('shows a friendly message and no map', async () => {
      await render(<MapPage />);

      expect(screen.getByText(MISSING_KEY_MESSAGE)).toBeOnTheScreen();
      expect(FriendlyMap).not.toHaveBeenCalled();
    });

    it('keeps the rest of the page working', async () => {
      await render(<MapPage />);

      expect(screen.getByRole('header', { name: 'Map' })).toBeOnTheScreen();
      expect(screen.getByRole('button', { name: "Let's ride!" })).toBeOnTheScreen();
    });
  });
});
