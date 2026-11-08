import { Camera, LogManager, Map, type StyleSpecification } from '@maplibre/maplibre-react-native';
import { StyleSheet } from 'react-native';

import { spacing } from '@/ui/theme';

type FriendlyMapProps = {
  mapStyle: StyleSpecification;
};

// The engine reports failed requests with their address, which holds the key
// and the tile being viewed. Returning true keeps those out of the console.
LogManager.onLog(() => true);

// A whole-world view: this screen never knows where the rider is.
const WORLD_VIEW = { center: [0, 20] as [number, number], zoom: 1 };

/** The only component that touches the MapLibre native view. */
export function FriendlyMap({ mapStyle }: FriendlyMapProps) {
  return (
    <Map
      style={styles.map}
      mapStyle={mapStyle}
      accessibilityLabel="Map of the area"
      logo={false}
      attribution
      attributionPosition={{ top: spacing.sm, right: spacing.sm }}>
      <Camera initialViewState={WORLD_VIEW} />
    </Map>
  );
}

const styles = StyleSheet.create({
  map: {
    flex: 1,
  },
});
