import { fireEvent, render, screen } from '@testing-library/react-native';

import { Chip } from '@/ui/atoms/Chip';
import { touchTarget } from '@/ui/theme';

describe('Chip', () => {
  it('is a labelled radio that reports presses', async () => {
    const onPress = jest.fn();
    await render(<Chip label="Sunday crew" selected={false} onPress={onPress} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Sunday crew' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('tells screen readers whether it is the selected one', async () => {
    await render(<Chip label="Sunday crew" selected onPress={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Sunday crew' })).toBeChecked();
  });

  it('is large enough to press with gloves', async () => {
    await render(<Chip label="Sunday crew" selected={false} onPress={jest.fn()} />);

    expect(screen.getByRole('radio')).toHaveStyle({ minHeight: touchTarget.riding });
  });
});
