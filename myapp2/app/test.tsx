import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, ScrollView, View } from 'react-native'; 
import { Colors, Icon, styles } from './definition'; 

const MOCK_QUESTIONS = [
  { id: 1, text: '直角三角形の斜辺の長さを求めよ: (3cm, 4cm) の長さを求めよ', answer: '5', subject: '数学' },
  { id: 2, text: '元素記号がNaの元素名は？', answer: 'ナトリウム', subject: '化学' },
  { id: 3, text: "'He is reading a book.' の現在進行形の受動態は？", answer: 'A book is being read by him.', subject: '英語' },
  { id: 4, text: '2次方程式 x^2 - 4 = 0 の正の解は？', answer: '2', subject: '数学' },
  { id: 5, text: '慣性の法則を発見したのは？', answer: 'ガリレオ', subject: '物理' },
  { id: 6, text: '原子番号8番の元素名は？', answer: '酸素', subject: '化学' },
  { id: 7, text: 'y=x^2-1 のグラフの頂点の座標を求めよ。', answer: '(0, -1)', subject: '数学' }, 
  { id: 8, text: '「私は彼に会った」を過去完了形で表現せよ。', answer: 'I had met him.', subject: '英語' }
];

const TOTAL_TIME = 180; 
type GamePhase = 'title' | 'countdown' | 'running' | 'results';
type QuestionType = typeof MOCK_QUESTIONS[0]; 

interface UserAnswerRecord {
    questionId: number;
    questionText: string;
    correctAnswer: string;
    userAnswer: string;
    isCorrect: boolean;
}

const shuffleArray = (array: QuestionType[]): QuestionType[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

type RunningContentProps = {
  currentQIndex: number;
  timeRemaining: number;
  userAnswer: string;
  setUserAnswer: (text: string) => void;
  handleSubmitAnswer: () => void;
  questions: QuestionType[]; 
};

const RunningContent = React.memo(({ currentQIndex, timeRemaining, userAnswer, setUserAnswer, handleSubmitAnswer, questions }: RunningContentProps) => {
  const currentQ = questions[currentQIndex];
  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 20 }}>
        <View style={styles.contentSection}>
          <View style={[styles.flexRow, { justifyContent: 'space-between', marginBottom: 16 }]}>
            <View style={styles.flexRow}>
              <Icon name="Clock" style={{ color: Colors.primary, marginRight: 6 }} />
              <Text style={[styles.textLg, styles.textBold, { color: timeRemaining <= 10 ? Colors.destructive : Colors.primary }]}>
                残り {timeRemaining} 秒
              </Text>
            </View>
            <Text style={[styles.textMd, styles.textMutedForeground]}>
              Q. {currentQIndex + 1} / {questions.length}
            </Text>
          </View>
          <View style={[styles.card, { padding: 16, marginBottom: 16, backgroundColor: Colors.card }]}>
            <Text style={styles.tagBase}>{currentQ.subject}</Text>
            <Text style={[styles.textLg, { lineHeight: 28, marginTop: 8 }]}>{currentQ.text}</Text>
          </View>
          <Text style={styles.label}>あなたの解答</Text>
          <TextInput
            style={[styles.inputBase, { marginBottom: 16 }]}
            value={userAnswer}
            onChangeText={setUserAnswer}
            placeholder="ここに解答を入力してください"
            returnKeyType="done"
            onSubmitEditing={handleSubmitAnswer}
            blurOnSubmit={false}
          />
          <TouchableOpacity onPress={handleSubmitAnswer} style={styles.buttonPrimary}>
            <Icon name="Check" style={[styles.textSm, styles.textWhite, { marginRight: 8 }]} />
            <Text style={styles.buttonText}>次へ (回答提出)</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
});

const Test: React.FC = () => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('title');
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(TOTAL_TIME);
  const [correctCount, setCorrectCount] = useState(0);
  const [finalTime, setFinalTime] = useState(0);
  const [userAnswers, setUserAnswers] = useState<UserAnswerRecord[]>([]);
  const [readyCountdown, setReadyCountdown] = useState(3);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuestionType[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const readyTimerRef = useRef<any>(null);

  const normalizeAnswer = (str: string): string => {
      return str.toLowerCase().replace(/[()\[\]\s,]/g, '').trim();
  };

  const startMainTimer = useCallback(() => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          setFinalTime(TOTAL_TIME);
          setGamePhase('results');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setGamePhase('running');
  }, []);

  const resetGame = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    if (readyTimerRef.current) clearInterval(readyTimerRef.current);
    setGamePhase('title');
    setCurrentQIndex(0);
    setUserAnswer('');
    setTimeRemaining(TOTAL_TIME);
    setCorrectCount(0);
    setFinalTime(0);
    setReadyCountdown(3); 
    setUserAnswers([]);
    setShuffledQuestions([]);
  };

  const startReadyCountdown = useCallback(() => {
    setShuffledQuestions(shuffleArray(MOCK_QUESTIONS));
    setGamePhase('countdown');
    setReadyCountdown(3); 
    if (readyTimerRef.current) clearInterval(readyTimerRef.current);
    readyTimerRef.current = setInterval(() => {
      setReadyCountdown((prev) => { 
        if (prev <= 1) {
          clearInterval(readyTimerRef.current);
          startMainTimer();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [startMainTimer]);

  const handleSubmitAnswer = useCallback(() => {
    if (userAnswer.trim() === '') {
      Alert.alert('エラー', '解答を入力してください。');
      return;
    }
    const currentQ = shuffledQuestions[currentQIndex]; 
    if (!currentQ) { 
        resetGame();
        return;
    }
    const currentAnswer = currentQ.answer;
    const isCorrect = normalizeAnswer(userAnswer) === normalizeAnswer(currentAnswer);
    if (isCorrect) setCorrectCount((prev) => prev + 1);
    const newRecord: UserAnswerRecord = {
        questionId: currentQ.id,
        questionText: currentQ.text,
        correctAnswer: currentAnswer,
        userAnswer: userAnswer.trim(),
        isCorrect: isCorrect,
    };
    setUserAnswers(prev => [...prev, newRecord]);
    const nextIndex = currentQIndex + 1;
    if (nextIndex < shuffledQuestions.length) {
      setCurrentQIndex(nextIndex);
      setUserAnswer('');
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      setFinalTime(TOTAL_TIME - timeRemaining);
      setGamePhase('results');
    }
  }, [userAnswer, currentQIndex, timeRemaining, shuffledQuestions]); 

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (readyTimerRef.current) clearInterval(readyTimerRef.current);
    };
  }, []);

  const TitleContent = () => (
    <View style={styles.contentSection}>
      <Text style={[styles.textLg, styles.textSemiBold, { marginBottom: 8, color: Colors.primary }]}>
        タイムアタックテスト！！
      </Text>
      <View style={{ marginBottom: 12 }}>
        <View style={styles.flexRow}>
          <Text style={[styles.label, { flex: 1 }]}>問題数:</Text>
          <Text style={[styles.textMd, styles.textSemiBold]}>{MOCK_QUESTIONS.length} 問</Text>
        </View>
        <View style={styles.flexRow}>
          <Text style={[styles.label, { flex: 1 }]}>制限時間:</Text>
          <Text style={[styles.textMd, styles.textSemiBold]}>{TOTAL_TIME} 秒</Text>
        </View>
      </View>
      <View style={styles.infoBox}>
        <Text style={styles.infoBoxText}>問題はランダムに出題されます。準備はよろしいですか？</Text>
      </View>
      <TouchableOpacity onPress={startReadyCountdown} style={[styles.buttonPrimary, { marginTop: 16 }]}>
        <Icon name="Play" style={[styles.textSm, styles.textWhite, { marginRight: 8 }]} />
        <Text style={styles.buttonText}>開始しますか？ (カウントダウンへ)</Text>
      </TouchableOpacity>
    </View>
  );

  const CountdownContent = () => (
    <View style={[styles.contentSection, { alignItems: 'center', height: 200, justifyContent: 'center' }]}>
      <Text style={[styles.text2xl, styles.textMutedForeground]}>ゲームスタートまで</Text>
      <Text style={[styles.stopwatchText, { fontSize: 80, color: Colors.destructive, marginTop: 10 }]}> 
        {readyCountdown} 
      </Text>
    </View>
  );

  const ResultItem: React.FC<{ record: UserAnswerRecord, index: number }> = ({ record, index }) => {
    const statusColor = record.isCorrect ? Colors.greenSuccess : Colors.destructive;
    const statusText = record.isCorrect ? '正解' : '不正解';
    const statusIcon: 'Check' | 'RotateCcw' = record.isCorrect ? 'Check' : 'RotateCcw'; 
    return (
        <View style={[styles.card, { padding: 16, marginBottom: 12, borderColor: statusColor, borderWidth: 2, backgroundColor: record.isCorrect ? Colors.greenLight : Colors.destructiveLight }]}>
            <View style={[styles.flexRow, { justifyContent: 'space-between', marginBottom: 8 }]}>
                <Text style={[styles.textLg, styles.textBold, { color: Colors.foreground }]}>
                    問題 {index + 1}
                </Text>
                <View style={[styles.flexRow, { backgroundColor: statusColor, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 4 }]}>
                    <Icon name={statusIcon} style={[styles.textSm, styles.textWhite, { marginRight: 4 }]} />
                    <Text style={[styles.textMd, styles.textWhite, styles.textSemiBold]}>{statusText}</Text>
                </View>
            </View>
            <Text style={[styles.label, { marginTop: 8 }]}>問題文</Text>
            <Text style={[styles.textMd, { marginBottom: 10 }]}>{record.questionText}</Text>
            <Text style={styles.label}>あなたの解答</Text>
            <Text style={[styles.textMd, { marginBottom: 10, color: statusColor }]}>
                {record.userAnswer || '未解答'}
            </Text>
            {!record.isCorrect && (
                <>
                    <Text style={styles.label}>正解</Text>
                    <Text style={styles.textMd}>{record.correctAnswer}</Text>
                </>
            )}
        </View>
    );
  };

  const ResultsContent = () => (
    <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
      <View style={styles.contentSection}>
        <Text style={[styles.text2xl, styles.textSemiBold, { marginBottom: 8 }]}>結果発表！</Text> 
        <Text style={styles.textMd}>正解数: {correctCount} / {MOCK_QUESTIONS.length}</Text>
        <Text style={styles.textMd}>経過時間: {finalTime} 秒</Text>
        <View style={{ marginTop: 20 }}>
            <Text style={[styles.textLg, styles.textSemiBold, { marginBottom: 10 }]}>解答詳細</Text>
            {userAnswers.map((record, index) => (
                <ResultItem key={record.questionId} record={record} index={index} />
            ))}
        </View>
        <TouchableOpacity onPress={resetGame} style={[styles.buttonPrimary, { marginTop: 16 }]}>
          <Icon name="RotateCcw" style={[styles.textSm, styles.textWhite, { marginRight: 8 }]} />
          <Text style={styles.buttonText}>もう一度プレイ</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, paddingVertical: 10 }}>
      {gamePhase === 'title' && <TitleContent />}
      {gamePhase === 'countdown' && <CountdownContent />}
      {gamePhase === 'running' && (
        <RunningContent
          currentQIndex={currentQIndex}
          timeRemaining={timeRemaining}
          userAnswer={userAnswer}
          setUserAnswer={setUserAnswer}
          handleSubmitAnswer={handleSubmitAnswer}
          questions={shuffledQuestions.length > 0 ? shuffledQuestions : MOCK_QUESTIONS}
        />
      )}
      {gamePhase === 'results' && <ResultsContent />}
    </View>
  );
};
export default Test;