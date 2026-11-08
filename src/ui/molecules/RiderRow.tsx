import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/atoms/Text';
import { colors, outline, spacing } from '@/ui/theme';

type RiderRowProps = {
  name: string;
};

export function RiderRow({ name }: RiderRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.marker} />
      <Text>{name}</Text>
    </View>
  );
}

const MARKER_SIZE = spacing.lg;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  marker: {
    width: MARKER_SIZE,
    height: MARKER_SIZE,
    borderRadius: MARKER_SIZE / 2,
    borderWidth: outline.width,
    borderColor: colors.ink,
    backgroundColor: colors.yellow,
  },
});
