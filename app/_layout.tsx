import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../src/theme';

export default function RootLayout() {
  const dark = useColorScheme() === 'dark';
  const headerBg = dark ? '#0D0D1A' : '#F5F3FF';
  const headerTint = dark ? '#EEF2FF' : '#1E1B4B';
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: headerBg },
            headerTintColor: headerTint,
            headerShadowVisible: false,
            contentStyle: { backgroundColor: dark ? '#0D0D1A' : '#F5F3FF' },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="study/learn" options={{ title: 'Learn Mode', headerBackTitle: 'Back' }} />
          <Stack.Screen name="study/exam" options={{ title: 'Practice Exam', headerBackTitle: 'Back' }} />
          <Stack.Screen name="study/wrong" options={{ title: 'Wrong Answers', headerBackTitle: 'Back' }} />
          <Stack.Screen name="study/bookmarks" options={{ title: 'Bookmarked', headerBackTitle: 'Back' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
