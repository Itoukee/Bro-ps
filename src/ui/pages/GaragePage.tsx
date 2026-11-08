import { useRouter } from 'expo-router';

import { Button } from '@/ui/atoms/Button';
import { Text } from '@/ui/atoms/Text';
import { ScreenTemplate } from '@/ui/templates/ScreenTemplate';

export function GaragePage() {
  const router = useRouter();

  return (
    <ScreenTemplate>
      <Text variant="heading">Garage</Text>
      <Text>Your motorcycles will show up here.</Text>
      <Button
        label="Change my Dot"
        variant="secondary"
        onPress={() => router.navigate('/garage/profile')}
      />
    </ScreenTemplate>
  );
}
