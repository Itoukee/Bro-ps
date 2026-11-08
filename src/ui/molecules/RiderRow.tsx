import { StyleSheet, View } from 'react-native';

import type { DotAppearance } from '@/contexts/identity/domain/DotAppearance';
import { Dot } from '@/ui/atoms/Dot';
import { Text } from '@/ui/atoms/Text';
import { spacing } from '@/ui/theme';

type RiderRowProps = {
  name: string;
  appearance: DotAppearance;
};

const DOT_SIZE = 40;

export function RiderRow({ name, appearance }: RiderRowProps) {
  return (
    <View style={styles.row}>
      <Dot {...appearance} size={DOT_SIZE} />
      <Text>{name}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
});
