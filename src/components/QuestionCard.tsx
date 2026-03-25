import React, { useState } from 'react';
import { View, Text, Image, ScrollView, StyleSheet, useColorScheme, TouchableOpacity } from 'react-native';
import { Question } from '../models';
import { OptionItem, OptionState } from './OptionItem';
import { DragDropList } from './DragDropList';
import { Colors, useTheme } from '../theme';

interface Props {
  question: Question;
  submitted: string[] | null;
  onSubmit: (selectedIds: string[]) => void;
  showExplanation?: boolean;
  disabled?: boolean;
}

export function QuestionCard({ question, submitted, onSubmit, showExplanation, disabled }: Props) {
  const dark = useColorScheme() === 'dark';
  const theme = useTheme(dark);
  const answered = submitted !== null;
  const [selected, setSelected] = useState<string[]>([]);
  const [dragOrder, setDragOrder] = useState<string[]>(question.options.map((o) => o.id));
  const LABELS = 'ABCDEFGH';

  const toggleOption = (id: string) => {
    if (answered || disabled) return;
    if (question.type === 'single_choice' || question.type === 'image_based') setSelected([id]);
    else setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const optionState = (id: string): OptionState => {
    if (!answered) return selected.includes(id) ? 'selected' : 'default';
    const isCorrect = question.correctAnswers.includes(id);
    const wasSelected = (submitted ?? []).includes(id);
    if (isCorrect) return 'correct';
    if (wasSelected && !isCorrect) return 'incorrect';
    return 'default';
  };

  const canSubmit = () => {
    if (question.type === 'drag_drop_order' || question.type === 'drag_drop_match') return true;
    return selected.length > 0;
  };

  const handleSubmit = () => {
    if (question.type === 'drag_drop_order' || question.type === 'drag_drop_match') onSubmit(dragOrder);
    else onSubmit(selected);
  };

  const isDragCorrect = answered && question.type === 'drag_drop_order';
  const correct = answered ? isAnswerCorrect(question, submitted!) : false;

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      {question.mediaAssets?.map((asset) =>
        asset.type === 'image' ? (
          <Image key={asset.id} source={{ uri: asset.uri }} style={styles.image} resizeMode="contain" accessibilityLabel={asset.alt} />
        ) : null
      )}

      <Text style={[styles.questionText, { color: theme.textPrimary }]}>{question.text}</Text>

      {question.type === 'multiple_choice' && (
        <Text style={[styles.hint, { color: theme.textSecondary }]}>Select all that apply</Text>
      )}

      {(question.type === 'single_choice' || question.type === 'multiple_choice' || question.type === 'image_based') && (
        <View>
          {question.options.map((opt, i) => (
            <OptionItem
              key={opt.id}
              label={LABELS[i]}
              text={opt.text}
              state={optionState(opt.id)}
              onPress={() => toggleOption(opt.id)}
              disabled={answered || disabled}
            />
          ))}
        </View>
      )}

      {(question.type === 'drag_drop_order' || question.type === 'drag_drop_match') && (
        <DragDropList
          items={answered ? question.options.slice().sort((a, b) => dragOrder.indexOf(a.id) - dragOrder.indexOf(b.id)) : question.options}
          onOrderChange={setDragOrder}
          disabled={answered || disabled}
          correctOrder={isDragCorrect ? question.correctAnswers : undefined}
        />
      )}

      {!answered && !disabled && (
        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: canSubmit() ? Colors.primary : (dark ? '#2D2D4A' : '#E5E7EB') }]}
          onPress={handleSubmit}
          disabled={!canSubmit()}
        >
          <Text style={[styles.submitText, { color: canSubmit() ? '#fff' : theme.textSecondary }]}>Confirm Answer</Text>
        </TouchableOpacity>
      )}

      {answered && (
        <View style={[styles.feedback, { backgroundColor: correct ? Colors.success + '22' : Colors.error + '22', borderColor: correct ? Colors.success : Colors.error }]}>
          <Text style={[styles.feedbackTitle, { color: correct ? Colors.success : Colors.error }]}>
            {correct ? '✓  Correct!' : '✗  Incorrect'}
          </Text>
          {showExplanation && question.explanation ? (
            <Text style={[styles.explanation, { color: theme.textPrimary }]}>{question.explanation}</Text>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

function isAnswerCorrect(question: Question, submitted: string[]): boolean {
  if (question.type === 'drag_drop_order' || question.type === 'drag_drop_match') {
    return JSON.stringify(submitted) === JSON.stringify(question.correctAnswers);
  }
  const sorted = (a: string[]) => [...a].sort();
  return JSON.stringify(sorted(submitted)) === JSON.stringify(sorted(question.correctAnswers));
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  container: { padding: 20, paddingBottom: 40 },
  image: { width: '100%', height: 200, borderRadius: 16, marginBottom: 18, backgroundColor: '#E5E7EB' },
  questionText: { fontSize: 18, fontWeight: '700', lineHeight: 28, marginBottom: 20 },
  hint: { fontSize: 13, marginBottom: 12, fontWeight: '500' },
  submitBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 10 },
  submitText: { fontSize: 16, fontWeight: '700' },
  feedback: { borderRadius: 16, padding: 18, marginTop: 16, borderWidth: 1.5 },
  feedbackTitle: { fontSize: 16, fontWeight: '800', marginBottom: 8 },
  explanation: { fontSize: 14, lineHeight: 22 },
});
