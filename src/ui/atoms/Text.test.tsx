import { render, screen } from '@testing-library/react-native';

import { Text } from '@/ui/atoms/Text';
import { colors, fontFamily } from '@/ui/theme';

describe('Text', () => {
  it('renders body copy in the body font and ink color by default', async () => {
    await render(<Text>Ready to ride</Text>);

    expect(screen.getByText('Ready to ride')).toHaveStyle({
      fontFamily: fontFamily.body,
      color: colors.ink,
    });
  });

  it('does not announce body copy as a header', async () => {
    await render(<Text>Ready to ride</Text>);

    expect(screen.queryByRole('header')).toBeNull();
  });

  it('announces a message to screen readers as soon as it appears', async () => {
    await render(<Text announce>That code did not work.</Text>);

    expect(screen.getByRole('alert')).toHaveTextContent('That code did not work.');
  });

  it('exposes a heading to screen readers as a header in the heading font', async () => {
    await render(<Text variant="heading">Groups</Text>);

    expect(screen.getByRole('header', { name: 'Groups' })).toHaveStyle({
      fontFamily: fontFamily.heading,
    });
  });
});
