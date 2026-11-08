import type { StyleSpecification } from '@maplibre/maplibre-react-native';

import rawStyle from './friendlyMapStyle.json';

const KEY_SLOT = '{key}';

/** The map style with the MapTiler key filled in, or null when there is no key. */
export function friendlyMapStyle(maptilerKey: string | undefined): StyleSpecification | null {
  const key = maptilerKey?.trim();
  if (!key) {
    return null;
  }
  return JSON.parse(JSON.stringify(rawStyle).replaceAll(KEY_SLOT, encodeURIComponent(key)));
}
