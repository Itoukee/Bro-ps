import { fireEvent, render, screen } from '@testing-library/react-native';

import { GroupSwitcher } from '@/ui/organisms/GroupSwitcher';

const groups = [
  { id: 'g1', name: 'Sunday crew' },
  { id: 'g2', name: 'Alps trip' },
];

describe('GroupSwitcher', () => {
  it('marks only the selected group', async () => {
    await render(<GroupSwitcher groups={groups} selectedGroupId="g1" onSelectGroup={jest.fn()} />);

    expect(screen.getByRole('radio', { name: 'Sunday crew' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Alps trip' })).not.toBeChecked();
  });

  it('reports the group a rider picks', async () => {
    const onSelectGroup = jest.fn();
    await render(<GroupSwitcher groups={groups} selectedGroupId="g1" onSelectGroup={onSelectGroup} />);

    await fireEvent.press(screen.getByRole('radio', { name: 'Alps trip' }));

    expect(onSelectGroup).toHaveBeenCalledWith('g2');
  });

  it('says so when the rider has no group', async () => {
    await render(<GroupSwitcher groups={[]} selectedGroupId={null} onSelectGroup={jest.fn()} />);

    expect(screen.getByText('No groups yet.')).toBeOnTheScreen();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
  });
});
