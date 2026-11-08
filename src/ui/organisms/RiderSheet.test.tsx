import { fireEvent, render, screen } from '@testing-library/react-native';

import { DEFAULT_DOT_APPEARANCE } from '@/contexts/identity/domain/DotAppearance';
import { RiderSheet } from '@/ui/organisms/RiderSheet';
import { touchTarget } from '@/ui/theme';

const riders = [
  { id: 'r1', name: 'Ana', appearance: DEFAULT_DOT_APPEARANCE },
  { id: 'r2', name: 'Marco', appearance: DEFAULT_DOT_APPEARANCE },
];

describe('RiderSheet', () => {
  it('has a title screen readers can jump to', async () => {
    await render(<RiderSheet riders={[]} onLetsRide={jest.fn()} />);

    expect(screen.getByRole('header', { name: "Who's out riding" })).toBeOnTheScreen();
  });

  it('lists every rider who is out', async () => {
    await render(<RiderSheet riders={riders} onLetsRide={jest.fn()} />);

    expect(screen.getByText('Ana')).toBeOnTheScreen();
    expect(screen.getByText('Marco')).toBeOnTheScreen();
    expect(screen.queryByText(/nobody/i)).toBeNull();
  });

  it('says so when nobody is out riding', async () => {
    await render(<RiderSheet riders={[]} onLetsRide={jest.fn()} />);

    expect(screen.getByText("Nobody's out riding right now.")).toBeOnTheScreen();
  });

  it("reports a press on Let's ride!, and does nothing else", async () => {
    const onLetsRide = jest.fn();
    await render(<RiderSheet riders={[]} onLetsRide={onLetsRide} />);

    await fireEvent.press(screen.getByRole('button', { name: "Let's ride!" }));

    expect(onLetsRide).toHaveBeenCalledTimes(1);
  });

  it("makes Let's ride! large enough to press with gloves", async () => {
    await render(<RiderSheet riders={[]} onLetsRide={jest.fn()} />);

    expect(screen.getByRole('button', { name: "Let's ride!" })).toHaveStyle({
      minHeight: touchTarget.riding,
    });
  });
});
