# AICADEMY

<img width="180" height="180" alt="image" src="https://github.com/user-attachments/assets/e96c0eb1-63c7-4ee6-a73b-047767c5a400" />

> **生成AI（Gemini 2.5 Flash + Serper RAG）によるサポート × リアルタイム自習室予約＆コミュニティ管理 Webプラットフォーム**

AICADEMYは、学習者の「疑問解消」「類似問題生成」「学習分析・タイマー」「コミュニティイベント」「自習室の即時チェックイン」をワンストップで提供する、**スマートフォン操作特化型（モバイルファースト）Webアプリケーション**です。

アプリのインストールは不要で、スマートフォンの標準Webブラウザ（iOS Safari / Android Chrome）から直接すべての機能を利用できます。

---

## 📖 目次
1. [プロダクト概要](#-プロダクト概要)
2. [主要機能の詳細](#-主要機能の詳細)
3. [スマホ利用（モバイルUX）へのこだわり](#-スマホ利用モバイルuxへのこだわり)
4. [技術スタック](#-技術スタック)
5. [プロジェクト構造](#-プロジェクト構造)
6. [開発環境構築・クローン手順](#-開発環境構築クローン手順)
7. [Web反映・デプロイ手順](#-web反映デプロイ手順)

---

## 💡 プロダクト概要

学習者が抱える「問題の解説が難しくて理解できない」「類似問題で復習したいが探す手間がかかる」「自習室の放置席が多くて座れない」「学習時間の管理やモチベーション維持が難しい」といった課題を、スマートフォン1台で解決するために開発されました。

1. **正確無比なAIチューター（RAGパイプライン）**  
   最新の時事データや資格情報をWeb検索で取得し、ハルシネーション（嘘の出力）を極限まで抑制した信頼性の高い解説と類似問題を作成。
2. **スマホカメラ連携の自習室管理システム**  
   アプリ不要でスマホのブラウザカメラから直接QRコードをスキャンして着席。放置席に対する上書きチェックインや、月・曜日ごとの自動営業時間判定を完備。
3. **学習モチベーション＆データ分析**  
   ストップウォッチ・タイマー・タイムアタックテスト・折れ線グラフによる学習時間推移（`react-native-chart-kit`）とクラウドメモ機能を搭載。

---

## ✨ 主要機能の詳細

### 1. 🤖 AI学習サポートメニュー（`ai_anser.tsx`, `ai_create.tsx`）
* **自律ツール呼び出し型RAG（解答解説）**: Google Gemini API (`gemini-2.5-flash`) に `google_serper_search` ツールを組み込み、ファクトチェックが必要な問題に対してAIが自律的に検索を発行して正確な回答を生成。
* **数学・計算問題の高速処理スキップ**: 数学系キーワード（因数分解、微分、方程式、ルート等）を検知すると無駄なWeb検索をスキップし、高速に回答を出力する最適化ロジック（`shouldSkipSearch`）を搭載。
* **厳格なLaTeX数式出力制御**: 数式・分数はプロンプトレベルで `$x^2$` や `\frac{a}{b}` などの標準LaTeX構文に強制フォーマット。数式崩れを防護。
* **AI類似問題生成＆印刷用PDFエクスポート**: 「範囲指定」または「過去の解答履歴」から類似問題を自動作成。`PdfGenerator` ユーティリティと連携し、ワンタップで印刷可能なPDFとして保存・出力可能。

### 2. 🪑 リアルタイム自習室予約・QRチェックイン（`seat.tsx`）
* **インタラクティブ座席マップ**: 窓側（`W-1`〜`W-4`）および島側（`A-1`〜`D-4`）の空き状況をリアルタイム表示。
* **ブラウザQRコード解析（`jsQR`）**: アプリ不要で、スマホの標準カメラを使って直接QRコードを読み取り着席。
* **放置席の上書きチェックイン**: 前の利用者が退席手続きを忘れて離席した場合でも、現地の利用者がQRコードをスキャンして着席状態を正当に更新可能。
* **自動クリーンアップ＆営業時間判定**: 月や曜日（5〜9月は18時閉館、10〜2月は16時閉館等）に応じた自動制御および期限切れ予約の自動消去。

### 3. ⏱ 学習計測・テスト・分析（`timer.tsx`, `report.tsx`, `test.tsx`, `memo.tsx`）
* **多機能学習タイマー**: バックグラウンド経過時間（`AppState`）に対応したストップウォッチ、バイブレーション付きカウントダウンタイマー、手動時間入力。
* **タイムアタックテスト**: 3秒カウントダウンからの180秒制限時間型ゲーム。ランダム出題、回答正規化判定、振り返りビュー。
* **学習統計レポート**: `react-native-chart-kit` の LineChart による週間/月間の学習時間・ページ数推移グラフ。
* **クラウド学習メモ**: Firebase Firestore とリアルタイム同期される科目・タグ付きメモ帳。

### 4. 🗓 イベント＆コミュニティ広告（`event.tsx`）
* **Firestore リアルタイム配信**: 「注目イベント」「初心者・新入生向け」「キャリア・演習プロジェクト」の3カテゴリをリアルタイム描画。
* **動的セクションタイトル**: Firestoreの `sectionConfigs` に基づき、管理画面からセクション名をリアルタイム変更可能。

### 5. 👑 最高管理者コントロールパネル（`admin.tsx`）
* **ロールベースアクセス制御（RBAC）**: ログインユーザーの特定UIDを識別し、管理者のみに管理者タブを動的表示。
* **一斉お知らせ配信 & 意見箱レスポンス**: 全ユーザーへの一斉お知らせ作成、およびユーザーからの不具合報告・意見箱へのスレッド形式返信機能。

### 6. 👤 アカウント認証＆マイページ（`login.tsx`, `mypage.tsx`）
* **安全なメール認証ガード**: `sendEmailVerification` による仮登録状態ガード、パスワード再設定機能。
* **目標設定＆セキュリティ**: 今週の目標学習時間・目標資格設定、パスワード再認証付きのメール変更・アカウント削除。

---

## 📱 スマホ利用（モバイルUX）へのこだわり

本システムは、ユーザーが**スマートフォンで快適に操作すること**を主軸に設計されています。

1. **アプリ不要のブラウザカメラQRスキャン（`jsQR`）**  
   Web標準のカメラ機能（`<video>` / `<canvas>`）と `jsQR` ライブラリを組み合わせ、専用ネイティブアプリをインストールさせることなくスマホのブラウザ上で直接座席QRコードを高速デコードします。
2. **iOS Safariの自動ズーム防止設計（`fontSize: 16`）**  
   iPhoneのSafariブラウザでフォーム入力時に入力欄が自動拡大されてレイアウトが崩れるストレスを防ぐため、全テキスト入力欄（`TextInput`）の文字サイズを `16px` 以上で統一設計。
3. **PWA（ホーム画面追加）対応**  
   iOS SafariやAndroid Chromeの「ホーム画面に追加」機能に対応するため、専用のタッチアイコン（`apple-touch-icon.png`, `android-touch-icon-192.png`, `android-touch-icon-512.png`）をビルド時に自動配置。

---

## 🛠 技術スタック

| カテゴリ | 技術 / ライブラリ |
| :--- | :--- |
| **フロントエンド** | React Native Web, Expo Router (SDK 51+), TypeScript |
| **ホスティング / デプロイ** | **Vercel** (`vercel --prod`) |
| **ルーティング / 画面構成** | Expo Router, `react-native-safe-area-context`, `KeyboardAwareScrollView` |
| **アイコン・UI** | `lucide-react-native`, カスタムデザインシステム (`definition.tsx`) |
| **データベース / バックエンド** | Firebase Cloud Firestore (リアルタイムリスナー `onSnapshot`) |
| **認証 (Auth)** | Firebase Authentication (`getReactNativePersistence` / `AsyncStorage`) |
| **生成AI / RAG API** | Google Gemini API (`models/gemini-2.5-flash`), Serper API (`google.serper.dev`) |
| **Webカメラ / QR解析** | HTML5 `<video>`, `<canvas>`, `jsQR` |
| **グラフ・分析** | `react-native-chart-kit` |

---

## 📁 プロジェクト構造

```text
.
├── _layout.tsx       # Root Layout (Expo Router, Web PWA / タッチアイコン設定)
├── admin.tsx         # 管理者ダッシュボード (お知らせ配信, イベントCRUD, 意見箱返信)
├── ai_anser.tsx      # AI解答・解説生成 (Serper RAG, Gemini 2.5 Flash, 履歴検索)
├── ai_create.tsx     # AI類似問題生成 (LaTeXプロンプト制御, PDFエクスポート)
├── definition.tsx    # 共通型定義, カラーパレット, Iconマッピング, ユーティリティ
├── event.tsx         # 地域・学内イベント一覧 (Firestore onSnapshotリアルタイム描画)
├── firebase.ts       # Firebase初期化設定 (Auth Persistence, Firestore)
├── index.tsx         # メインエントリーポイント (認証監視, タブナビゲーション, RBAC, ヘッダー)
├── learning.tsx      # 学習サポートメニュー (サブタブ切替コンポーネント)
├── login.tsx         # ログイン・新規登録・メール認証・規約モーダル画面
├── memo.tsx          # クラウド学習メモ作成・履歴管理画面
├── mypage.tsx        # マイページ (目標設定, メール変更, アカウント削除, 報告履歴)
├── report.tsx        # 学習統計分析レポート (LineChartグラフ表示, 科目別内訳)
├── seat.tsx          # 自習室座席マップ・WebカメラQR予約・上書きチェックイン画面
├── test.tsx          # タイムアタックテストゲーム画面 (カウントダウン, 振り返り)
├── timer.tsx         # ストップウォッチ・カウントダウンタイマー・手動時間入力画面
└── utils/
    └── PdfGenerator.ts # 生成された問題のHTML/PDF変換ユーティリティ
```

---

## 💻 開発環境構築・クローン手順

ローカル環境でプロジェクトを実行・開発するための手順です。

1. **GitHubからリポジトリをクローンする**  
   ターミナルまたはコマンドプロンプトを開き、以下のコマンドを実行してプロジェクトを取得します。

   ```bash
   git clone [https://github.com/c0a2410834/kenkysitu.git](https://github.com/c0a2410834/kenkysitu.git)
   cd kenkysitu
   ```

2. **依存パッケージをインストールする**  
   プロジェクトディレクトリ内で必要なライブラリをまとめてインストールします。

   ```bash
   npm install
   ```

3. **ローカル開発サーバー（Webモード）を起動する**  
   以下のコマンドを実行し、ブラウザ上でローカル動作確認を行います。

   ```bash
   npx expo start --web
   ```

---

## 🚀 Web反映・デプロイ手順

Web上に変更を反映させ、本番URLを発行する際の手順です。

1. **一括ビルド＆デプロイコマンドを実行する**  
   Windowsのコマンドプロンプト（CMD）を開き、以下のコマンドを一括実行して「環境変数セット」「Web静的エクスポート」「PWAアイコン同期」「Vercel本番デプロイ」を行います。

   ```cmd
   set "EXPO_PUBLIC_GEMINI_API_KEY=<YOUR_GEMINI_API_KEY>" && set "EXPO_PUBLIC_SERPER_API_KEY=<YOUR_SERPER_API_KEY>" && npx expo export -p web && copy assets\images\apple-touch-icon.png dist\apple-touch-icon.png /Y && copy assets\images\android-touch-icon-192.png dist\android-touch-icon-192.png /Y && copy assets\images\android-touch-icon-512.png dist\android-touch-icon-512.png /Y && vercel --prod --cwd dist
   ```

2. **発行されたWeb用本番URLを取得・確認する**  
   コマンド完了後、ターミナルの最下部に表示されるURLを確認します。

   ```text
   ✅ Deployed to production.
   Production: https://<your-project-name>.vercel.app
   ```

3. **スマートフォンのブラウザで反映確認を行う**  
   発行された `Production:` のURLにスマホのブラウザ（iOS Safari / Android Chrome）からアクセスし、動作確認を行います。

## 📊 発表資料
* 📄 [AICADEMY 発表スライド (PDF)](./docs/AICADEMY_presentation.pdf)
