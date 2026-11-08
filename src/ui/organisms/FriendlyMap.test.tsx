import { LogManager, type StyleSpecification } from '@maplibre/maplibre-react-native';
import { render, screen } from '@testing-library/react-native';

import { FriendlyMap } from '@/ui/organisms/FriendlyMap';

jest.mock('@maplibre/maplibre-react-native', () => {
  const { View } = jest.requireActual('react-native');
  return { Map: View, Camera: () => null, LogManager: { onLog: jest.fn() } };
});

const mapStyle: StyleSpecification = { version: 8, sources: {}, layers: [] };

describe('FriendlyMap', () => {
  it('is announced to screen readers', async () => {
    await render(<FriendlyMap mapStyle={mapStyle} />);

    expect(screen.getByLabelText('Map of the area')).toBeOnTheScreen();
  });

  it('draws the style it is given', async () => {
    await render(<FriendlyMap mapStyle={mapStyle} />);

    expect(screen.getByLabelText('Map of the area')).toHaveProp('mapStyle', mapStyle);
  });

  it('keeps the map credits visible, clear of the rider sheet', async () => {
    await render(<FriendlyMap mapStyle={mapStyle} />);

    const map = screen.getByLabelText('Map of the area');
    expect(map).toHaveProp('attribution', true);
    expect(map.props.attributionPosition).toHaveProperty('top');
  });

  it('keeps map engine messages out of the logs, as they can hold tile addresses', () => {
    const handler = jest.mocked(LogManager.onLog).mock.calls[0]?.[0];

    expect(handler?.({ level: 'warn', tag: 'Mbgl-HttpRequest', message: 'failed' })).toBe(true);
  });
});
