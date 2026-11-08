import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/ui/atoms/Chip';
import { Text } from '@/ui/atoms/Text';
import { spacing } from '@/ui/theme';

type GroupSwitcherProps = {
  groups: readonly { id: string; name: string }[];
  selectedGroupId: string | null;
  onSelectGroup: (groupId: string) => void;
};

export function GroupSwitcher({ groups, selectedGroupId, onSelectGroup }: GroupSwitcherProps) {
  if (groups.length === 0) {
    return <Text>No groups yet.</Text>;
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {groups.map((group) => (
        <Chip
          key={group.id}
          label={group.name}
          selected={group.id === selectedGroupId}
          onPress={() => onSelectGroup(group.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
  },
});
