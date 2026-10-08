// ファイル名: mypage.tsx カッコのみの行は除外
import React, { useState, useEffect } from 'react'; // コメントは真横に書く
import { View, Text, TouchableOpacity, Image, Modal, ScrollView, TextInput, Alert, Platform } from 'react-native'; // インポート
import AsyncStorage from '@react-native-async-storage/async-storage'; // インポート
import { doc, setDoc, getDoc, deleteDoc, collection, addDoc, query, where, onSnapshot } from 'firebase/firestore'; // インポート
import { getAuth, reauthenticateWithCredential, EmailAuthProvider, deleteUser, updateEmail } from 'firebase/auth'; // インポート
import { db } from './firebase'; // インポート
import { Colors, Icon, styles } from './definition'; // インポート
interface MyPageProps {
    userName: string; 
    userEmail: string; 
    avatarUri: string | null; 
    pickAvatarImage: () => Promise<string | null | void>; 
    handleLogout: () => void; 
}
interface ReportHistoryType { 
    id: string;
    type: 'bug' | 'feedback' | 'impression'; 
    content: string;
    createdAt: string;
    replyText?: string;
    repliedAt?: string;
    status: string;
}
const MyPage: React.FC<MyPageProps> = ({ userName: initialName, userEmail: initialEmail, avatarUri, pickAvatarImage, handleLogout }) => {
    const [modalType, setModalType] = useState<string | null>(null); 
    const [reportType, setReportType] = useState<'bug' | 'feedback' | 'impression'>('bug'); 
    const [reportText, setReportText] = useState(''); 
    const [isSubmitting, setIsSubmitting] = useState(false); 
    const [name, setName] = useState(initialName); 
    const [email, setEmail] = useState(initialEmail); 
    const [target, setTarget] = useState(''); 
    const [reward, setReward] = useState(''); 
    const [goalHours, setGoalHours] = useState(''); 
    const [grade, setGrade] = useState(''); 
    const [editName, setEditName] = useState(initialName);
    const [editTarget, setEditTarget] = useState(''); 
    const [editReward, setEditReward] = useState(''); 
    const [editGoalHours, setEditGoalHours] = useState(''); 
    const [editGrade, setEditGrade] = useState(''); 
    const [deletePassword, setDeletePassword] = useState(''); 
    const [newEmail, setNewEmail] = useState(''); 
    const [confirmPasswordForEmail, setConfirmPasswordForEmail] = useState(''); 
    const [expandedTerm, setExpandedTerm] = useState<number | null>(null); 
    const [reportHistory, setReportHistory] = useState<ReportHistoryType[]>([]); 
    const maskEmail = (rawEmail: string) => { // メアドをマスクする軽量関数
        if (!rawEmail.includes('@')) return rawEmail; // ＠がないならそのまま返す
        const [local, domain] = rawEmail.split('@'); // ＠で前後分割
        if (local.length <= 4) return `${local.substring(0, 1)}***@${domain}`; // 4文字以下は1文字残し
        return `${local.substring(0, 5)}*******@${domain}`; // 5文字残してアスタリスクで隠す
    }; // 関数の閉じ
    useEffect(() => {
        setName(initialName); 
        setEmail(initialEmail); 
        setEditName(initialName);
    }, [initialName, initialEmail]); 
    useEffect(() => {
        if (!initialEmail) return;
        const fetchProfile = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'users', initialEmail));
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    if (data.target) { setTarget(data.target); setEditTarget(data.target); }
                    if (data.reward) { setReward(data.reward); setEditReward(data.reward); }
                    if (data.goalHours) { setGoalHours(data.goalHours); setEditGoalHours(data.goalHours); }
                    if (data.grade) { setGrade(data.grade); setEditGrade(data.grade); } 
                }
            } catch (e) {
                console.log(e);
            }
        };
        fetchProfile();
    }, [initialEmail]);
    useEffect(() => { 
        if (!initialEmail) return;
        const q = query(collection(db, 'reports'), where('userId', '==', initialEmail)); 
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const history: ReportHistoryType[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                let createdStr = ''; 
                if (data.createdAt) {
                    if (data.createdAt && typeof data.createdAt.seconds === 'number') {
                        const d = new Date(data.createdAt.seconds * 1000);
                        createdStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    } else { createdStr = String(data.createdAt); }
                } else { createdStr = data.date || ''; }
                let replyTimeStr = '';
                if (data.repliedAt) {
                    if (data.repliedAt && typeof data.repliedAt.seconds === 'number') {
                        const d = new Date(data.repliedAt.seconds * 1000);
                        replyTimeStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
                    } else { replyTimeStr = String(data.repliedAt); }
                }
                history.push({
                    id: doc.id,
                    type: data.type || 'bug',
                    content: data.content || '',
                    createdAt: createdStr,
                    replyText: data.replyText || '', 
                    repliedAt: replyTimeStr, 
                    status: data.status || 'unread'
                });
            });
            history.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))); 
            setReportHistory(history);
        }, (error) => {
            console.log('履歴取得失敗:', error);
        });
        return () => unsubscribe(); 
    }, [initialEmail]);
    const handlePickImage = async () => {
        await pickAvatarImage(); 
    };
    const handleOpenEdit = () => {
        setEditName(name); setEditTarget(target); setEditReward(reward); setEditGoalHours(goalHours); setEditGrade(grade); 
        setModalType('profileEdit');
    };
    const handleSaveProfile = async () => {
        if (!email) return;
        if (!editName.trim()) {
            if (Platform.OS === 'web') alert('エラー: ユーザー名を入力してください。');
            else Alert.alert('エラー', 'ユーザー名を入力してください。');
            return;
        }
        try {
            await setDoc(doc(db, 'users', email), {
                name: editName.trim(),
                target: editTarget,
                reward: editReward,
                goalHours: editGoalHours,
                grade: editGrade.trim() 
            }, { merge: true });
            await AsyncStorage.setItem('userName', editName.trim());
            setName(editName.trim()); setTarget(editTarget); setReward(editReward); setGoalHours(editGoalHours); setGrade(editGrade.trim()); 
            setModalType(null);
            if (Platform.OS === 'web') alert('保存完了: プロフィールを更新しました！');
            else Alert.alert('保存完了', 'プロフィールを更新しました！');
        } catch (e) {
            console.log(e);
        }
    };
    const handleUpdateEmail = async () => { 
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user || !email || !newEmail.trim() || !confirmPasswordForEmail) return;
        try {
            const credential = EmailAuthProvider.credential(email, confirmPasswordForEmail);
            await reauthenticateWithCredential(user, credential); 
            await updateEmail(user, newEmail.trim()); 
            await setDoc(doc(db, 'users', newEmail.trim()), { email: newEmail.trim(), name: name }, { merge: true }); 
            setEmail(newEmail.trim()); setNewEmail(''); setConfirmPasswordForEmail(''); setModalType(null);
            if (Platform.OS === 'web') alert('変更完了: メールアドレスを更新しました。');
            else Alert.alert('変更完了', 'メールアドレスを更新しました。');
        } catch (e: any) {
            console.log(e);
            if (Platform.OS === 'web') alert('エラー: パスワードが正しくないか、変更に失敗しました。');
            else Alert.alert('エラー', 'パスワードが正しくないか、変更に失敗しました。');
        }
    };
    const handleConfirmLogout = () => {
        if (Platform.OS === 'web') {
            const result = window.confirm('ログアウトしますか？');
            if (result) handleLogout();
        } else {
            Alert.alert('ログアウト', '本当にログアウトしますか？', [
                { text: 'キャンセル', style: 'cancel' },
                { text: 'ログアウト', style: 'destructive', onPress: handleLogout }
            ]);
        }
    };
    const handleDeleteAccount = async () => {
        const auth = getAuth();
        const user = auth.currentUser;
        if (!user || !email || !deletePassword) return;
        try {
            const credential = EmailAuthProvider.credential(email, deletePassword);
            await reauthenticateWithCredential(user, credential);
            await deleteDoc(doc(db, 'users', email));
            await deleteUser(user);
            setModalType(null); setDeletePassword(''); handleLogout();
            if (Platform.OS === 'web') alert('退会完了: アカウントを完全に削除しました。');
            else Alert.alert('退会完了', 'アカウントを完全に削除しました。');
        } catch (e: any) {
            console.log(e);
            if (Platform.OS === 'web') alert('エラー: パスワードが正しくないか、削除に失敗しました。');
            else Alert.alert('エラー', 'パスワードが正しくないか、削除に失敗しました。');
        }
    };
    const handleSendReport = async () => {
        if (isSubmitting) return; 
        const trimmedText = reportText.trim();
        if (!trimmedText) {
            if (Platform.OS === 'web') alert('エラー: 内容を入力してください。');
            else Alert.alert('エラー', '内容を入力してください。');
            return;
        }
        if (trimmedText.length > 500) { 
            if (Platform.OS === 'web') alert('エラー: 内容は500文字以内で入力してください。');
            else Alert.alert('エラー', '内容は500文字以内で入力してください。');
            return;
        }
        try {
            setIsSubmitting(true); 
            const now = new Date(); 
            const y = now.getFullYear();
            const m = String(now.getMonth() + 1).padStart(2, '0');
            const d = String(now.getDate()).padStart(2, '0');
            const h = String(now.getHours()).padStart(2, '0');
            const min = String(now.getMinutes()).padStart(2, '0');
            const timestampStr = `${y}-${m}-${d} ${h}:${min}`;
            await addDoc(collection(db, 'reports'), { 
                userId: email || 'anonymous',
                userName: name || 'ゲスト',
                type: reportType === 'bug' ? 'bug' : 'opinion', 
                content: trimmedText,
                createdAt: timestampStr,
                date: timestampStr,
                replyText: '', 
                repliedAt: '', 
                status: 'unread'
            });
            setReportText(''); 
            if (Platform.OS === 'web') alert('送信完了: ご協力ありがとうございました。');
            else Alert.alert('送信完了', 'ご協力ありがとうございました。'); 
        } catch (e) {
            console.log('報告送信失敗:', e);
        } finally {
            setIsSubmitting(false); 
        }
    };
    const handleCloseModal = () => {
        setModalType(null); setDeletePassword(''); setNewEmail(''); setConfirmPasswordForEmail(''); setExpandedTerm(null); 
    };
    const toggleTerm = (index: number) => {
        setExpandedTerm(expandedTerm === index ? null : index); 
    };
    const getTypeLabel = (type: 'bug' | 'feedback' | 'impression') => {
        if (type === 'bug') return '不具合報告';
        if (type === 'feedback') return '意見・要望';
        return 'アプリの感想';
    };
    const getPlaceholderText = () => {
        if (reportType === 'bug') return '不具合の内容をご記入ください(500文字以内)';
        if (reportType === 'feedback') return '改善へのご意見やご要望をご記入ください(500文字以内)';
        return 'アプリを使ってみた感想をご記入ください(500文字以内)';
    };
    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 10 }}>
            <View style={[styles.card, { padding: 14, marginTop: 5, marginBottom: 5 }]}>
                <View style={{ alignItems: 'center', marginBottom: 10, paddingVertical: 5 }}>
                    <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 8 }} /> 
                        ) : (
                            <View style={[styles.headerIconContainer, { backgroundColor: Colors.border, width: 64, height: 64, borderRadius: 32, marginRight: 0, marginBottom: 8 }]}>
                                <Icon name="User" style={{ fontSize: 28, color: Colors.mutedForeground }} />
                            </View>
                        )}
                        <Text style={[styles.textSm, { color: Colors.primary, textAlign: 'center', marginBottom: 6, fontWeight: '600' }]}>画像をカスタム</Text>
                    </TouchableOpacity>
                    <Text style={[styles.text2xl, styles.textBold]}>{name} さん</Text>
                    <Text style={[styles.textSm, styles.textMutedForeground, { marginTop: 2 }]}>{maskEmail(email)}</Text>
                </View>
                <View style={[styles.infoBox, { marginBottom: 15, padding: 10 }]}>
                    <Text style={[styles.textSm, { color: Colors.foreground, textAlign: 'center' }]}>会員ステータス: {grade || '未設定'}</Text>
                </View>
                <View style={{ width: '100%', padding: 12, backgroundColor: Colors.muted, borderRadius: 12, marginBottom: 15 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.foreground }}>🎯 目標設定ルーム</Text>
                        <TouchableOpacity onPress={handleOpenEdit}>
                            <Text style={{ fontSize: 14, color: Colors.primary, fontWeight: '600' }}>設定を変更</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 14, color: Colors.mutedForeground, marginBottom: 4 }}>【現在のターゲット】</Text>
                    <Text style={{ fontSize: 15, color: Colors.foreground, marginBottom: 10, fontWeight: '600' }}>{target || '未設定'}</Text>
                    <Text style={{ fontSize: 14, color: Colors.mutedForeground, marginBottom: 4 }}>【達成時のご褒美 / 決意表明】</Text>
                    <Text style={{ fontSize: 15, color: Colors.foreground, marginBottom: 10 }}>{reward || '未設定'}</Text>
                    <Text style={{ fontSize: 14, color: Colors.mutedForeground, marginBottom: 4 }}>【今週の目標学習時間】</Text>
                    <Text style={{ fontSize: 15, color: Colors.foreground }}>{goalHours ? `${goalHours} 時間` : '未設定'}</Text>
                </View>
                <View style={{ width: '100%', marginBottom: 15, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: 4 }}>
                    <TouchableOpacity style={{ width: '100%', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }} onPress={() => setModalType('help')}>
                        <Text style={{ fontSize: 14, color: Colors.foreground, fontWeight: '500' }}>❓ ヘルプ・よくある質問</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ width: '100%', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }} onPress={() => setModalType('terms')}>
                        <Text style={{ fontSize: 14, color: Colors.foreground, fontWeight: '500' }}>📖 利用規約 (G-STUDY BASE)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ width: '100%', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }} onPress={() => setModalType('report')}>
                        <Text style={{ fontSize: 14, color: Colors.foreground, fontWeight: '500' }}>✉️ 意見・感想・不具合の報告</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={{ width: '100%', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border }} onPress={() => setModalType('emailEdit')}>
                        <Text style={{ fontSize: 14, color: Colors.foreground, fontWeight: '500' }}>📧 メールアドレスの変更</Text>
                    </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleConfirmLogout} style={[styles.timerButtonDanger, { height: 40, marginBottom: 15 }]}>
                    <Text style={styles.buttonText}>ログアウト</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => setModalType('deleteAccount')} style={{ alignItems: 'center', paddingVertical: 4 }}>
                    <Text style={{ fontSize: 12, color: Colors.mutedForeground, textDecorationLine: 'underline' }}>アカウントの削除（退会）</Text>
                </TouchableOpacity>
                <Modal visible={modalType !== null} animationType="slide" transparent={true}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
                        <View style={{ backgroundColor: Colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' }}>
                            <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.foreground, marginBottom: 15 }}>
                                {modalType === 'help' && 'ヘルプ・よくある質問'}
                                {modalType === 'terms' && '利用規約 (G-STUDY BASE)'}
                                {modalType === 'report' && 'お問い合わせ・意見・感想'}
                                {modalType === 'profileEdit' && 'プロフィール・目標の設定'}
                                {modalType === 'deleteAccount' && 'アカウントの完全削除'}
                                {modalType === 'emailEdit' && 'メールアドレスの変更'}
                            </Text>
                            <ScrollView style={{ marginBottom: 20 }}>
                                {modalType === 'help' && (
                                    <Text style={{ fontSize: 14, color: Colors.foreground, lineHeight: 22 }}>
                                        Q. QRコードが読み取れない{"\n"}A. レンズを拭くか、手動申請をしてください。{"\n"}{"\n"}
                                        Q. キャンセルはいつまで？{"\n"}A. 利用開始時間の10分前までとなります。
                                    </Text>
                                )}
                                {modalType === 'terms' && (
                                    <View>
                                        <View style={{ backgroundColor: '#eff6ff', padding: 12, borderRadius: 8, marginBottom: 15 }}>
                                            <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#1e40af', marginBottom: 4 }}>【最重要コアルール】</Text>
                                            <Text style={{ fontSize: 12, color: '#1e40af', lineHeight: 18 }}>
                                                ・離席（荷物放置）は最大30分までとします。{"\n"}
                                                ・入退室時は必ず現地QRコードスキャンを実行してください。
                                            </Text>
                                        </View>
                                        {[
                                            { title: '第1条（利用資格）', content: '勉強、自習、読書、研究などの学習活動を目的とした方のみが本システムおよび座席を利用可能です。不適切な目的での利用と判断された場合は利用制限を行うことがあります。' },
                                            { title: '第2条（利用時間制限と自動解放）', content: '座席の利用時間に原則一律の制限はありません。ただし、座席が満席に近い状態などの混雑時は、より多くの利用希望者が公平に利用できるよう【1回3時間以内】を目安とした利用にご協力いただくものとし、システムによりスロットが自動解放される場合があることに同意するものとします。' },
                                            { title: '第3条（座席の上書きチェックイン仕様）', content: '前の利用者が退席手続きを忘れて退出した（放置席）と客観的に判断される場合, 次に現地の席を正当に利用しようとする者がQRコードを読み込むことで、既存の利用ステータスを上書きしてチェックインできる仕様を承認するものとします。' },
                                            { title: '第4条（禁止事項）', content: '他人のアカウントを用いた不正チェックイン、同一人物による複数端末を用いた複数席の同時占有、および30分を超える長時間の荷物放置行為を禁止します。' }
                                        ].map((item, idx) => (
                                            <View key={idx} style={{ marginBottom: 10, borderWidth: 1, borderColor: Colors.border, borderRadius: 8, overflow: 'hidden' }}>
                                                <TouchableOpacity onPress={() => toggleTerm(idx)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: '#f8fafc' }}>
                                                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.foreground }}>{item.title}</Text>
                                                    <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: 'bold' }}>{expandedTerm === idx ? '▲ 閉じる' : '▼ 広げる'}</Text>
                                                </TouchableOpacity>
                                                {expandedTerm === idx && (
                                                    <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: '#fff' }}>
                                                        <Text style={{ fontSize: 13, color: Colors.foreground, lineHeight: 20 }}>{item.content}</Text>
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                )}
                                {modalType === 'report' && (
                                    <View>
                                        <Text style={[styles.label, { marginBottom: 6 }]}>お問い合わせ種別</Text>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 }}>
                                            {(['bug', 'feedback', 'impression'] as const).map((type) => (
                                                <TouchableOpacity 
                                                    key={type} 
                                                    onPress={() => setReportType(type)}
                                                    disabled={isSubmitting} 
                                                    style={{ 
                                                        flex: 1, 
                                                        paddingVertical: 8, 
                                                        marginHorizontal: 3, 
                                                        borderRadius: 8, 
                                                        borderWidth: 1, 
                                                        borderColor: reportType === type ? Colors.primary : Colors.border,
                                                        backgroundColor: reportType === type ? '#eff6ff' : Colors.card,
                                                        flexDirection: 'row', 
                                                        justifyContent: 'center',
                                                        alignItems: 'center',
                                                        opacity: isSubmitting ? 0.5 : 1
                                                    }}
                                                >
                                                    <Icon 
                                                        name={type === 'bug' ? 'Settings' : type === 'feedback' ? 'Target' : 'Sparkles'} 
                                                        style={{ fontSize: 14, color: reportType === type ? Colors.primary : Colors.mutedForeground, marginRight: 4 }} 
                                                    />
                                                    <Text style={{ fontSize: 12, fontWeight: '600', color: reportType === type ? Colors.primary : Colors.mutedForeground }}>
                                                        {type === 'bug' && '不具合'}
                                                        {type === 'feedback' && '意見・要望'}
                                                        {type === 'impression' && '感想'}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                        <TextInput
                                            style={[styles.inputBase, { height: 80, marginBottom: 12, textAlignVertical: 'top' }]}
                                            multiline={true}
                                            placeholder={getPlaceholderText()}
                                            placeholderTextColor="#94a3b8" 
                                            value={reportText}
                                            onChangeText={setReportText}
                                            editable={!isSubmitting} 
                                        />
                                        <TouchableOpacity 
                                            style={[styles.buttonPrimary, { marginBottom: 20, backgroundColor: isSubmitting ? '#94a3b8' : Colors.primary }]} 
                                            onPress={handleSendReport}
                                            disabled={isSubmitting} 
                                        >
                                            <Text style={styles.buttonText}>{isSubmitting ? '送信中...' : '送信する'}</Text>
                                        </TouchableOpacity>
                                        <Text style={{ fontSize: 14, fontWeight: 'bold', color: Colors.foreground, marginBottom: 10 }}>🕒 送信履歴と運営からの返信</Text>
                                        {reportHistory.length === 0 ? (
                                            <Text style={{ fontSize: 12, color: Colors.mutedForeground, textAlign: 'center', marginVertical: 10 }}>送信した履歴はありません</Text>
                                        ) : (
                                            reportHistory.map((item) => (
                                                <View key={item.id} style={{ padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, marginBottom: 10, borderWidth: 1, borderColor: Colors.border }}>
                                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                            <Text style={{ fontSize: 11, fontWeight: 'bold', color: Colors.primary, marginRight: 6, backgroundColor: '#e2e8f0', paddingHorizontal: 4, paddingVertical: 1, borderRadius: 4 }}>
                                                                {getTypeLabel(item.type)}
                                                            </Text>
                                                            <Text style={{ fontSize: 11, color: Colors.mutedForeground }}>{item.createdAt}</Text>
                                                        </View>
                                                        <Text style={{ fontSize: 11, fontWeight: 'bold', color: item.replyText ? Colors.greenSuccess : '#6b7280' }}>
                                                            {item.replyText ? '● 返信あり' : '○ 未返信'}
                                                        </Text>
                                                    </View>
                                                    <Text style={{ fontSize: 13, color: Colors.foreground, marginBottom: 6 }}>{item.content}</Text>
                                                    {item.replyText ? (
                                                        <View style={{ marginTop: 6, padding: 8, backgroundColor: '#f0fdf4', borderRadius: 6, borderWidth: 1, borderColor: '#bbf7d0' }}>
                                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                                                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#166534' }}>運営からの返信：</Text>
                                                                {item.repliedAt ? <Text style={{ fontSize: 11, color: '#166534', opacity: 0.7 }}>{item.repliedAt}</Text> : null}
                                                            </View>
                                                            <Text style={{ fontSize: 13, color: '#166534' }}>{item.replyText}</Text>
                                                        </View>
                                                    ) : null}
                                                </View>
                                            ))
                                        )}
                                    </View>
                                )}
                                {modalType === 'profileEdit' && (
                                    <View>
                                        <Text style={[styles.label, { marginBottom: 4 }]}>ユーザー名（ニックネーム）</Text>
                                        <TextInput style={[styles.inputBase, { marginBottom: 12 }]} value={editName} onChangeText={setEditName} placeholder="お名前を入力してください" placeholderTextColor="#94a3b8" />
                                        <Text style={[styles.label, { marginBottom: 4 }]}>学年・学職（ステータス）</Text>
                                        <TextInput style={[styles.inputBase, { marginBottom: 12 }]} value={editGrade} onChangeText={setEditGrade} placeholder="例: 大学生、高校生、社会人" placeholderTextColor="#94a3b8" />
                                        <Text style={[styles.label, { marginBottom: 4 }]}>現在のターゲット（資格、試験、開発など）</Text>
                                        <TextInput style={[styles.inputBase, { marginBottom: 12 }]} value={editTarget} onChangeText={setEditTarget} placeholder="例: 基本情報技術者試験、Webアプリ完成" placeholderTextColor="#94a3b8" />
                                        <Text style={[styles.label, { marginBottom: 4 }]}>達成時のご褒美 / 決意表明</Text>
                                        <TextInput style={[styles.inputBase, { marginBottom: 12, height: 60, textAlignVertical: 'top' }]} value={editReward} onChangeText={setEditReward} placeholder="例: 終わったら欲しかったゲームを買う！" placeholderTextColor="#94a3b8" multiline={true} />
                                        <Text style={[styles.label, { marginBottom: 4 }]}>今週の目標学習時間 (時間)</Text>
                                        <TextInput style={[styles.inputBase, { marginBottom: 20 }]} value={editGoalHours} onChangeText={setEditGoalHours} placeholder="例: 15" placeholderTextColor="#94a3b8" keyboardType="numeric" />
                                        <TouchableOpacity style={styles.buttonPrimary} onPress={handleSaveProfile}><Text style={styles.buttonText}>設定を確定する</Text></TouchableOpacity>
                                    </View>
                                )}
                                {modalType === 'emailEdit' && (
                                    <View>
                                        <Text style={[styles.label, { marginBottom: 4 }]}>新しいメールアドレス</Text>
                                        <TextInput style={[styles.inputBase, { marginBottom: 12 }]} value={newEmail} onChangeText={setNewEmail} placeholder="new-example@mail.com" placeholderTextColor="#94a3b8" keyboardType="email-address" autoCapitalize="none" />
                                        <Text style={[styles.label, { marginBottom: 4 }]}>本人確認のため現在のパスワードを入力</Text>
                                        <TextInput style={[styles.inputBase, { marginBottom: 20 }]} value={confirmPasswordForEmail} onChangeText={setConfirmPasswordForEmail} placeholder="パスワード" placeholderTextColor="#94a3b8" secureTextEntry={true} />
                                        <TouchableOpacity style={styles.buttonPrimary} onPress={handleUpdateEmail}><Text style={styles.buttonText}>メールアドレスを変更する</Text></TouchableOpacity>
                                    </View>
                                )}
                                {modalType === 'deleteAccount' && (
                                    <View>
                                        <Text style={{ fontSize: 14, color: '#ef4444', marginBottom: 15, lineHeight: 20, fontWeight: '600' }}>⚠️ 注意: アカウントを削除すると、保存された目標設定や学習データはすべて完全に消去され、復元することはできません。</Text>
                                        <Text style={[styles.label, { marginBottom: 4 }]}>本人確認のためパスワードを入力してください</Text>
                                        <TextInput style={[styles.inputBase, { marginBottom: 20 }]} value={deletePassword} onChangeText={setDeletePassword} placeholder="パスワード" placeholderTextColor="#94a3b8" secureTextEntry={true} />
                                        <TouchableOpacity style={{ backgroundColor: '#ef4444', height: 52, borderRadius: 16, justifyContent: 'center', alignItems: 'center' }} onPress={handleDeleteAccount}><Text style={styles.buttonText}>アカウントを完全に削除する</Text></TouchableOpacity>
                                    </View>
                                )}
                            </ScrollView>
                            <TouchableOpacity style={styles.buttonSecondary} onPress={handleCloseModal}><Text style={{ color: Colors.foreground, fontWeight: 'bold' }}>閉じる</Text></TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </View>
        </ScrollView>
    );
};
export default MyPage;