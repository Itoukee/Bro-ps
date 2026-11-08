import { useState } from 'react';

import { identityUseCases } from '@/compositionRoot';
import { DEFAULT_DOT_APPEARANCE } from '@/contexts/identity/domain/DotAppearance';
import type { RiderId } from '@/contexts/identity/domain/Profile';
import { Button } from '@/ui/atoms/Button';
import { Text } from '@/ui/atoms/Text';
import { TextField } from '@/ui/atoms/TextField';
import { ScreenTemplate } from '@/ui/templates/ScreenTemplate';

const ERRORS = {
  'invalid-name': 'Your name needs between 1 and 40 characters.',
  unavailable: "We couldn't save that. Check your connection and try again.",
} as const;

type CreateProfilePageProps = {
  riderId: RiderId;
  onCreated: () => void;
};

export function CreateProfilePage({ riderId, onCreated }: CreateProfilePageProps) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    setError(null);
    const result = await identityUseCases().createProfile(riderId, name, DEFAULT_DOT_APPEARANCE);
    setBusy(false);
    if (result.status === 'created') {
      onCreated();
    } else {
      setError(ERRORS[result.status]);
    }
  };

  return (
    <ScreenTemplate>
      <Text variant="heading">Pick your rider name</Text>
      <Text>This is the name your friends see.</Text>
      <TextField
        label="Display name"
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
      />
      {error !== null && <Text announce>{error}</Text>}
      <Button label="Save my name" onPress={submit} busy={busy} />
    </ScreenTemplate>
  );
}
