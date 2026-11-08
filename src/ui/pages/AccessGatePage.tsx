import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { identityUseCases } from '@/compositionRoot';
import type { RiderAccess } from '@/contexts/identity/application/identityUseCases';
import { AccessRetryPage } from '@/ui/pages/AccessRetryPage';
import { CreateProfilePage } from '@/ui/pages/CreateProfilePage';
import { LoginPage } from '@/ui/pages/LoginPage';

type AccessGatePageProps = {
  children: ReactNode;
};

/** Renders the app only for a signed in rider with a profile. */
export function AccessGatePage({ children }: AccessGatePageProps) {
  const [access, setAccess] = useState<RiderAccess | null>(null);
  // A sign out must win over a resolution that started before it.
  const latestResolution = useRef(0);

  const resolveAccess = useCallback(async () => {
    latestResolution.current += 1;
    const resolution = latestResolution.current;
    const resolved = await identityUseCases().resolveRiderAccess();
    if (resolution === latestResolution.current) {
      setAccess(resolved);
    }
  }, []);

  useEffect(() => {
    void resolveAccess();
    return identityUseCases().onSignedOut(() => {
      latestResolution.current += 1;
      setAccess({ status: 'signed-out' });
    });
  }, [resolveAccess]);

  switch (access?.status) {
    case undefined:
      return null;
    case 'signed-out':
      return <LoginPage onSignedIn={resolveAccess} />;
    case 'unavailable':
      return <AccessRetryPage onRetry={resolveAccess} />;
    case 'needs-profile':
      return <CreateProfilePage riderId={access.riderId} onCreated={resolveAccess} />;
    case 'ready':
      return children;
  }
}
