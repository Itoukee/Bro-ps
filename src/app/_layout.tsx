import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';

import { colors, fontAssets, fontFamily } from '@/ui/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  // On a font failure the app still opens, using the system fonts.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.purple,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: fontFamily.body },
        tabBarIcon: () => null,
        tabBarIconStyle: { display: 'none' },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Map' }} />
      <Tabs.Screen name="groups" options={{ title: 'Groups' }} />
      <Tabs.Screen name="garage" options={{ title: 'Garage' }} />
    </Tabs>
  );
}
