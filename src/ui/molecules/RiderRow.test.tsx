import { render, screen } from '@testing-library/react-native';
import { processColor } from 'react-native';

import type { DotAppearance } from '@/contexts/identity/domain/DotAppearance';
import { RiderRow } from '@/ui/molecules/RiderRow';

type HostNode = { type: string; props: Record<string, unknown>; children: (HostNode | string)[] | null };

const appearance: DotAppearance = { bodyColor: '#FF8FC7', helmetColor: '#2F9BFF', extra: 'mohawk' };

const hostNodes = (node: HostNode): HostNode[] => [
  node,
  ...(node.children ?? []).flatMap((child) => (typeof child === 'string' ? [] : hostNodes(child))),
];

describe('RiderRow', () => {
  it('shows the name of the rider', async () => {
    await render(<RiderRow name="Ana" appearance={appearance} />);

    expect(screen.getByText('Ana')).toBeOnTheScreen();
  });

  it('draws the Dot of the rider from its props', async () => {
    await render(<RiderRow name="Ana" appearance={appearance} />);

    const nodes = hostNodes(screen.toJSON() as unknown as HostNode);
    const body = nodes.find((node) => node.type === 'RNSVGCircle' && node.props.r === 36);
    const mohawk = nodes.find(
      (node) => node.type === 'RNSVGPath' && node.props.d === 'M34 14L38 1L44 11L50 0L56 11L62 1L66 14Z',
    );

    expect((body!.props.fill as { payload: number }).payload).toBe(processColor('#FF8FC7'));
    expect(mohawk).toBeDefined();
  });

  it('leaves the Dot out for screen readers, since the name sits beside it', async () => {
    await render(<RiderRow name="Ana" appearance={appearance} />);

    expect(screen.queryByRole('image')).toBeNull();
  });
});
