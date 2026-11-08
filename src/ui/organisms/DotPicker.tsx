import { StyleSheet, View } from 'react-native';

import {
  DOT_BODY_COLORS,
  DOT_EXTRAS,
  DOT_HELMET_COLORS,
  type DotAppearance,
  type DotBodyColor,
  type DotExtra,
  type DotHelmetColor,
} from '@/contexts/identity/domain/DotAppearance';
import { Chip } from '@/ui/atoms/Chip';
import { ColorSwatch } from '@/ui/atoms/ColorSwatch';
import { Dot } from '@/ui/atoms/Dot';
import { Text } from '@/ui/atoms/Text';
import { spacing } from '@/ui/theme';

const BODY_NAMES: Record<DotBodyColor, string> = {
  '#FFD84D': 'Yellow',
  '#FFB23E': 'Orange',
  '#7ED957': 'Green',
  '#FF8FC7': 'Pink',
};

const HELMET_NAMES: Record<DotHelmetColor, string> = {
  '#6A45F5': 'Purple',
  '#FF5C72': 'Coral',
  '#2F9BFF': 'Blue',
  '#7B5CFF': 'Violet',
  '#7ED957': 'Green',
};

const EXTRA_NAMES: Record<DotExtra, string> = {
  none: 'No extra',
  mohawk: 'Mohawk',
  ears: 'Ears',
  horns: 'Horns',
  stache: 'Mustache',
};

type DotPickerProps = {
  value: DotAppearance;
  onChange: (appearance: DotAppearance) => void;
};

export function DotPicker({ value, onChange }: DotPickerProps) {
  const { bodyColor, helmetColor, extra } = value;
  const description = `${BODY_NAMES[bodyColor]} body, ${HELMET_NAMES[helmetColor]} helmet, ${EXTRA_NAMES[extra]}`;

  return (
    <View style={styles.picker}>
      <View style={styles.preview}>
        <Dot {...value} accessibilityLabel={`Your Dot: ${description}`} />
      </View>

      <Text variant="title">Body</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Body color" style={styles.options}>
        {DOT_BODY_COLORS.map((color) => (
          <ColorSwatch
            key={color}
            label={`${BODY_NAMES[color]} body`}
            color={color}
            selected={color === bodyColor}
            onPress={() => onChange({ ...value, bodyColor: color })}
          />
        ))}
      </View>

      <Text variant="title">Helmet</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Helmet color" style={styles.options}>
        {DOT_HELMET_COLORS.map((color) => (
          <ColorSwatch
            key={color}
            label={`${HELMET_NAMES[color]} helmet`}
            color={color}
            selected={color === helmetColor}
            onPress={() => onChange({ ...value, helmetColor: color })}
          />
        ))}
      </View>

      <Text variant="title">Extra</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel="Extra" style={styles.options}>
        {DOT_EXTRAS.map((option) => (
          <Chip
            key={option}
            label={EXTRA_NAMES[option]}
            selected={option === extra}
            onPress={() => onChange({ ...value, extra: option })}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  picker: {
    gap: spacing.sm,
  },
  preview: {
    alignItems: 'center',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
