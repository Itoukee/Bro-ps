import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path, Text as SvgText } from 'react-native-svg';

import type {
  DotBodyColor,
  DotExtra,
  DotHelmetColor,
} from '@/contexts/identity/domain/DotAppearance';
import { colors, fontFamily } from '@/ui/theme';

export type DotMood = 'happy' | 'riding' | 'worried' | 'sleepy';

type DotProps = {
  bodyColor: DotBodyColor;
  helmetColor: DotHelmetColor;
  extra?: DotExtra;
  mood?: DotMood;
  size?: number;
  /** Leave it out when a name sits beside the Dot: screen readers then skip it. */
  accessibilityLabel?: string;
};

const DECORATIVE = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: 'no-hide-descendants',
} as const;

/** The geometry is the approved design, in the units of its view box. Keep it as is. */
export function Dot({
  bodyColor,
  helmetColor,
  extra = 'none',
  mood = 'happy',
  size = 120,
  accessibilityLabel,
}: DotProps) {
  const accessibility =
    accessibilityLabel === undefined
      ? DECORATIVE
      : ({ accessible: true, accessibilityRole: 'image', accessibilityLabel } as const);
  const eyesOpen = mood === 'happy' || mood === 'worried';

  return (
    <View {...accessibility} style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="-2 -4 104 104" fill="none" style={styles.svg}>
        {mood === 'riding' && (
          <G stroke={colors.ink} strokeWidth={3} strokeLinecap="round">
            <Path d="M2 50H9" />
            <Path d="M-1 60H6" />
            <Path d="M2 70H9" />
          </G>
        )}
        {extra === 'mohawk' && (
          <Path
            d="M34 14L38 1L44 11L50 0L56 11L62 1L66 14Z"
            fill={colors.coral}
            stroke={colors.ink}
            strokeWidth={3}
            strokeLinejoin="round"
          />
        )}
        {extra === 'horns' && (
          <G fill={colors.white} stroke={colors.ink} strokeWidth={3} strokeLinejoin="round">
            <Path d="M24 26L18 6L36 17Z" />
            <Path d="M76 26L82 6L64 17Z" />
          </G>
        )}
        {extra === 'ears' && (
          <G fill={helmetColor} stroke={colors.ink} strokeWidth={3} strokeLinejoin="round">
            <Path d="M22 28L22 6L40 16Z" />
            <Path d="M78 28L78 6L60 16Z" />
          </G>
        )}
        <Circle cx={50} cy={56} r={36} fill={bodyColor} stroke={colors.ink} strokeWidth={3} />
        <Path
          d="M13 52C13 24 32 12 50 12C68 12 87 24 87 52C70 42 30 42 13 52Z"
          fill={helmetColor}
          stroke={colors.ink}
          strokeWidth={3}
          strokeLinejoin="round"
        />
        <Path d="M44 13L56 13L58 43C52 42.4 48 42.4 42 43Z" fill={colors.white} opacity={0.75} />
        <Circle cx={27} cy={72} r={5.5} fill={colors.blush} opacity={0.6} />
        <Circle cx={73} cy={72} r={5.5} fill={colors.blush} opacity={0.6} />
        {eyesOpen && (
          <G>
            <Ellipse cx={38} cy={62} rx={5.5} ry={7} fill={colors.ink} />
            <Ellipse cx={62} cy={62} rx={5.5} ry={7} fill={colors.ink} />
            <Circle cx={40} cy={59} r={2} fill={colors.white} />
            <Circle cx={64} cy={59} r={2} fill={colors.white} />
          </G>
        )}
        {mood === 'riding' && (
          <G stroke={colors.ink} strokeWidth={4} strokeLinecap="round">
            <Path d="M31 64Q38 54 45 64" />
            <Path d="M55 64Q62 54 69 64" />
          </G>
        )}
        {mood === 'sleepy' && (
          <G stroke={colors.ink} strokeWidth={4} strokeLinecap="round">
            <Path d="M32 62H44" />
            <Path d="M56 62H68" />
          </G>
        )}
        {mood === 'worried' && (
          <G stroke={colors.ink} strokeWidth={3} strokeLinecap="round">
            <Path d="M31 54L43 50" />
            <Path d="M69 54L57 50" />
          </G>
        )}
        {extra === 'stache' && (
          <Path
            d="M50 72C44 66 36 67 32 73C38 75 46 76 50 72C54 76 62 75 68 73C64 67 56 66 50 72Z"
            fill={colors.ink}
          />
        )}
        {mood === 'happy' && (
          <Path d="M43 76Q50 84 57 76" stroke={colors.ink} strokeWidth={3.5} strokeLinecap="round" />
        )}
        {mood === 'riding' && (
          <G>
            <Path
              d="M40 75Q50 92 60 75Z"
              fill={colors.ink}
              stroke={colors.ink}
              strokeWidth={2}
              strokeLinejoin="round"
            />
            <Path d="M45 82Q50 87 55 82Q50 79 45 82Z" fill={colors.blush} />
          </G>
        )}
        {mood === 'worried' && <Ellipse cx={50} cy={79} rx={4.5} ry={5.5} fill={colors.ink} />}
        {mood === 'sleepy' && (
          <Path d="M45 79Q50 76 55 79" stroke={colors.ink} strokeWidth={3.5} strokeLinecap="round" />
        )}
        {mood === 'worried' && (
          <Path
            d="M90 34C84 44 84 50 90 50C96 50 96 44 90 34Z"
            fill={colors.sweat}
            stroke={colors.ink}
            strokeWidth={2}
          />
        )}
        {mood === 'sleepy' && (
          <SvgText x={82} y={22} fontFamily={fontFamily.heading} fontSize={22} fill={colors.ink}>
            z
          </SvgText>
        )}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  svg: {
    overflow: 'visible',
  },
});
