// ルートレイアウトコンポーネント
import { Stack } from "expo-router"; 
import Head from "expo-router/head"; 

export default function RootLayout() {
  return (
    <>
      <Head>
        {/* Apple（iOS）用の既存設定 */}
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* ★Android Chromeのショートカット用設定（これを追加） */}
        <link rel="icon" type="image/png" sizes="192x192" href="/android-touch-icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/android-touch-icon-512.png" />
      </Head>

      {/* 既存の処理をそのまま維持 */}
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
