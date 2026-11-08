import { useMemo } from 'react';

import { Text } from '@/ui/atoms/Text';
import { MapUnavailableNotice } from '@/ui/molecules/MapUnavailableNotice';
import { FriendlyMap } from '@/ui/organisms/FriendlyMap';
import { GroupSwitcher } from '@/ui/organisms/GroupSwitcher';
import { RiderSheet } from '@/ui/organisms/RiderSheet';
import { MapScreenTemplate } from '@/ui/templates/MapScreenTemplate';
import { friendlyMapStyle } from '@/ui/theme/mapStyle';

const NOT_AVAILABLE_YET = () => {};

export function MapPage() {
  const maptilerKey = process.env.EXPO_PUBLIC_MAPTILER_KEY;
  const mapStyle = useMemo(() => friendlyMapStyle(maptilerKey), [maptilerKey]);

  // Groups arrive with #6, riders with #9 and #11, and starting a ride with #8.
  return (
    <MapScreenTemplate
      header={
        <>
          <Text variant="heading">Map</Text>
          <GroupSwitcher groups={[]} selectedGroupId={null} onSelectGroup={NOT_AVAILABLE_YET} />
        </>
      }
      map={mapStyle ? <FriendlyMap mapStyle={mapStyle} /> : <MapUnavailableNotice />}
      sheet={<RiderSheet riders={[]} onLetsRide={NOT_AVAILABLE_YET} />}
    />
  );
}
