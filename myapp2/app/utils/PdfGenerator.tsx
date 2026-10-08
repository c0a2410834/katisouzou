// ファイル名: utils/PdfGenerator.tsx カッコのみの行は除外
import * as Print from 'expo-print'; // インポート
import * as Sharing from 'expo-sharing'; // インポート
import { Alert } from 'react-native'; // インポート
interface MemoData {
  subject: string;
  date: string;
  text: string;
  tags: string[];
}
interface SubjectBreakdownData {
  subject: string;
  duration: number; // minutes
  percentage: number;
}
interface ReportDataPayload {
  totalDuration: number;
  totalPages: number;
  avgDaily: number;
  subjectData: SubjectBreakdownData[];
  reportType: 'week' | 'month';
}
interface GeneratedQuestionData {
  text: string;
  subject: string;
  difficulty: string;
  answer: string; // ★解答データを追加
}
const getHtmlHead = (title: string): string => `
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>
    <style>
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        padding: 20px; 
        font-size: 14px;
        line-height: 1.6;
        color: #333;
      }
      h1 { font-size: 24px; color: #000; margin-bottom: 20px; }
      h2 { font-size: 20px; color: #333; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px; }
      .card { 
        border: 1px solid #ddd; 
        border-radius: 8px; 
        padding: 16px; 
        margin-bottom: 20px; 
        background-color: #f9f9f9;
      }
      p { margin: 0 0 10px 0; }
      strong { color: #000; }
      .memo-item {
        border-bottom: 1px solid #eee;
        padding-bottom: 10px;
        margin-bottom: 10px;
      }
      .memo-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }
      .memo-header { font-size: 12px; color: #555; margin-bottom: 5px; }
      .memo-text { font-size: 14px; white-space: pre-wrap; }
      .report-summary p { font-size: 16px; }
      .subject-item { margin-bottom: 12px; }
      .subject-bar-bg { 
        background: #eee; 
        border-radius: 5px; 
        height: 12px; 
        overflow: hidden; 
        margin-top: 4px;
      }
      .subject-bar-fg { 
        background: #007AFF; 
        height: 100%; 
        border-radius: 5px;
      }
    </style>
  </head>
`;
const formatMinutesToHours = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
};
export const generatePdfFromHtml = async (htmlContent: string, dialogTitle: string = 'PDFを共有') => {
  try {
    const { uri } = await Print.printToFileAsync({
      html: htmlContent,
      base64: false,
    });
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: dialogTitle,
      UTI: '.pdf',
    });
  } catch (error) {
    console.error('PDFの生成または共有に失敗しました:', error);
    Alert.alert('エラー', 'PDFの処理中にエラーが発生しました。');
  }
};
export const createMemosHtml = (memos: MemoData[]): string => {
  const body = `
    <h1>学習メモ一覧</h1>
    <div class="card">
      ${memos.length > 0 ? memos.map(memo => `
        <div class="memo-item">
          <p class="memo-header">
            <strong>科目:</strong> ${memo.subject || 'その他'} | 
            <strong>日付:</strong> ${memo.date}
          </p>
          <p class="memo-text">${memo.text.replace(/\n/g, '<br>')}</p>
          ${memo.tags.length > 0 ? `<p class="memo-header">タグ: ${memo.tags.join(', ')}</p>` : ''}
        </div>
      `).join('') : '<p>保存されているメモはありません。</p>'}
    </div>
  `;
  return `
    <html>
      ${getHtmlHead('学習メモ一覧')}
      <body>
        ${body}
      </body>
    </html>
  `;
};
export const createReportHtml = (data: ReportDataPayload): string => {
  const body = `
    <h1>学習レポート (${data.reportType === 'week' ? '週間' : '月間'})</h1>
    <div class="card report-summary">
      <h2>概要</h2>
      <p><strong>合計時間:</strong> ${formatMinutesToHours(data.totalDuration)}</p>
      <p><strong>平均/日:</strong> ${formatMinutesToHours(data.avgDaily)}</p>
      <p><strong>総ページ:</strong> ${data.totalPages} ページ</p>
    </div>
    <div class="card">
      <h2>科目別学習時間</h2>
      ${data.subjectData.map((item: SubjectBreakdownData) => `
        <div class="subject-item">
          <p>
            <strong>${item.subject}</strong> 
            (${formatMinutesToHours(item.duration)}) - ${item.percentage}%
          </p>
          <div class="subject-bar-bg">
            <div class="subject-bar-fg" style="width: ${item.percentage}%;"></div>
          </div>
        </div>
      `).join('')}
    </div>
    <div class="card">
      <h2>学習グラフ</h2>
      <p>グラフやチャートのPDFエクスポートは現在サポートされていません。</p>
    </div>
  `;
  return `
    <html>
      ${getHtmlHead('学習レポート')}
      <body>
        ${body}
      </body>
    </html>
  `;
};
export const createAiQuestionsHtml = (
  questions: GeneratedQuestionData[],
  sourceQuestion?: string
): string => {
  const body = `
    <h1>AI生成問題</h1>
    ${sourceQuestion ? `
      <div class="card">
        <h2>元の問題</h2>
        <p>${sourceQuestion.replace(/\n/g, '<br>')}</p>
      </div>
    ` : ''}
    <div class="card">
      <h2>生成された問題一覧</h2>
      ${questions.length > 0 ? questions.map((q, index) => `
        <div class="memo-item">
          <p class="memo-header">
            <strong>問題 ${index + 1}</strong> | 
            <strong>科目:</strong> ${q.subject} | 
            <strong>難易度:</strong> ${q.difficulty}
          </p>
          <p class="memo-text">${q.text.replace(/\n/g, '<br>')}</p>
          <div style="margin-top: 10px; padding: 10px; background-color: #f0fdf4; border-radius: 6px; border: 1px solid #bbf7d0;">
            <strong style="color: #166534;">解答:</strong>
            <p style="margin: 4px 0 0 0; color: #1e293b;">${q.answer.replace(/\n/g, '<br>')}</p>
          </div> {/* HTML構文エラーを防ぐため元の改行置換処理に修正 */}
        </div>
      `).join('') : '<p>生成された問題はありません。</p>'}
    </div>
  `;
  return `
    <html>
      ${getHtmlHead('AI生成問題')}
      <body>
        ${body}
      </body>
    </html>
  `;
};
export default {};