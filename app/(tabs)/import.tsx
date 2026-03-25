import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, useColorScheme,
  TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { ExamSet } from '../../src/models';
import { useExamSet } from '../../src/hooks/useExamSet';
import { Colors, useTheme } from '../../src/theme';

const SCHEMA_SNIPPET = `{
  "id": "my-exam",
  "title": "My Exam Title",
  "version": "1.0.0",
  "createdAt": "2026-01-01T00:00:00.000Z",
  "sections": [{
    "id": "s1",
    "title": "Section 1",
    "questionIds": ["q1"]
  }],
  "questions": [{
    "id": "q1",
    "type": "single_choice",
    "text": "Your question here?",
    "options": [
      {"id":"q1-a","text":"Option A"},
      {"id":"q1-b","text":"Option B"}
    ],
    "correctAnswers": ["q1-a"],
    "explanation": "Optional explanation"
  }]
}`;

export default function ImportScreen() {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const router = useRouter();
  const { importMock, importFromJSON, importFromVCE, finalizeImport } = useExamSet();
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [showSchema, setShowSchema] = useState(false);

  const run = async (type: string, fn: () => Promise<ExamSet>) => {
    setLoadingType(type);
    let result: ExamSet | null = null;
    try {
      result = await fn();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg !== 'No file selected.') {
        Alert.alert('Import Failed', msg);
      }
      setLoadingType(null);
      return;
    }
    setLoadingType(null);

    // Show confirm dialog
    const parsed = result;
    Alert.alert(
      'Confirm Import',
      `"${parsed.title}"\n\n${parsed.questions.length} question${parsed.questions.length !== 1 ? 's' : ''} found.\n\nImport this exam set?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              await finalizeImport(parsed);
              Alert.alert(
                '✅ Import Successful!',
                `Loaded ${parsed.questions.length} questions from "${parsed.title}".\n\nReady to study!`,
                [{ text: "Let's Go!", onPress: () => router.push('/(tabs)') }]
              );
            } catch (e) {
              const msg = e instanceof Error ? e.message : String(e);
              Alert.alert('Save Failed', msg);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={[styles.scroll, { backgroundColor: theme.bg }]} contentContainerStyle={styles.container}>
      <Text style={[styles.pageTitle, { color: theme.textPrimary }]}>Import</Text>
      <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>Load an exam set to start studying</Text>

      {/* VCE Import */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>📁</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Import VCE File</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Import a .vce exam file directly from your device
            </Text>
          </View>
        </View>
        <ImportButton
          label="Select .vce File"
          color={Colors.primary}
          loading={loadingType === 'vce'}
          onPress={() => run('vce', importFromVCE)}
        />
      </View>

      {/* JSON Import */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>📄</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Import JSON File</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Import a custom exam in Learn.GG JSON format
            </Text>
          </View>
        </View>
        <ImportButton
          label="Select .json File"
          color={Colors.accent}
          loading={loadingType === 'json'}
          onPress={() => run('json', importFromJSON)}
        />
        <TouchableOpacity onPress={() => setShowSchema((v) => !v)} style={styles.schemaToggle}>
          <Text style={[styles.schemaToggleText, { color: Colors.primary }]}>
            {showSchema ? '▲ Hide JSON schema' : '▼ View required JSON format'}
          </Text>
        </TouchableOpacity>
        {showSchema && (
          <View style={[styles.schemaBox, { backgroundColor: dark ? '#0D0D1A' : '#F5F3FF', borderColor: theme.border }]}>
            <Text style={[styles.schemaText, { color: theme.textPrimary }]}>{SCHEMA_SNIPPET}</Text>
          </View>
        )}
      </View>

      {/* Sample Exam */}
      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionEmoji}>🎯</Text>
          <View style={{ flex: 1 }}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Try Sample Exam</Text>
            <Text style={[styles.sectionDesc, { color: theme.textSecondary }]}>
              Load a built-in General Knowledge sample to explore the app
            </Text>
          </View>
        </View>
        <ImportButton
          label="Load Sample Exam"
          color={Colors.success}
          loading={loadingType === 'mock'}
          onPress={() => run('mock', importMock)}
        />
      </View>

      {/* VCE Conversion Guide */}
      <View style={[styles.guideBox, { borderColor: Colors.warning + '60', backgroundColor: Colors.warning + '12' }]}>
        <Text style={[styles.guideTitle, { color: Colors.warning }]}>⚠️  VCE File Not Working?</Text>
        <Text style={[styles.guideText, { color: theme.textSecondary }]}>
          Most VCE files are encrypted (Avanset format) and cannot be parsed directly.
          Convert them first:
        </Text>
        <View style={styles.steps}>
          {[
            'Visit examformatter.net or certblaster.com',
            'Upload your .vce file to convert it',
            'Export questions as JSON or PDF',
            'For JSON: use "Import JSON File" above',
            'For PDF: manually create a JSON from the questions',
          ].map((step, i) => (
            <View key={i} style={styles.step}>
              <View style={[styles.stepNum, { backgroundColor: Colors.warning }]}>
                <Text style={styles.stepNumText}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.textPrimary }]}>{step}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

function ImportButton({ label, color, loading, onPress }: { label: string; color: string; loading: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.importBtn, { backgroundColor: color }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.importBtnText}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 20, paddingBottom: 48 },
  pageTitle: { fontSize: 32, fontWeight: '800', marginBottom: 4 },
  pageSubtitle: { fontSize: 14, marginBottom: 28 },
  section: { borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  sectionEmoji: { fontSize: 32, marginTop: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 3 },
  sectionDesc: { fontSize: 13, lineHeight: 19 },
  importBtn: { borderRadius: 16, paddingVertical: 14, alignItems: 'center' },
  importBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  schemaToggle: { alignItems: 'center', marginTop: 14 },
  schemaToggleText: { fontSize: 13, fontWeight: '600' },
  schemaBox: { marginTop: 12, borderRadius: 12, padding: 14, borderWidth: 1 },
  schemaText: { fontFamily: 'monospace', fontSize: 11, lineHeight: 18 },
  guideBox: { borderRadius: 20, padding: 20, borderWidth: 1.5, marginTop: 8 },
  guideTitle: { fontSize: 15, fontWeight: '800', marginBottom: 8 },
  guideText: { fontSize: 13, lineHeight: 20, marginBottom: 16 },
  steps: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stepNum: { width: 24, height: 24, borderRadius: 99, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 20 },
});
