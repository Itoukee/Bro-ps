import { fireEvent, render, screen } from '@testing-library/react-native';

import type { DotAppearance } from '@/contexts/identity/domain/DotAppearance';
import { DotPicker } from '@/ui/organisms/DotPicker';

const value: DotAppearance = { bodyColor: '#FFD84D', helmetColor: '#6A45F5', extra: 'none' };

const setup = async (current = value) => {
  const onChange = jest.fn();
  await render(<DotPicker value={current} onChange={onChange} />);
  return { onChange };
};

describe('DotPicker', () => {
  it.each([
    'Yellow body',
    'Orange body',
    'Green body',
    'Pink body',
    'Purple helmet',
    'Coral helmet',
    'Blue helmet',
    'Violet helmet',
    'Green helmet',
    'No extra',
    'Mohawk',
    'Ears',
    'Horns',
    'Mustache',
  ])('offers %s', async (name) => {
    await setup();

    expect(screen.getByRole('radio', { name })).toBeOnTheScreen();
  });

  it('offers nothing outside the palette', async () => {
    await setup();

    expect(screen.getAllByRole('radio')).toHaveLength(14);
  });

  it('marks the current choices, and only those', async () => {
    await setup({ bodyColor: '#FF8FC7', helmetColor: '#2F9BFF', extra: 'horns' });

    expect(screen.getAllByRole('radio', { checked: true }).length).toBe(3);
    expect(screen.getByRole('radio', { name: 'Pink body' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Blue helmet' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Horns' })).toBeChecked();
  });

  it('changes the body color only', async () => {
    const { onChange } = await setup();

    await fireEvent.press(screen.getByRole('radio', { name: 'Pink body' }));

    expect(onChange).toHaveBeenCalledWith({ ...value, bodyColor: '#FF8FC7' });
  });

  it('changes the helmet color only', async () => {
    const { onChange } = await setup();

    await fireEvent.press(screen.getByRole('radio', { name: 'Green helmet' }));

    expect(onChange).toHaveBeenCalledWith({ ...value, helmetColor: '#7ED957' });
  });

  it('changes the extra only', async () => {
    const { onChange } = await setup();

    await fireEvent.press(screen.getByRole('radio', { name: 'Mustache' }));

    expect(onChange).toHaveBeenCalledWith({ ...value, extra: 'stache' });
  });

  it('previews the current choices for screen readers', async () => {
    await setup({ bodyColor: '#7ED957', helmetColor: '#FF5C72', extra: 'ears' });

    expect(
      screen.getByRole('image', { name: 'Your Dot: Green body, Coral helmet, Ears' }),
    ).toBeOnTheScreen();
  });

  it('updates the preview when the choices change', async () => {
    const { rerender } = await render(<DotPicker value={value} onChange={jest.fn()} />);

    await rerender(<DotPicker value={{ ...value, extra: 'mohawk' }} onChange={jest.fn()} />);

    expect(
      screen.getByRole('image', { name: 'Your Dot: Yellow body, Purple helmet, Mohawk' }),
    ).toBeOnTheScreen();
  });
});
