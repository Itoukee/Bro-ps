import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createIdentityUseCases } from '@/contexts/identity/application/identityUseCases';
import type { DotAppearance } from '@/contexts/identity/domain/DotAppearance';
import {
  FakeAuthGateway,
  FakeProfileRepository,
  RIDER_ID,
} from '@/contexts/identity/testing/fakes';
import { identityUseCases } from '@/compositionRoot';
import { ProfilePage } from '@/ui/pages/ProfilePage';

jest.mock('@/compositionRoot', () => ({ identityUseCases: jest.fn() }));

const savedDot: DotAppearance = { bodyColor: '#7ED957', helmetColor: '#2F9BFF', extra: 'ears' };

const setup = async ({ offline = false } = {}) => {
  const auth = new FakeAuthGateway();
  const profiles = new FakeProfileRepository();
  auth.signIn();
  profiles.add(RIDER_ID, 'Ana', savedDot);
  profiles.unavailable = offline;
  jest.mocked(identityUseCases).mockReturnValue(createIdentityUseCases({ auth, profiles }));
  await render(<ProfilePage />);
  return { profiles };
};

const findPreview = (name: string) => screen.findByRole('image', { name: `Your Dot: ${name}` });
const saveButton = () => screen.getByRole('button', { name: 'Save my Dot' });

describe('changing my Dot', () => {
  it('starts from the Dot the rider already has', async () => {
    await setup();

    expect(await findPreview('Green body, Blue helmet, Ears')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Your Dot' })).toBeOnTheScreen();
  });

  it('previews a choice right away, without saving it', async () => {
    const { profiles } = await setup();
    await findPreview('Green body, Blue helmet, Ears');

    await fireEvent.press(screen.getByRole('radio', { name: 'Pink body' }));

    expect(await findPreview('Pink body, Blue helmet, Ears')).toBeOnTheScreen();
    expect(await profiles.findByRider(RIDER_ID)).toEqual({
      status: 'found',
      profile: { riderId: RIDER_ID, displayName: 'Ana', dotAppearance: savedDot },
    });
  });

  it('saves the new Dot and says so', async () => {
    const { profiles } = await setup();
    await findPreview('Green body, Blue helmet, Ears');

    await fireEvent.press(screen.getByRole('radio', { name: 'Horns' }));
    await fireEvent.press(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent('Your Dot is saved.');
    expect(await profiles.findByRider(RIDER_ID)).toEqual({
      status: 'found',
      profile: {
        riderId: RIDER_ID,
        displayName: 'Ana',
        dotAppearance: { ...savedDot, extra: 'horns' },
      },
    });
  });

  it('drops the saved message as soon as the rider picks something else', async () => {
    await setup();
    await findPreview('Green body, Blue helmet, Ears');
    await fireEvent.press(saveButton());
    await screen.findByRole('alert');

    await fireEvent.press(screen.getByRole('radio', { name: 'Horns' }));

    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  it('explains a failed save and keeps the choice', async () => {
    const { profiles } = await setup();
    await findPreview('Green body, Blue helmet, Ears');

    profiles.unavailable = true;
    await fireEvent.press(screen.getByRole('radio', { name: 'Horns' }));
    await fireEvent.press(saveButton());

    expect(await screen.findByRole('alert')).toHaveTextContent(/connection/i);
    expect(screen.getByRole('radio', { name: 'Horns' })).toBeChecked();
  });
});

describe('when the Dot cannot be loaded', () => {
  it('offers a retry, and no picker', async () => {
    await setup({ offline: true });

    expect(await screen.findByRole('button', { name: 'Try again' })).toBeOnTheScreen();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });

  it('shows the picker once the retry succeeds', async () => {
    const { profiles } = await setup({ offline: true });
    const retry = await screen.findByRole('button', { name: 'Try again' });

    profiles.unavailable = false;
    await fireEvent.press(retry);

    expect(await findPreview('Green body, Blue helmet, Ears')).toBeOnTheScreen();
  });
});
