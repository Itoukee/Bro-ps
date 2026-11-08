import { useState } from 'react';

import { identityUseCases } from '@/compositionRoot';
import type { Email } from '@/contexts/identity/domain/Email';
import { Button } from '@/ui/atoms/Button';
import { Text } from '@/ui/atoms/Text';
import { TextField } from '@/ui/atoms/TextField';
import { ScreenTemplate } from '@/ui/templates/ScreenTemplate';

const RATE_LIMITED = 'Too many tries. Wait a moment, then try again.';
const UNREACHABLE = "We couldn't reach BroPS. Check your connection and try again.";

const CODE_REQUEST_ERRORS = {
  'invalid-email': "That doesn't look like an email address.",
  'rate-limited': RATE_LIMITED,
  unreachable: UNREACHABLE,
} as const;

const VERIFICATION_ERRORS = {
  'invalid-code': 'Enter the 6 digits from the email.',
  rejected: "That code didn't work. It may have expired, so you can get a new one.",
  'rate-limited': RATE_LIMITED,
  unreachable: UNREACHABLE,
} as const;

type LoginPageProps = {
  onSignedIn: () => void;
};

export function LoginPage({ onSignedIn }: LoginPageProps) {
  const [emailText, setEmailText] = useState('');
  const [email, setEmail] = useState<Email | null>(null);

  return email === null ? (
    <EmailStep emailText={emailText} onChangeEmail={setEmailText} onAccepted={setEmail} />
  ) : (
    <CodeStep email={email} onSignedIn={onSignedIn} onNewCode={() => setEmail(null)} />
  );
}

type EmailStepProps = {
  emailText: string;
  onChangeEmail: (text: string) => void;
  onAccepted: (email: Email) => void;
};

function EmailStep({ emailText, onChangeEmail, onAccepted }: EmailStepProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await identityUseCases().requestLoginCode(emailText);
    setBusy(false);
    if (result.status === 'accepted') {
      onAccepted(result.email);
    } else {
      setError(CODE_REQUEST_ERRORS[result.status]);
    }
  };

  return (
    <ScreenTemplate>
      <Text variant="heading">Sign in</Text>
      <Text>BroPS is invitation only. Enter your email and we&apos;ll send you a code.</Text>
      <TextField
        label="Email"
        value={emailText}
        onChangeText={onChangeEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
      />
      {error !== null && <Text announce>{error}</Text>}
      <Button label="Send my code" onPress={submit} busy={busy} />
    </ScreenTemplate>
  );
}

type CodeStepProps = {
  email: Email;
  onSignedIn: () => void;
  onNewCode: () => void;
};

function CodeStep({ email, onSignedIn, onNewCode }: CodeStepProps) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await identityUseCases().verifyLoginCode(email, code);
    setBusy(false);
    if (result.status === 'verified') {
      onSignedIn();
    } else {
      setError(VERIFICATION_ERRORS[result.status]);
    }
  };

  return (
    <ScreenTemplate>
      <Text variant="heading">Check your inbox</Text>
      <Text announce>If you&apos;ve been invited, your code is on its way.</Text>
      <TextField
        label="6-digit code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      {error !== null && <Text announce>{error}</Text>}
      <Button label="Sign in" onPress={submit} busy={busy} />
      <Button label="Get a new code" variant="secondary" onPress={onNewCode} />
    </ScreenTemplate>
  );
}
