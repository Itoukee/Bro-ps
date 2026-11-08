import { fireEvent, render, screen } from '@testing-library/react-native';

import { ColorSwatch } from '@/ui/atoms/ColorSwatch';
import { touchTarget } from '@/ui/theme';

describe('ColorSwatch', () => {
  it('is a labelled radio that reports presses', async () => {
    const onPress = jest.fn();
    await render(<ColorSwatch label="Pink body" color="#FF8FC7" selected={false} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Pink body' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('tells screen readers whether it is the selected one', async () => {
    await render(<ColorSwatch label="Pink body" color="#FF8FC7" selected onPress={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Pink body' })).toBeChecked();
  });

  it('tells screen readers when it is not selected', async () => {
    await render(<ColorSwatch label="Pink body" color="#FF8FC7" selected={false} onPress={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Pink body' })).not.toBeChecked();
  });

  it('shows its color', async () => {
    await render(<ColorSwatch label="Pink body" color="#FF8FC7" selected={false} onPress={jest.fn()} />);

    expect(screen.getByRole('radio')).toHaveStyle({ backgroundColor: '#FF8FC7' });
  });

  it('is large enough to press', async () => {
    await render(<ColorSwatch label="Pink body" color="#FF8FC7" selected={false} onPress={jest.fn()} />);

    expect(screen.getByRole('radio')).toHaveStyle({
      minWidth: touchTarget.standard,
      minHeight: touchTarget.standard,
    });
  });
});
