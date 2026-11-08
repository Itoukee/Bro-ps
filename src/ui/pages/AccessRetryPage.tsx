import { useState } from 'react';

import { Button } from '@/ui/atoms/Button';
import { Text } from '@/ui/atoms/Text';
import { ScreenTemplate } from '@/ui/templates/ScreenTemplate';

type AccessRetryPageProps = {
  onRetry: () => Promise<void>;
};

export function AccessRetryPage({ onRetry }: AccessRetryPageProps) {
  const [busy, setBusy] = useState(false);

  const retry = async () => {
    setBusy(true);
    await onRetry();
    setBusy(false);
  };

  return (
    <ScreenTemplate>
      <Text variant="heading">We can&apos;t reach BroPS</Text>
      <Text>You&apos;re still signed in. Check your connection and try again.</Text>
      <Button label="Try again" onPress={retry} busy={busy} />
    </ScreenTemplate>
  );
}
