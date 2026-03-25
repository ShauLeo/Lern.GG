import { Tabs } from 'expo-router';
import { Text, useColorScheme } from 'react-native';
import { Colors } from '../../src/theme';

export default function TabLayout() {
  const dark = useColorScheme() === 'dark';
  const bg = dark ? '#0D0D1A' : '#FFFFFF';
  const border = dark ? '#2D2D4A' : '#E5E7EB';
  const inactive = dark ? '#6B7280' : '#9CA3AF';

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: bg, borderTopColor: border, height: 60, paddingBottom: 8 },
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: inactive,
        headerStyle: { backgroundColor: dark ? '#0D0D1A' : '#F5F3FF' },
        headerTintColor: dark ? '#EEF2FF' : '#1E1B4B',
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Study', tabBarLabel: 'Study', tabBarIcon: ({ color }) => <TabIcon emoji="📚" color={color} /> }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarLabel: 'Progress', tabBarIcon: ({ color }) => <TabIcon emoji="📊" color={color} /> }} />
      <Tabs.Screen name="import" options={{ title: 'Import', tabBarLabel: 'Import', tabBarIcon: ({ color }) => <TabIcon emoji="📁" color={color} /> }} />
    </Tabs>
  );
}

function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  void color;
  return <Text style={{ fontSize: 20 }}>{emoji}</Text>;
}
