import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createIdentityUseCases } from '@/contexts/identity/application/identityUseCases';
import { DEFAULT_DOT_APPEARANCE } from '@/contexts/identity/domain/DotAppearance';
import {
  FakeAuthGateway,
  FakeProfileRepository,
  RIDER_ID,
} from '@/contexts/identity/testing/fakes';
import { identityUseCases } from '@/compositionRoot';
import { CreateProfilePage } from '@/ui/pages/CreateProfilePage';

jest.mock('@/compositionRoot', () => ({ identityUseCases: jest.fn() }));

const setup = async () => {
  const profiles = new FakeProfileRepository();
  const onCreated = jest.fn();
  jest
    .mocked(identityUseCases)
    .mockReturnValue(createIdentityUseCases({ auth: new FakeAuthGateway(), profiles }));
  await render(<CreateProfilePage riderId={RIDER_ID} onCreated={onCreated} />);
  return { profiles, onCreated };
};

const submitName = async (name: string) => {
  await fireEvent.changeText(screen.getByLabelText('Display name'), name);
  await fireEvent.press(screen.getByRole('button', { name: 'Save my name' }));
};

describe('picking a Dot', () => {
  const preview = (name: string) => screen.getByRole('image', { name: `Your Dot: ${name}` });

  it('starts from the default Dot', async () => {
    await setup();

    expect(preview('Yellow body, Purple helmet, No extra')).toBeOnTheScreen();
  });

  it('previews each choice right away', async () => {
    await setup();

    await fireEvent.press(screen.getByRole('radio', { name: 'Pink body' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Blue helmet' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Mustache' }));

    expect(preview('Pink body, Blue helmet, Mustache')).toBeOnTheScreen();
  });

  it('saves the picked Dot with the name', async () => {
    const { profiles, onCreated } = await setup();

    await fireEvent.press(screen.getByRole('radio', { name: 'Orange body' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Coral helmet' }));
    await fireEvent.press(screen.getByRole('radio', { name: 'Horns' }));
    await submitName('Ana');

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(await profiles.findByRider(RIDER_ID)).toEqual({
      status: 'found',
      profile: {
        riderId: RIDER_ID,
        displayName: 'Ana',
        dotAppearance: { bodyColor: '#FFB23E', helmetColor: '#FF5C72', extra: 'horns' },
      },
    });
  });
});

describe('creating a profile', () => {
  it('saves the display name and moves on', async () => {
    const { profiles, onCreated } = await setup();

    await submitName(' Ana ');

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(await profiles.findByRider(RIDER_ID)).toEqual({
      status: 'found',
      profile: { riderId: RIDER_ID, displayName: 'Ana', dotAppearance: DEFAULT_DOT_APPEARANCE },
    });
  });

  it('flags a blank name', async () => {
    const { onCreated } = await setup();

    await submitName('   ');

    expect(await screen.findByRole('alert')).toHaveTextContent(/40 characters/);
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('explains a failed save and lets the rider try again', async () => {
    const { profiles, onCreated } = await setup();
    profiles.unavailable = true;

    await submitName('Ana');

    expect(await screen.findByRole('alert')).toHaveTextContent(/connection/i);
    expect(onCreated).not.toHaveBeenCalled();

    profiles.unavailable = false;
    await fireEvent.press(screen.getByRole('button', { name: 'Save my name' }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
  });
});
