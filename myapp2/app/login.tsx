import React, { useState } from 'react'; // インポート
import { Alert, Keyboard, Text, TextInput, TouchableOpacity, View, Platform, Modal, ScrollView } from 'react-native'; // インポート
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view'; // インポート
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail, sendEmailVerification, signOut } from 'firebase/auth'; // インポートにsendEmailVerificationとsignOutを追加
import { doc, setDoc, getDoc } from 'firebase/firestore'; // インポート
import { Colors, Icon, styles } from './definition'; // インポート
import { auth, db } from './firebase'; // インポート
interface LoginProps {
    onLoginSuccess: (email: string, username: string) => void; 
}
export default function Login({ onLoginSuccess }: LoginProps) {
    const [mode, setMode] = useState<'login' | 'register'>('login');
    const [email, setEmail] = useState('');
    const [username, setUsername] = useState(''); 
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isAgreed, setIsAgreed] = useState<boolean>(false); // 同意状態を管理する変数
    const [showTermsModal, setShowTermsModal] = useState<boolean>(false); // 規約モーダルの開閉状態を管理する変数
    const handleSubmit = async () => { 
        Keyboard.dismiss();
        if (!email.trim() || !password.trim()) {
            customSimpleAlert('入力エラー', 'メールアドレスとパスワードを入力してください。'); 
            return;
        }
        if (!email.includes('@')) {
            customSimpleAlert('入力エラー', '有効なメールアドレス形式で入力してください。'); 
            return;
        }
        if (password.length < 6) {
            customSimpleAlert('入力エラー', 'パスワードは6文字以上で入力してください。'); 
            return;
        }
        if (mode === 'register') {
            if (!username.trim()) {
                customSimpleAlert('入力エラー', 'ユーザー名を入力してください。'); 
                return;
            }
            if (password !== confirmPassword) {
                customSimpleAlert('入力エラー', 'パスワードが一致しません。確認用もう一度入力してください。'); 
                return;
            }
            if (!isAgreed) {
                customSimpleAlert('確認', '利用規約に同意する必要があります。'); // 未同意の場合はブロック
                return;
            }
            try { 
                const userCredential = await createUserWithEmailAndPassword(auth, email, password); 
                const user = userCredential.user; 
                await sendEmailVerification(user); // 新規登録したユーザーに認証メールを送信
                const cleanedEmail = user.email || email; 
                await setDoc(doc(db, 'users', cleanedEmail), { 
                    email: cleanedEmail, 
                    name: username 
                });
                await signOut(auth); // メールリンクを踏むまで一度サインアウトさせてガードする
                if (Platform.OS === 'web') { 
                    alert('確認メール送信: アカウントの仮登録が完了しました！入力されたメールアドレスに認証リンクを送信しました。メール内のリンクをタップしてからログインしてください。\n\n※届かない場合は迷惑メールフォルダをご確認ください。'); 
                    setMode('login'); // ログイン画面に切り替え
                    setPassword('');
                    setConfirmPassword('');
                } else {
                    Alert.alert('確認メール送信', 'アカウントの仮登録が完了しました！\n入力されたメールアドレスに認証リンクを送信しました。\nメール内のリンクをタップしてからログインしてください。\n\n※届かない場合は迷惑メールフォルダをご確認ください。', [
                        { text: 'OK', onPress: () => { setMode('login'); setPassword(''); setConfirmPassword(''); } } 
                    ]);
                }
            } catch (error: any) { 
                if (error.code === 'auth/email-already-in-use') { 
                    customSimpleAlert('登録失敗', 'このメールアドレスは既に登録されています。'); 
                } else {
                    customSimpleAlert('登録失敗', 'アカウントを作成できませんでした。'); 
                }
            }
        } else {
            try { 
                const userCredential = await signInWithEmailAndPassword(auth, email, password); 
                const user = userCredential.user; 
                await user.reload(); // サーバーから最新の認証状態を強制取得して更新
                if (!user.emailVerified) { // メール認証 of リンクを踏んでいるかチェック
                    await signOut(auth); // まだ踏んでいないなら即座にサインアウトさせて弾く
                    customSimpleAlert('認証未完了', 'メールアドレスの確認が完了していません。送信されたメール内のリンクをタップしてから再度ログインしてください。\n\n※届かない場合は迷惑メールフォルダをご確認ください。'); 
                    return;
                }
                const cleanedEmail = user.email || email; 
                const userDoc = await getDoc(doc(db, 'users', cleanedEmail)); 
                let savedName = cleanedEmail.split('@')[0]; 
                if (userDoc.exists() && userDoc.data().name) { 
                    savedName = userDoc.data().name; 
                }
                onLoginSuccess(cleanedEmail, savedName); 
            } catch (error: any) { 
                if (error.code === 'auth/user-not-found') { 
                    if (Platform.OS === 'web') { 
                        alert('アカウントがありません: 登録されていないメールアドレスです。新規登録画面へ切り替えます。'); 
                        setMode('register'); 
                    } else {
                        Alert.alert(
                            "アカウントがありません",
                            "入力されたメールアドレスは登録されていません。新規登録画面へ切り替えますか？",
                            [
                                { text: "キャンセル", style: "cancel" },
                                { text: "新規登録する", onPress: () => { setMode('register'); } } 
                            ]
                        );
                    }
                } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') { 
                    customSimpleAlert('ログイン失敗', 'メールアドレスまたはパスワードが正しくありません。'); 
                } else {
                    customSimpleAlert('ログイン失敗', 'ログインに失敗しました。入力内容を確認してください。'); 
                }
            }
        }
    };
    const handleForgotPassword = async () => { // パスワード再設定メールを送る関数
        if (!email.trim()) { // メールアドレスが未入力の場合
            customSimpleAlert('入力エラー', 'パスワードを再設定するには、まずメールアドレスを入力してください。'); // アラートを出す
            return; // 処理を中断
        } // 構文の閉じ
        try { // エラーハンドリング
            await sendPasswordResetEmail(auth, email); // Firebaseの関数を実行
            customSimpleAlert('メール送信完了', 'パスワード再設定用のメールを送信しました。メール内のリンクから再設定を行ってください。\n\n※メールが届かない場合は、迷惑メールフォルダやゴミ箱をご確認ください。'); // 迷惑メールの案内を追加
        } catch (error: any) { // エラー時の処理
            if (error.code === 'auth/user-not-found') { // ユーザーが見つからない場合
                customSimpleAlert('エラー', 'このメールアドレスは登録されていません。'); // アラートを出す
            } else { // その他のエラー
                customSimpleAlert('エラー', 'メールの送信に失敗しました。'); // アラートを出す
            } // 構文の閉じ
        } // 構文の閉じ
    }; // 関数の閉じ
    const customSimpleAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') { 
            alert(`${title}: ${message}`); 
        } else {
            Alert.alert(title, message); 
        }
    };
    return (
        <KeyboardAwareScrollView
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24 }}
            keyboardShouldPersistTaps="handled"
        >
            <View style={{ alignItems: 'center', marginBottom: 40 }}>
                <View style={[styles.headerIconContainer, { width: 64, height: 64, borderRadius: 20, marginRight: 0, marginBottom: 16 }]}>
                    <Icon name="Sparkles" style={{ fontSize: 32, color: 'white' }} />
                </View>
                <Text style={{ fontSize: 28, fontWeight: 'bold', color: Colors.foreground }}>Aicademy</Text>
                <Text style={[styles.textMd, styles.textMutedForeground, { marginTop: 4 }]}>
                    {mode === 'login' ? 'おかえりなさい！ログインしてください' : '新しくアカウントを作成しましょう'}
                </Text>
            </View>
            <View style={[styles.card, { padding: 24, backgroundColor: Colors.card }]}>
                {mode === 'register' && (
                    <>
                        <Text style={styles.label}>ユーザー名</Text>
                        <TextInput
                            style={[styles.inputBase, { marginBottom: 16 }]}
                            value={username}
                            onChangeText={setUsername}
                            placeholder="例: 佐藤"
                            placeholderTextColor="#94a3b8" 
                        />
                    </>
                )}
                <Text style={styles.label}>メールアドレス</Text>
                <TextInput
                    style={[styles.inputBase, { marginBottom: 16 }]}
                    value={email}
                    onChangeText={setEmail}
                    placeholder="example@mail.com"
                    placeholderTextColor="#94a3b8" 
                    keyboardType="email-address"
                    autoCapitalize="none"
                />
                <Text style={styles.label}>パスワード</Text>
                <TextInput
                    style={[styles.inputBase, { marginBottom: mode === 'register' ? 16 : 24 }]}
                    value={password}
                    onChangeText={setPassword}
                    placeholder="6文字以上のパスワード"
                    placeholderTextColor="#94a3b8" 
                    secureTextEntry
                    autoCapitalize="none"
                />
                <TouchableOpacity onPress={handleForgotPassword} style={{ alignSelf: 'flex-end', marginBottom: 24, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 13, color: Colors.primary, fontWeight: '600', textDecorationLine: 'underline' }}>パスワードを忘れた方はこちら</Text>
                </TouchableOpacity>
                {mode === 'register' && (
                    <>
                        <Text style={styles.label}>パスワード（確認）</Text>
                        <TextInput
                            style={[styles.inputBase, { marginBottom: 24 }]}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder="もう一度パスワードを入力"
                            placeholderTextColor="#94a3b8" 
                    secureTextEntry
                    autoCapitalize="none"
                        />
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24, paddingHorizontal: 4, flexWrap: 'wrap' }}> 
                            <TouchableOpacity onPress={() => setIsAgreed(!isAgreed)} style={{ marginRight: 8 }}> 
                                <Icon name={isAgreed ? 'Check' : 'Square'} style={{ color: isAgreed ? Colors.primary : '#71717a', fontSize: 20 }} /> 
                            </TouchableOpacity> 
                            <Text style={{ fontSize: 14, color: Colors.foreground }}>
                                <TouchableOpacity onPress={() => setShowTermsModal(true)}>
                                    <Text style={{ color: Colors.primary, fontWeight: 'bold', textDecorationLine: 'underline' }}>利用規約</Text>
                                </TouchableOpacity>
                                に同意する
                            </Text> 
                        </View>
                    </>
                )}
                <TouchableOpacity onPress={handleSubmit} style={styles.buttonPrimary}>
                    <Text style={styles.buttonText}>
                        {mode === 'login' ? 'ログイン' : '新規アカウント登録'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    onPress={() => {
                        setMode(mode === 'login' ? 'register' : 'login');
                        setPassword('');
                        setConfirmPassword('');
                        setUsername('');
                        setIsAgreed(false); 
                    }}
                    style={{ marginTop: 20, alignItems: 'center' }}
                >
                    <Text style={[styles.textMd, { color: Colors.primary, fontWeight: '600' }]}>
                        {mode === 'login' ? '新規登録はこちら' : 'すでにアカウントをお持ちの方はこちら'}
                    </Text>
                </TouchableOpacity>
            </View>
            <Modal visible={showTermsModal} animationType="slide" transparent={true}>
                <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                    <View style={{ backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '80%' }}>
                        <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.foreground, marginBottom: 15 }}>利用規約</Text>
                        <ScrollView style={{ marginBottom: 20 }}>
                            <View style={{ backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, marginBottom: 15 }}>
                                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1e40af', marginBottom: 4 }}>【最重要コアルール】</Text>
                                <Text style={{ fontSize: 12, color: '#1e40af', lineHeight: 18 }}>
                                    ・離席（荷物放置）は最大30分までとします。{"\n"}
                                    ・入退室時は必ず現地QRコードスキャンを実行してください。
                                </Text>
                            </View>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.foreground, marginBottom: 4 }}>第1条（利用資格）</Text>
                            <Text style={{ fontSize: 13, color: Colors.foreground, lineHeight: 20, marginBottom: 12 }}>勉強、自習、読書、研究などの学習活動を目的とした方のみが本システムおよび座席を利用可能です。不適切な目的での利用と判断された場合は利用制限を行うことがあります。</Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.foreground, marginBottom: 4 }}>第2条（利用時間制限と自動解放）</Text>
                            <Text style={{ fontSize: 13, color: Colors.foreground, lineHeight: 20, marginBottom: 12 }}>座席の利用時間に原則一律の制限はありません。ただし、座席が満席に近い状態などの混雑時は、より多くの利用希望者が公平に利用できるよう【1回3時間以内】を目安とした利用にご協力いただくものとし、システムによりスロットが自動解放される場合があることに同意するものとします。</Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.foreground, marginBottom: 4 }}>第3条（座席の上書きチェックイン仕様）</Text>
                            <Text style={{ fontSize: 13, color: Colors.foreground, lineHeight: 20, marginBottom: 12 }}>前の利用者が退席手続きを忘れて退出した（放置席）と客観的に判断される場合, 次に現地の席を正当に利用しようとする者がQRコードを読み込むことで、既存の利用ステータスを上書きしてチェックインできる仕様を承認するものとします。</Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.foreground, marginBottom: 4 }}>第4条（禁止事項）</Text>
                            <Text style={{ fontSize: 13, color: Colors.foreground, lineHeight: 20, marginBottom: 12 }}>他人のアカウントを用いた不正チェックイン、同一人物による複数端末を用いた複数席の同時占有、および30分を超える長時間の荷物放置行為を禁止します。</Text>
                            <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.foreground, marginBottom: 4 }}>第5条（個人情報の取り扱いおよび実証実験に関する同意）</Text> {/* 追記箇所 */}
                            <Text style={{ fontSize: 13, color: Colors.foreground, lineHeight: 20 }}>本システムは「価値創造実践」におけるプロトタイプ（実証実験版）です。アカウント登録時に取得したメールアドレスおよびユーザー名は、システムのログイン認証、およびユーザーからの不具合報告・意見箱への返信対応のみに使用し、他の目的には一切利用いたしません。また、登録データはFirebase内にて厳重に管理され、第三者へ開示・提供されることはありません。</Text> {/* 追記箇所 */}
                        </ScrollView>
                        <TouchableOpacity style={styles.buttonSecondary} onPress={() => setShowTermsModal(false)}>
                            <Text style={{ color: Colors.foreground, fontWeight: 'bold' }}>閉じる</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </KeyboardAwareScrollView>
    );
}