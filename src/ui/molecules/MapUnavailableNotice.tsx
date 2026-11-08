import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/atoms/Text';
import { spacing } from '@/ui/theme';

export function MapUnavailableNotice() {
  return (
    <View style={styles.notice}>
      <Text>The map needs a little setup before it can show up.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
});
