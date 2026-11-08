import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { createIdentityUseCases } from '@/contexts/identity/application/identityUseCases';
import { FakeAuthGateway, FakeProfileRepository } from '@/contexts/identity/testing/fakes';
import { identityUseCases } from '@/compositionRoot';
import { LoginPage } from '@/ui/pages/LoginPage';

jest.mock('@/compositionRoot', () => ({ identityUseCases: jest.fn() }));

const FRIENDLY_RESPONSE = "If you've been invited, your code is on its way.";

const setup = async () => {
  const auth = new FakeAuthGateway();
  const onSignedIn = jest.fn();
  jest
    .mocked(identityUseCases)
    .mockReturnValue(createIdentityUseCases({ auth, profiles: new FakeProfileRepository() }));
  await render(<LoginPage onSignedIn={onSignedIn} />);
  return { auth, onSignedIn };
};

const requestCode = async (email = 'ana@example.com') => {
  await fireEvent.changeText(screen.getByLabelText('Email'), email);
  await fireEvent.press(screen.getByRole('button', { name: 'Send my code' }));
};

const submitCode = async (code = '123456') => {
  await fireEvent.changeText(await screen.findByLabelText('6-digit code'), code);
  await fireEvent.press(screen.getByRole('button', { name: 'Sign in' }));
};

describe('asking for a code', () => {
  it('says the app is invitation only', async () => {
    await setup();

    expect(screen.getByText(/invitation only/i)).toBeOnTheScreen();
  });

  it('asks the server for a code and moves on to the code step', async () => {
    const { auth } = await setup();

    await requestCode();

    expect(await screen.findByText(FRIENDLY_RESPONSE)).toBeOnTheScreen();
    expect(auth.codeRequests).toEqual(['ana@example.com']);
  });

  it('flags a malformed email and stays on the email step', async () => {
    const { auth } = await setup();

    await requestCode('nope');

    expect(await screen.findByRole('alert')).toHaveTextContent(/email/i);
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
    expect(auth.codeRequests).toEqual([]);
  });

  it.each([
    ['rate-limited', /too many/i],
    ['unreachable', /connection/i],
  ] as const)('explains a %s server and stays on the email step', async (outcome, message) => {
    const { auth } = await setup();
    auth.codeRequestOutcome = outcome;

    await requestCode();

    expect(await screen.findByRole('alert')).toHaveTextContent(message);
    expect(screen.getByLabelText('Email')).toBeOnTheScreen();
  });
});

describe('entering the code', () => {
  it('signs the rider in', async () => {
    const { auth, onSignedIn } = await setup();
    await requestCode();

    await submitCode();

    await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
    expect(auth.verifications).toEqual([{ email: 'ana@example.com', code: '123456' }]);
  });

  it('flags a code that is not six digits without contacting the server', async () => {
    const { auth, onSignedIn } = await setup();
    await requestCode();

    await submitCode('12');

    expect(await screen.findByRole('alert', { name: /6 digits/i })).toBeOnTheScreen();
    expect(auth.verifications).toEqual([]);
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it.each([
    ['rejected', /didn't work/i],
    ['rate-limited', /too many/i],
    ['unreachable', /connection/i],
  ] as const)('explains a %s answer and does not sign in', async (outcome, message) => {
    const { auth, onSignedIn } = await setup();
    auth.verificationOutcome = outcome;
    await requestCode();

    await submitCode();

    expect(await screen.findByRole('alert', { name: message })).toBeOnTheScreen();
    expect(onSignedIn).not.toHaveBeenCalled();
  });

  it('goes back to the email step, keeping the email, to get a new code', async () => {
    await setup();
    await requestCode();
    await screen.findByLabelText('6-digit code');

    await fireEvent.press(screen.getByRole('button', { name: 'Get a new code' }));

    expect(await screen.findByLabelText('Email')).toHaveDisplayValue('ana@example.com');
  });
});
