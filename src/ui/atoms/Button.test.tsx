import { fireEvent, render, screen } from '@testing-library/react-native';

import { Button } from '@/ui/atoms/Button';
import { touchTarget } from '@/ui/theme';

describe('Button', () => {
  it('is a labelled button that reports presses', async () => {
    const onPress = jest.fn();
    await render(<Button label="Send my code" onPress={onPress} />);

    await fireEvent.press(screen.getByRole('button', { name: 'Send my code' }));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('is at least 44 px tall', async () => {
    await render(<Button label="Send my code" onPress={jest.fn()} />);

    expect(screen.getByRole('button')).toHaveStyle({ minHeight: touchTarget.standard });
  });

  it('ignores presses and tells screen readers while it is busy', async () => {
    const onPress = jest.fn();
    await render(<Button label="Send my code" onPress={onPress} busy />);

    await fireEvent.press(screen.getByRole('button'));

    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toBeBusy();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
