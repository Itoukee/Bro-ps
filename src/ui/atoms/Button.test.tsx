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

  it('is at least 64 px tall when it is a riding control', async () => {
    await render(<Button label="Let's ride!" onPress={jest.fn()} size="riding" />);

    expect(screen.getByRole('button')).toHaveStyle({ minHeight: touchTarget.riding });
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
