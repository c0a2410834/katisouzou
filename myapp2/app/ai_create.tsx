// ファイル名: ai_create.tsx カッコのみの行は除外
import React, { useState } from 'react'; // インポート
import { ActivityIndicator, Alert, Keyboard, Text, TextInput, TouchableOpacity, View } from 'react-native'; // インポート
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; // インポート
import { Colors, GeneratedQuestion, Icon, mockPreviousQuestions, Question, styles } from './definition'; // インポート
import { createAiQuestionsHtml, generatePdfFromHtml } from './utils/PdfGenerator'; // インポート
interface ControlledInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  marginTop?: number;
}
const ControlledInput = React.memo(({ label, value, onChangeText, placeholder, marginTop = 0 }: ControlledInputProps) => (
  <>
    <Text style={[styles.label, marginTop > 0 ? { marginTop } : {}]}>{label}</Text>
    <TextInput
      style={styles.inputBase}
      value={value}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor="#94a3b8" 
      blurOnSubmit={false}
    />
  </>
));
interface RangeContentProps {
  subject: string;
  unit: string;
  setSubject: (text: string) => void;
  setUnit: (text: string) => void;
}
const RangeContent = React.memo(({ subject, unit, setSubject, setUnit }: RangeContentProps) => (
  <View style={styles.contentSection}>
    <ControlledInput
      label="科目"
      value={subject}
      onChangeText={setSubject}
      placeholder="例: 数学" 
    />
    <ControlledInput
      label="単元・範囲"
      value={unit}
      onChangeText={setUnit}
      placeholder="例: 三平方の定理" 
      marginTop={10}
    />
  </View>
));
interface HistoryContentProps {
  selectedQuestion: string;
  setSelectedQuestion: (text: string) => void;
}
const HistoryContent = React.memo(({ selectedQuestion, setSelectedQuestion }: HistoryContentProps) => (
  <View style={styles.contentSection}>
    <Text style={[styles.textSm, styles.textMutedForeground, { marginBottom: 10 }]}>解答した問題から類似問題を生成</Text>
    {mockPreviousQuestions.filter(q => q.answered).map((question: Question) => (
      <TouchableOpacity
        key={question.id}
        onPress={() => setSelectedQuestion(question.text)}
        activeOpacity={0.9}
        style={[
          styles.questionItemContainer,
          {
            borderColor: selectedQuestion === question.text ? Colors.primary : Colors.border,
            backgroundColor: selectedQuestion === question.text ? Colors.primaryLight : Colors.card,
          }
        ]}
      >
        <View style={styles.flexRow}>
          <Text style={styles.tagBase}>{question.subject}</Text>
          <View style={styles.answeredTag}>
            <Icon name="Check" style={{ fontSize: 12, color: Colors.greenDark, marginRight: 4 }} />
            <Text style={[styles.textSm, { color: Colors.greenDark }]}>解答済み</Text>
          </View>
        </View>
        <Text style={styles.textMd}>{question.text}</Text>
      </TouchableOpacity>
    ))}
  </View>
));
interface GeneratedQuestionItemProps {
  question: GeneratedQuestion;
  index: number;
  showAnswerMap: Record<string, boolean>;
  handleToggleAnswer: (id: string) => void;
  handleCopy: (id: string) => void;
}
const GeneratedQuestionItem = React.memo(({
  question,
  index,
  showAnswerMap,
  handleToggleAnswer,
  handleCopy
}: GeneratedQuestionItemProps) => {
  return (
    <View style={[styles.card, { padding: 16, marginBottom: 10 }]}>
      <View style={[styles.flexRow, { justifyContent: 'space-between' }]}>
        <Text style={[styles.textMd, { fontWeight: 'bold' }]}>問題 {index + 1}</Text>
        <TouchableOpacity onPress={() => handleCopy(question.id)}>
          <Icon name={question.copied ? 'Check' : 'Copy'} style={{ color: question.copied ? Colors.greenSuccess : Colors.primary }} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.textMd, { marginTop: 8 }]}>{question.text}</Text>
      <TouchableOpacity
        onPress={() => handleToggleAnswer(question.id)}
        style={[
          styles.buttonSecondary,
          {
            marginTop: 12,
            alignSelf: 'flex-start',
            borderColor: showAnswerMap[question.id] ? Colors.destructive : Colors.primaryBorder,
            backgroundColor: Colors.card
          }
        ]}
      >
        <Icon
          name={showAnswerMap[question.id] ? 'ThumbsDown' : 'ThumbsUp'}
          style={[styles.textSm, { color: showAnswerMap[question.id] ? Colors.destructive : Colors.primary, marginRight: 6 }]}
        />
        <Text style={[styles.textMd, { color: showAnswerMap[question.id] ? Colors.destructive : Colors.primary }]}>
          {showAnswerMap[question.id] ? '解答を隠す' : '解答を見る'}
        </Text>
      </TouchableOpacity>
      {showAnswerMap[question.id] && (
        <View style={{ marginTop: 12, padding: 12, backgroundColor: Colors.greenLight, borderRadius: 8, borderWidth: 1, borderColor: Colors.greenSuccess }}>
          <Text style={[styles.label, { marginBottom: 4, color: Colors.greenDark }]}>正解</Text>
          <Text style={styles.textMd}>{question.answer}</Text>
        </View>
      )}
    </View>
  );
});
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || "";
const GEMINI_MODEL = "models/gemini-2.5-flash"; // 2.5-flashの安定稼働を維持
interface ParsedQuestion {
  text: string;
  answer: string;
  subject: string;
  difficulty: string;
}
const parseGeneratedQuestions = (text: string): ParsedQuestion[] => {
  const questions: ParsedQuestion[] = [];
  const lines = text.split('\n').map(line => line.trim()).filter(line => line !== '');
  let currentQ: Partial<ParsedQuestion> = {};
  lines.forEach(line => {
    if (line.includes('---Q')) {
      if (currentQ.text && currentQ.answer) {
        questions.push({
          text: currentQ.text,
          answer: currentQ.answer,
          subject: currentQ.subject || '不明',
          difficulty: currentQ.difficulty || '標準'
        });
      }
      currentQ = {};
      return;
    }
    const cleanLine = line.replace(/^\d+[\s.．、]*/, ''); 
    if (cleanLine.includes('問題:') || cleanLine.includes('問題：')) {
      currentQ.text = cleanLine.replace(/.*問題[:：]/, '').trim();
    } else if (cleanLine.includes('解答:') || cleanLine.includes('解答：')) {
      currentQ.answer = cleanLine.replace(/.*解答[:：]/, '').trim();
    } else if (cleanLine.includes('科目:') || cleanLine.includes('科目：')) {
      currentQ.subject = cleanLine.replace(/.*科目[:：]/, '').trim();
    } else if (cleanLine.includes('難易度:') || cleanLine.includes('難易度：')) {
      currentQ.difficulty = cleanLine.replace(/.*難易度[:：]/, '').trim();
    } else if (currentQ.text && !currentQ.answer) {
      currentQ.text += `\n${cleanLine}`; 
    } else if (currentQ.answer) {
      currentQ.answer += `\n${cleanLine}`; 
    }
  });
  if (currentQ.text && currentQ.answer) {
    questions.push({
      text: currentQ.text,
      answer: currentQ.answer,
      subject: currentQ.subject || '不明',
      difficulty: currentQ.difficulty || '標準'
    });
  }
  return questions;
};
const createGeminiPrompt = (tab: 'range' | 'history', selectedQ: string, subject: string, unit: string): string => {
  let sourceText = '';
  if (tab === 'history' && selectedQ) {
    sourceText = `以下の問題と類似した問題を3問作成してください。\n元の問題: ${selectedQ}`;
  } else {
    sourceText = `科目「${subject}」、単元・範囲「${unit}」に関する問題を3問作成してください。`;
  }
  return `あなたはAIの家庭教師です。以下のルールを厳守して問題を3問作成してください。

【出力ルール】
1. 数学・物理・化学などの問題文や解答において「数式」「記号」「分数」「関数」「累乗（2乗など）」「平方根（ルート）」等を出力する場合は、文字化けや表示崩れを防ぐため、必ず以下の厳格なLaTeX形式で表記してください。
   - 【重要】ハット記号（^）などのプレーンテキスト記号をそのまま未加工で出力することは絶対に禁止です。2乗などの累乗は必ずLaTeXの構文（例: x^2 または x^{2}）として正しく記述してください。分数は必ず \\frac{分子}{分母} の形式にしてください。
   - 「次の〜を解け」といった日本語の説明文・指示文は絶対にドルマークの中に含めず、純粋な数式パーツのみをピンポイントで囲んでください。
   - 文章中のインラインで数式を表示する場合: 左右をシングルドルマーク $ で囲む（例: 次の方程式 $x^2 - 7x + 12 = 0$ を解け。）
   - 独立した行で数式を大きく強調して表示する場合: その数式の行のみを左右ダブルドルマーク $$ で囲む

2. 解答には解説を含めず、答えの数値やLaTeX表記の数式のみを記述してください。

3. マークダウンの太字（**）などの装飾は、数式表現（LaTeX）を除き一切禁止です。

4. 出力は以下のフォーマットのみで行ってください。

---Q1
科目: [科目名]
難易度: [基礎/標準/応用]
問題: [問題文]
解答: [答え]

（以下Q3まで繰り返し）
${sourceText}`;
};
const QuestionGenerator: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'range' | 'history'>('range');
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<GeneratedQuestion[]>([]);
  const [numQuestions, setNumQuestions] = useState<string>('3'); 
  const [difficulty, setDifficulty] = useState<string>('similar'); 
  const [subject, setSubject] = useState<string>(''); 
  const [unit, setUnit] = useState<string>(''); 
  const [showAnswerMap, setShowAnswerMap] = useState<Record<string, boolean>>({});
  const handleGenerate = async () => {
    if (!selectedQuestion && currentTab === 'history') { Alert.alert('エラー', '解答履歴から類似問題を生成するには、元となる問題を選択してください。'); return; }
    if (currentTab === 'range' && (!subject || !unit)) { Alert.alert('エラー', '範囲指定から生成するには、「科目」と「単元・範囲」を入力してください。'); return; }
    if (isGenerating) return;
    setIsGenerating(true); 
    Keyboard.dismiss();
    setGeneratedQuestions([]);
    setShowAnswerMap({}); 
    const prompt = createGeminiPrompt(currentTab, selectedQuestion, subject, unit);
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        }
      );
      const data = await response.json();
      let generatedText = "";
      if (data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        generatedText = data.candidates[0].content.parts[0].text;
      } else if (data?.text) {
        generatedText = data.text;
      } else if (typeof data === 'string') {
        generatedText = data;
      }
      if (generatedText && generatedText.trim() !== "") {
        const parsed = parseGeneratedQuestions(generatedText);
        if (parsed.length > 0) {
          const finalQuestions: GeneratedQuestion[] = parsed.map((q, index) => ({
            id: `gen-${Date.now()}-${index}`,
            text: q.text,
            subject: q.subject,
            difficulty: q.difficulty,
            copied: false,
            answer: q.answer,
          }));
          setGeneratedQuestions(finalQuestions);
        } else {
          setGeneratedQuestions([{
            id: `gen-err-${Date.now()}`,
            text: `問題の抽出に失敗しました。AIの生出力:\n${generatedText}`,
            subject: subject || "エラー",
            difficulty: "エラー",
            copied: false,
            answer: "フォーマットエラーのため取得できませんでした"
          }]);
        }
      } else {
        setGeneratedQuestions([{
          id: `gen-empty-${Date.now()}`,
          text: "AIからの応答が空か、APIキーが無効です。設定を確認してください。",
          subject: "通信エラー",
          difficulty: "不明",
          copied: false,
          answer: "APIキーや制限を再度確認してください"
        }]);
      }
    } catch (e) {
      console.error("Gemini API Error:", e);
    } finally {
      setIsGenerating(false); 
    }
  };
  const handleCopy = React.useCallback((id: string) => {
    setGeneratedQuestions(prev => prev.map(q =>
      q.id === id ? { ...q, copied: true } : q
    ));
    setTimeout(() => {
      setGeneratedQuestions(prev => prev.map(q =>
        q.id === id ? { ...q, copied: false } : q
      ));
    }, 2000);
  }, []); 
  const handleToggleAnswer = React.useCallback((id: string) => {
    setShowAnswerMap(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  }, []); 
  const handleGeneratePdf = async () => {
    if (generatedQuestions.length === 0) {
      Alert.alert('PDF出力エラー', 'PDFに出力する問題がありません。');
      return;
    }
    const source = currentTab === 'history' ? selectedQuestion : `科目: ${subject}\n単元・範囲: ${unit}`;
    const html = createAiQuestionsHtml(generatedQuestions.map(q => ({
      text: q.text,
      subject: q.subject,
      difficulty: q.difficulty,
      answer: q.answer
    })), source);
    await generatePdfFromHtml(html, 'AI生成問題.pdf');
  };
  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1, paddingVertical: 10, paddingHorizontal: 16 }}
      keyboardShouldPersistTaps="handled" 
      enableOnAndroid={true}
      extraScrollHeight={0}
      viewIsInsideTabBar={true} 
    >
      <View style={{ flex: 1 }}>
        <View style={[styles.card, { padding: 16, borderWidth: 2, borderColor: Colors.primaryBorder, marginBottom: 16 }]}>
          <Text style={[styles.textLg, styles.textSemiBold, { marginBottom: 10 }]}>類似問題を生成</Text>
          <View style={[styles.flexRow, { backgroundColor: Colors.muted, borderRadius: 8, padding: 4, marginBottom: 16 }]}>
            <TouchableOpacity
              onPress={() => setCurrentTab('range')}
              style={[styles.flexOne, { padding: 8, borderRadius: 8, backgroundColor: currentTab === 'range' ? Colors.card : Colors.muted }]}
            >
              <Text style={styles.textSemiBold}>範囲指定</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCurrentTab('history')}
              style={[styles.flexOne, { padding: 8, borderRadius: 8, backgroundColor: currentTab === 'history' ? Colors.card : Colors.muted }]}
            >
              <Text style={styles.textSemiBold}>解答履歴</Text>
            </TouchableOpacity>
          </View>
          {currentTab === 'range' ? (
            <RangeContent 
              key="range-content" 
              subject={subject} 
              unit={unit} 
              setSubject={setSubject} 
              setUnit={setUnit} 
            />
          ) : (
            <HistoryContent 
              key="history-content" 
              selectedQuestion={selectedQuestion} 
              setSelectedQuestion={setSelectedQuestion} 
            />
          )}
          <TouchableOpacity
            onPress={handleGenerate}
            disabled={isGenerating}
            style={[styles.buttonPrimary, { marginTop: 16, opacity: isGenerating ? 0.6 : 1 }]}
          >
            {isGenerating ? (
              <ActivityIndicator color={Colors.primaryForeground} />
            ) : (
              <Text style={styles.buttonText}>類似問題を生成</Text>
            )}
          </TouchableOpacity>
        </View>
        {generatedQuestions.length > 0 && (
          <View style={[styles.card, { padding: 16, borderWidth: 2, marginBottom: 16 }]}>
            <Text style={[styles.textLg, styles.textSemiBold, { marginBottom: 12 }]}>生成された問題</Text>
            {generatedQuestions.map((q, i) => (
              <GeneratedQuestionItem 
                key={q.id} 
                question={q} 
                index={i} 
                showAnswerMap={showAnswerMap} 
                handleToggleAnswer={handleToggleAnswer}
                handleCopy={handleCopy}
              />
            ))}
            <TouchableOpacity onPress={handleGeneratePdf} style={styles.buttonSecondary}>
              <Text style={styles.textPrimary}>PDF出力</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </KeyboardAwareScrollView>
  );
};
export default QuestionGenerator;