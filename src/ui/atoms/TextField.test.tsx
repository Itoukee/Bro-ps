import { fireEvent, render, screen } from '@testing-library/react-native';

import { TextField } from '@/ui/atoms/TextField';
import { touchTarget } from '@/ui/theme';

describe('TextField', () => {
  it('is reachable by its label and reports what is typed', async () => {
    const onChangeText = jest.fn();
    await render(<TextField label="Email" value="" onChangeText={onChangeText} />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'ana@example.com');

    expect(onChangeText).toHaveBeenCalledWith('ana@example.com');
  });

  it('shows its label on screen', async () => {
    await render(<TextField label="Email" value="" onChangeText={jest.fn()} />);

    expect(screen.getByText('Email')).toBeOnTheScreen();
  });

  it('is at least 44 px tall', async () => {
    await render(<TextField label="Email" value="" onChangeText={jest.fn()} />);

    expect(screen.getByLabelText('Email')).toHaveStyle({ minHeight: touchTarget.standard });
  });
});
