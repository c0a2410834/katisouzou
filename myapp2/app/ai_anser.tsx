import React, { useState, useMemo, useRef, useEffect } from 'react'; // インポート
import { Alert, ActivityIndicator, Text, TouchableOpacity, View, Platform, TextInput, ScrollView } from 'react-native'; // インポート
import AsyncStorage from '@react-native-async-storage/async-storage'; // インポート
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; // インポート
import { Colors, Icon, styles } from './definition'; // インポート
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || ""; // 環境変数から読み込み
const SERPER_API_KEY = process.env.EXPO_PUBLIC_SERPER_API_KEY || ""; // SerperのAPIキーを環境変数から取得
const GEMINI_MODEL = 'models/gemini-2.5-flash'; // 3.5-flash指定
const STORAGE_KEY = '@ai_question_history'; // ストレージキー
interface HistoryItem {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
}
interface Comment {
  id: string;
  answerId: string;
  parentId?: string;
  text: string;
  likes: number;
  replies: Comment[];
  createdAt: string;
}
const extractSubjectAndRange = (text: string) => {
  if (!text) return { subject: '不明', range: '不明' }; // 空データ時のクラッシュ防止
  const subjectMatch = text.match(/科目[：:](.+)/); 
  const rangeMatch = text.match(/範囲[：:](.+)/); 
  return {
    subject: subjectMatch ? subjectMatch[1].trim() : '',
    range: rangeMatch ? rangeMatch[1].trim() : '',
  };
};
const QuestionInput = React.memo(
  ({ value, onChange }: { value: string; onChange: (t: string) => void }) => (
    <View style={{ marginVertical: 10 }}>
      <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 4 }}>問題文</Text>
      <TextInput
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          padding: 10,
          borderRadius: 8,
          height: 80,
          marginBottom: 16,
          backgroundColor: Colors.card,
          textAlignVertical: 'top',
          fontSize: 16, // iOSの自動ズームを防ぐために16px以上に指定
        }}
        multiline
        value={value}
        onChangeText={onChange}
        placeholder="ここに問題文を入力..." 
        placeholderTextColor="#94a3b8" 
        blurOnSubmit={false}
      />
    </View>
  )
);
const CommentSection: React.FC<{ answerId: string }> = ({ answerId }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const handleAddComment = (text: string) => {
    if (!text.trim()) return;
    const newItem: Comment = {
      id: Date.now().toString(),
      answerId,
      text,
      likes: 0,
      replies: [],
      createdAt: new Date().toLocaleString('ja-JP'),
    };
    setComments((prev) => [...prev, newItem]);
    setNewComment('');
  };
  return (
    <View style={{ marginTop: 10 }}>
      <Text style={{ fontWeight: 'bold' }}>💬 コメント</Text>
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        <TextInput
          placeholder="コメントを書く..."
          placeholderTextColor="#94a3b8" 
          value={newComment}
          onChangeText={setNewComment}
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: Colors.border,
            borderRadius: 6,
            padding: 6,
            fontSize: 16, // コメント欄タップ時の自動ズームを防ぐ
          }}
        />
        <TouchableOpacity
          onPress={() => handleAddComment(newComment)}
          style={{
            marginLeft: 8,
            backgroundColor: Colors.primary,
            borderRadius: 6,
            paddingVertical: 6,
            paddingHorizontal: 10,
          }}
        >
          <Text style={{ color: 'white' }}>投稿</Text>
        </TouchableOpacity>
      </View>
      {comments.length === 0 ? (
        <Text style={{ color: Colors.mutedForeground, marginTop: 4 }}>
          まだコメントはありません。
        </Text>
      ) : (
        comments.map((c) => (
          <Text key={c.id} style={{ marginTop: 4 }}>
            💬 {c.text}
          </Text>
        ))
      )}
    </View>
  );
};
const HistoryTab: React.FC<{
  history: HistoryItem[];
  searchKeyword: string;
  setSearchKeyword: (keyword: string) => void;
  onDeleteHistory: (id: string) => void;
}> = ({ history, searchKeyword, setSearchKeyword, onDeleteHistory }) => {
  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      const { subject, range } = extractSubjectAndRange(item.answer);
      const keyword = searchKeyword.trim().toLowerCase();
      if (!keyword) return true;
      return (
        subject.toLowerCase().includes(keyword) ||
        range.toLowerCase().includes(keyword) ||
        item.question.toLowerCase().includes(keyword)
      );
    });
  }, [history, searchKeyword]);
  return (
    <ScrollView contentContainerStyle={{ padding: 10 }}>
      <TextInput
        placeholder="科目・範囲・問題文で検索"
        placeholderTextColor="#94a3b8" 
        value={searchKeyword}
        onChangeText={setSearchKeyword}
        style={{
          borderWidth: 1,
          borderColor: Colors.border,
          padding: 10,
          borderRadius: 8,
          backgroundColor: Colors.card,
          marginBottom: 12,
          fontSize: 16, // 検索入力時の自動ズームを防ぐ
        }}
      />
      {filteredHistory.length === 0 ? (
        <Text style={{ textAlign: 'center', color: Colors.mutedForeground, marginTop: 20 }}>
          該当する履歴がありません
        </Text>
      ) : (
        filteredHistory.map((item) => {
          const { subject, range } = extractSubjectAndRange(item.answer);
          const explanation = item.answer; 
          return (
            <View
              key={item.id}
              style={[styles.card, { marginBottom: 20, padding: 16, borderWidth: 1, borderColor: Colors.border }]}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: Colors.mutedForeground }}>
                  {item.createdAt} {subject && `${subject}`} {range && `${range}`}
                </Text>
                <TouchableOpacity onPress={() => onDeleteHistory(item.id)}>
                  <Text style={{ color: 'red', fontSize: 12 }}>🗑 削除</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontWeight: '600', fontSize: 14, marginVertical: 6 }}>
                問題：{item.question}
              </Text>
              <Text style={{ fontSize: 14, lineHeight: 22 }}>{explanation}</Text>
              <CommentSection answerId={item.id} />
            </View>
          );
        })
      )}
    </ScrollView>
  );
};
const QuestionAnswer: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<'input' | 'history'>('input');
  const [currentQuestion, setCurrentQuestion] = useState(''); 
  const [aiAnswer, setAiAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState('');
  const historyRef = useRef<HistoryItem[]>([]);
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    (async () => {
      try {
        const json = await AsyncStorage.getItem(STORAGE_KEY);
        if (json) historyRef.current = JSON.parse(json);
        forceUpdate((n) => n + 1);
      } catch (e) {
        console.error('履歴読み込み失敗', e);
      }
    })();
  }, []);
  const saveHistory = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(historyRef.current));
    } catch (e) {
      console.error('履歴保存失敗', e);
    }
  };
  const addHistoryItem = async (item: HistoryItem) => {
    historyRef.current = [item, ...historyRef.current];
    await saveHistory();
    forceUpdate((n) => n + 1);
  };
  const deleteHistoryItem = async (id: string) => {
    historyRef.current = historyRef.current.filter((item) => item.id !== id);
    await saveHistory();
    forceUpdate((n) => n + 1);
  };
  const normalizeOutput = (text: string): string => {
    return text.trim(); 
  };
  const executeSerperSearch = async (query: string): Promise<string> => {
    if (!SERPER_API_KEY) return "エラー: 検索APIキーが設定されていません。"; // キーチェック
    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": SERPER_API_KEY, // 認証
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ q: query, gl: "jp", hl: "ja" }) // 日本語検索
      });
      const data = await response.json();
      if (data.organic && data.organic.length > 0) { // 結果判定
        return data.organic.slice(0, 4).map((item: any) => `タイトル: ${item.title}\n要約: ${item.snippet}\nURL: ${item.link}`).join("\n\n"); // 結合
      }
      return "検索結果が見つかりませんでした。"; // 零件時
    } catch (error) {
      return "検索実行中に通信エラーが発生しました。"; // 例外
    }
  };
  const fetchGeminiAnswer = async () => {
    if (loading) return; 
    if (!currentQuestion.trim()) {
      Alert.alert('エラー', '問題文を入力してください');
      return;
    }
    setLoading(true);
    setAiAnswer('');
    setShowResults(true);
    try {
const systemInstructionText = `# 超高性能問題解説AIプロンプト【全汎用・自律ツール思考版】

あなたは、あらゆる年齢・学年の学習、資格試験、時事問題に完全対応した正確無比な問題解説AIアシスタントです。提供された \`google_serper_search\` ツールを自律的に駆使し、以下の【厳格な遵守ルール】に従い最高の解説を生成せよ。

## 【厳格な遵守ルール】
1. **検索クエリの自律実行:** 最新情報、統計、白黒はっきりさせる事実が必要な場合、必ず \`google_serper_search\` を実行せよ。その際、提供された問題文に手を加えたり、特定の年号（例: 2022年や2026年など）を勝手に推測して付与したりせず、ユーザーが入力した文章（コンテキスト）をそのまま一言一句変えずに検索クエリとして送信せよ。
2. **提供データの絶対視:** ツール実行によって得られたWeb検索結果の内容を、自分の過去の学習データより圧倒的に優先する唯一の根拠とせよ。
3. **公式ソースの質的選別:** 検索結果に政府機関（.go.jp）、教育機関（.ac.jp）、各資格の公式運営等の一次ソース、または確定データが含まれる場合はそれを絶対視せよ。ただし、検索結果にニュース記事や概算値しか含まれていない場合でも、それを「現時点で得られる最善の根拠」として採用し、回答を絶対に拒否してはならない。
4. **データの最大抽出:** ソースに詳細な生データ（最小単位の数値や項目）がある場合はそのまま抽出せよ。ソースが概数表現しか持ち合わせていない場合は、その情報の範囲内でベストを尽くして結論を導き出すこと。

## 【出力ルール】
1. **明確な結論:** 冒頭に「正解（結論）」をズバッと提示すること。
2. **論理解説とデータ明記:**
    - 【根拠データ】: 検索資料から抽出した具体的な数値、条文、または記述。
    - 【加工プロセス】: 根拠データから一般的な表現に変換したり、問題を解くために比較・展開・思考した手順。
3. **出典の明記:** 検索結果に含まれる「資料名」「サイト名」「項目名」などを可能な限り明記すること。
4. **トーンの自動最適化:** 解説の言葉遣いは、問題のレベルに合わせて分かりやすく噛み砕くこと。`;
      const toolDeclaration = {
        functionDeclarations: [{
          name: "google_serper_search", // 関数名
          description: "Google検索エンジンを使用してウェブ情報を取得します。最新の時事、統計データ、歴史的事実、資格試験の正確な数値を特定するために、入力された問題文をそのまま投げて呼び出してください。", // 説明
          parameters: {
            type: "OBJECT",
            properties: {
              query: {
                type: "STRING",
                description: "ユーザーから入力された問題文そのものの文字列" // 引数説明
              }
            },
            required: ["query"]
          }
        }]
      };
      const skipSearchKeywords = ["数学", "因数分解", "方程式", "微分", "積分", "関数", "ルート", "平方根", "解け", "計算せよ", "+", "-", "*", "/", "=", "√"]; // 検索不要な数学系ワード一覧
      const shouldSkipSearch = skipSearchKeywords.some(keyword => currentQuestion.includes(keyword)); // 該当判定
      let currentMessages: any[] = [{ role: "user", parts: [{ text: currentQuestion }] }]; // メッセージ履歴管理
      let continueLoop = true; // ループフラグ
      let finalGeneratedText = ""; // 最終出力テキスト
      while (continueLoop) { // ツール実行ループ
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: currentMessages, // 履歴送信
              tools: shouldSkipSearch ? [] : [toolDeclaration], // 数学関連の問題であればツール定義を空にして検索を物理的にスキップ
              systemInstruction: { parts: [{ text: systemInstructionText }] }, 
              generationConfig: { temperature: 0 }
            }),
          }
        );
        const data = await response.json();
        const candidate = data?.candidates?.[0]; // 候補取得
        const messageParts = candidate?.content?.parts || []; // パーツ取得
        currentMessages.push({ role: "model", parts: messageParts }); // モデルの応答を履歴へ追加
        const functionCall = messageParts.find((part: any) => part.functionCall); // 呼び出し有無判定
        if (functionCall && !shouldSkipSearch) { // ツール要求ありかつスキップ対象外
          const functionName = functionCall.functionCall.name; // 関数名
          const functionArgs = functionCall.functionCall.args; // 引数
          if (functionName === "google_serper_search") { // 該当ツール検証
            const searchResult = await executeSerperSearch(currentQuestion); // AIが生成したクエリではなくユーザーの問題文（入力文）をそのまま確定でSerperに送信
            currentMessages.push({
              role: "user",
              parts: [{
                functionResponse: {
                  name: "google_serper_search",
                  response: { result: searchResult } // 結果格納
                }
              }]
            });
          } else {
            continueLoop = false; // 未定義ツール時
          }
        } else { // テキスト出力完了
          finalGeneratedText = messageParts.find((part: any) => part.text)?.text || ""; // 抽出
          continueLoop = false; // ループ終了
        }
      }
      if (finalGeneratedText) {
        const cleaned = normalizeOutput(finalGeneratedText);
        setAiAnswer(cleaned);
        const newItem: HistoryItem = {
          id: Date.now().toString(),
          question: currentQuestion,
          answer: cleaned,
          createdAt: new Date().toLocaleString('ja-JP'),
        };
        await addHistoryItem(newItem);
      } else {
        Alert.alert('生成失敗', 'AIから解答を取得できませんでした。');
        setShowResults(false);
      }
    } catch (e) {
      Alert.alert('通信エラー', 'Gemini APIとの通信に失敗しました');
      setShowResults(false);
    } finally { 
      setLoading(false); 
    }
  };
  const history = historyRef.current;
  return (
    <View style={{ flex: 1 }}>
      <View style={[styles.flexRow, { backgroundColor: Colors.muted, padding: 4 }]}>
        <TouchableOpacity
          onPress={() => setCurrentTab('input')}
          style={[
            styles.flexOne,
            {
              padding: 8,
              borderRadius: 8,
              backgroundColor: currentTab === 'input' ? Colors.card : Colors.muted,
              alignItems: 'center',
            },
          ]}
        >
          <Text style={{ fontWeight: '600' }}>新規入力</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setCurrentTab('history')}
          style={[
            styles.flexOne,
            {
              padding: 8,
              borderRadius: 8,
              backgroundColor: currentTab === 'history' ? Colors.card : Colors.muted,
              alignItems: 'center',
            },
          ]}
        >
          <Text style={{ fontWeight: '600' }}>履歴</Text>
        </TouchableOpacity>
      </View>
      {currentTab === 'input' ? (
        <KeyboardAwareScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          enableOnAndroid
          extraScrollHeight={Platform.OS === 'ios' ? 20 : 30}
        >
          <View style={{ flex: 1, padding: 10 }}>
            <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
              <Text style={{ fontSize: 18, fontWeight: '600' }}>問題を入力</Text>
              <Text style={{ fontSize: 14, color: Colors.mutedForeground, marginTop: 2 }}>
                AIが科目・範囲・解答・解説を生成します
              </Text>
              <QuestionInput value={currentQuestion} onChange={setCurrentQuestion} />
              <TouchableOpacity
                onPress={fetchGeminiAnswer}
                disabled={loading}
                style={[
                  styles.flexRow,
                  {
                    height: 48,
                    borderRadius: 12,
                    backgroundColor: loading ? Colors.muted : Colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                  },
                ]}
              >
                {loading && <ActivityIndicator color="white" style={{ marginRight: 8 }} />}
                <Text style={{ fontSize: 16, color: 'white', fontWeight: '600' }}>
                  AI解答を生成
                </Text>
              </TouchableOpacity>
            </View>
            {showResults && (
              <View
                style={[
                  styles.card,
                  { padding: 16, borderWidth: 2, borderColor: Colors.primary },
                ]}
              >
                <Text style={{ fontWeight: 'bold', marginBottom: 8 }}>AI出力</Text>
                <Text style={{ fontSize: 14, lineHeight: 22 }}>{aiAnswer}</Text>
              </View>
            )}
          </View>
        </KeyboardAwareScrollView>
      ) : (
        <HistoryTab
          history={history}
          searchKeyword={searchKeyword}
          setSearchKeyword={setSearchKeyword}
          onDeleteHistory={deleteHistoryItem}
        />
      )}
    </View>
  );
};
export default QuestionAnswer;