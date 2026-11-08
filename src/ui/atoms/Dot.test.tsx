import { render, screen } from '@testing-library/react-native';
import type { ComponentProps } from 'react';
import { processColor } from 'react-native';

import { Dot } from '@/ui/atoms/Dot';
import { colors } from '@/ui/theme';

type HostNode = { type: string; props: Record<string, unknown>; children: (HostNode | string)[] | null };

const BODY = '#FFB23E';
const HELMET = '#2F9BFF';

const renderDot = async (props: Partial<ComponentProps<typeof Dot>> = {}) => {
  await render(<Dot bodyColor={BODY} helmetColor={HELMET} {...props} />);
  return screen.toJSON() as unknown as HostNode;
};

const hostNodes = (node: HostNode): HostNode[] => [
  node,
  ...(node.children ?? []).flatMap((child) => (typeof child === 'string' ? [] : hostNodes(child))),
];

const describeShape = ({ type, props }: HostNode): string[] => {
  switch (type) {
    case 'RNSVGPath':
      return [String(props.d)];
    case 'RNSVGCircle':
      return [`circle ${props.cx} ${props.cy} ${props.r}`];
    case 'RNSVGEllipse':
      return [`ellipse ${props.cx} ${props.cy} ${props.rx} ${props.ry}`];
    case 'RNSVGText':
      return [`text ${props.x} ${props.y}`];
    case 'RNSVGTSpan':
      return [`span ${props.content}`];
    default:
      return [];
  }
};

/** Everything the Dot draws, from the back to the front. */
const drawing = (root: HostNode) => hostNodes(root).flatMap(describeShape);

const shape = (root: HostNode, description: string) => {
  const found = hostNodes(root).find((node) => describeShape(node).includes(description));
  if (found === undefined) {
    throw new Error(`Nothing drawn as ${description}`);
  }
  return found;
};

const fillOf = (node: HostNode) => (node.props.fill as { payload: number }).payload;

const FACE_BACK = [
  'circle 50 56 36',
  'M13 52C13 24 32 12 50 12C68 12 87 24 87 52C70 42 30 42 13 52Z',
  'M44 13L56 13L58 43C52 42.4 48 42.4 42 43Z',
  'circle 27 72 5.5',
  'circle 73 72 5.5',
];

const EYES_OPEN = [
  'ellipse 38 62 5.5 7',
  'ellipse 62 62 5.5 7',
  'circle 40 59 2',
  'circle 64 59 2',
];

const MOHAWK = 'M34 14L38 1L44 11L50 0L56 11L62 1L66 14Z';
const HORNS = ['M24 26L18 6L36 17Z', 'M76 26L82 6L64 17Z'];
const EARS = ['M22 28L22 6L40 16Z', 'M78 28L78 6L60 16Z'];
const STACHE = 'M50 72C44 66 36 67 32 73C38 75 46 76 50 72C54 76 62 75 68 73C64 67 56 66 50 72Z';
const SMILE = 'M43 76Q50 84 57 76';

const HAPPY = [...FACE_BACK, ...EYES_OPEN, SMILE];

describe('Dot moods', () => {
  it('is happy unless told otherwise', async () => {
    expect(drawing(await renderDot())).toEqual(HAPPY);
  });

  it('draws the happy face', async () => {
    expect(drawing(await renderDot({ mood: 'happy' }))).toEqual(HAPPY);
  });

  it('draws wind lines, joyful eyes and a grin when riding', async () => {
    expect(drawing(await renderDot({ mood: 'riding' }))).toEqual([
      'M2 50H9',
      'M-1 60H6',
      'M2 70H9',
      ...FACE_BACK,
      'M31 64Q38 54 45 64',
      'M55 64Q62 54 69 64',
      'M40 75Q50 92 60 75Z',
      'M45 82Q50 87 55 82Q50 79 45 82Z',
    ]);
  });

  it('draws brows, an open mouth and a sweat drop when worried', async () => {
    expect(drawing(await renderDot({ mood: 'worried' }))).toEqual([
      ...FACE_BACK,
      ...EYES_OPEN,
      'M31 54L43 50',
      'M69 54L57 50',
      'ellipse 50 79 4.5 5.5',
      'M90 34C84 44 84 50 90 50C96 50 96 44 90 34Z',
    ]);
  });

  it('draws shut eyes, a small mouth and a z when sleepy', async () => {
    expect(drawing(await renderDot({ mood: 'sleepy' }))).toEqual([
      ...FACE_BACK,
      'M32 62H44',
      'M56 62H68',
      'M45 79Q50 76 55 79',
      'text 82 22',
      'span z',
    ]);
  });
});

describe('Dot extras', () => {
  it('draws no extra unless told otherwise', async () => {
    expect(drawing(await renderDot({ extra: 'none' }))).toEqual(HAPPY);
  });

  it('draws a mohawk behind the head', async () => {
    expect(drawing(await renderDot({ extra: 'mohawk' }))).toEqual([MOHAWK, ...HAPPY]);
  });

  it('draws horns behind the head', async () => {
    expect(drawing(await renderDot({ extra: 'horns' }))).toEqual([...HORNS, ...HAPPY]);
  });

  it('draws ears behind the head', async () => {
    expect(drawing(await renderDot({ extra: 'ears' }))).toEqual([...EARS, ...HAPPY]);
  });

  it('draws a mustache between the eyes and the mouth', async () => {
    expect(drawing(await renderDot({ extra: 'stache' }))).toEqual([
      ...FACE_BACK,
      ...EYES_OPEN,
      STACHE,
      SMILE,
    ]);
  });
});

describe('Dot colors', () => {
  it('paints the body with the body color', async () => {
    const dot = await renderDot();

    expect(fillOf(shape(dot, 'circle 50 56 36'))).toBe(processColor(BODY));
  });

  it('paints the helmet with the helmet color', async () => {
    const dot = await renderDot();

    expect(fillOf(shape(dot, FACE_BACK[1]!))).toBe(processColor(HELMET));
  });

  it('paints the ears with the helmet color', async () => {
    const dot = await renderDot({ extra: 'ears' });
    const ears = hostNodes(dot).find(
      (node) => node.type === 'RNSVGGroup' && hostNodes(node).length === 3,
    );

    expect(fillOf(ears!)).toBe(processColor(HELMET));
  });

  it('keeps the mohawk in its own color', async () => {
    const dot = await renderDot({ extra: 'mohawk' });

    expect(fillOf(shape(dot, MOHAWK))).toBe(processColor(colors.coral));
  });
});

describe('Dot size', () => {
  it('uses the approved view box', async () => {
    const dot = await renderDot();
    const svg = hostNodes(dot).find((node) => node.type === 'RNSVGSvgViewAndroid')!;

    expect(svg.props).toMatchObject({ minX: -2, minY: -4, vbWidth: 104, vbHeight: 104 });
  });

  it('is 120 wide and tall unless told otherwise', async () => {
    const dot = await renderDot();

    expect(dot.props.style).toEqual({ width: 120, height: 120 });
  });

  it('scales to the size it is given', async () => {
    const dot = await renderDot({ size: 40 });
    const svg = hostNodes(dot).find((node) => node.type === 'RNSVGSvgViewAndroid')!;

    expect(dot.props.style).toEqual({ width: 40, height: 40 });
    expect(svg.props).toMatchObject({ bbWidth: 40, bbHeight: 40 });
  });
});

describe('Dot and screen readers', () => {
  it('is hidden when a name sits beside it', async () => {
    const dot = await renderDot();

    expect(screen.queryByRole('image')).toBeNull();
    expect(dot.props).toMatchObject({
      accessible: false,
      importantForAccessibility: 'no-hide-descendants',
    });
  });

  it('is announced as an image when given a label', async () => {
    await renderDot({ accessibilityLabel: 'Your Dot' });

    expect(screen.getByRole('image', { name: 'Your Dot' })).toBeOnTheScreen();
  });
});
