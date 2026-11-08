import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/ui/atoms/Button';
import { Text } from '@/ui/atoms/Text';
import { RiderRow } from '@/ui/molecules/RiderRow';
import { colors, outline, spacing, touchTarget } from '@/ui/theme';

type RiderSheetProps = {
  riders: readonly { id: string; name: string }[];
  onLetsRide: () => void;
};

export function RiderSheet({ riders, onLetsRide }: RiderSheetProps) {
  return (
    <View style={styles.sheet}>
      <Text variant="title">Who&apos;s out riding</Text>
      {riders.length === 0 ? (
        <Text>Nobody&apos;s out riding right now.</Text>
      ) : (
        <ScrollView style={styles.list}>
          {riders.map((rider) => (
            <RiderRow key={rider.id} name={rider.name} />
          ))}
        </ScrollView>
      )}
      <Button label="Let's ride!" size="riding" onPress={onLetsRide} />
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderWidth: outline.width,
    borderBottomWidth: 0,
    borderColor: colors.ink,
    borderTopLeftRadius: outline.radius,
    borderTopRightRadius: outline.radius,
  },
  // Keeps a long list from pushing the map off the screen.
  list: {
    maxHeight: touchTarget.riding * 3,
  },
});
