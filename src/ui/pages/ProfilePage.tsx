import { useCallback, useEffect, useState } from 'react';

import { identityUseCases } from '@/compositionRoot';
import type { DotAppearance } from '@/contexts/identity/domain/DotAppearance';
import type { RiderId } from '@/contexts/identity/domain/Profile';
import { Button } from '@/ui/atoms/Button';
import { Text } from '@/ui/atoms/Text';
import { DotPicker } from '@/ui/organisms/DotPicker';
import { AccessRetryPage } from '@/ui/pages/AccessRetryPage';
import { ScreenTemplate } from '@/ui/templates/ScreenTemplate';

const SAVE_MESSAGES = {
  saved: 'Your Dot is saved.',
  unavailable: "We couldn't save that. Check your connection and try again.",
} as const;

type Loaded = { riderId: RiderId; appearance: DotAppearance };

export function ProfilePage() {
  const [loaded, setLoaded] = useState<Loaded | 'loading' | 'unavailable'>('loading');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(
    () =>
      identityUseCases()
        .resolveRiderAccess()
        .then((access) =>
          setLoaded(
            access.status === 'ready'
              ? { riderId: access.profile.riderId, appearance: access.profile.dotAppearance }
              : 'unavailable',
          ),
        ),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  if (loaded === 'loading') {
    return null;
  }
  if (loaded === 'unavailable') {
    return <AccessRetryPage onRetry={load} />;
  }

  const pick = (appearance: DotAppearance) => {
    setMessage(null);
    setLoaded({ ...loaded, appearance });
  };

  const save = async () => {
    setBusy(true);
    setMessage(null);
    const result = await identityUseCases().changeDotAppearance(loaded.riderId, loaded.appearance);
    setBusy(false);
    setMessage(SAVE_MESSAGES[result.status]);
  };

  return (
    <ScreenTemplate scrollable>
      <Text variant="heading">Your Dot</Text>
      <DotPicker value={loaded.appearance} onChange={pick} />
      {message !== null && <Text announce>{message}</Text>}
      <Button label="Save my Dot" onPress={save} busy={busy} />
    </ScreenTemplate>
  );
}
