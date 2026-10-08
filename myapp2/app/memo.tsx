import React, { useState, useEffect } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { Colors, Icon, Memo, styles } from './definition';
import { db, auth } from './firebase';

const getCurrentDate = (): string => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
};

const StudyMemo: React.FC = () => {
    const [memos, setMemos] = useState<Memo[]>([]);
    const [newMemoContent, setNewMemoContent] = useState<string>('');
    const [newMemoSubject, setNewMemoSubject] = useState<string>('');
    const [newMemoTags, setNewMemoTags] = useState<string>('');
    const userEmail = auth.currentUser?.email || '';

    useEffect(() => {
        if (!userEmail) return;
        const q = query(
            collection(db, 'memos'),
            where('userId', '==', userEmail)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedMemos = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    subject: data.subject || 'その他',
                    content: data.content || '',
                    date: data.date || '',
                    tags: data.tags || [],
                    imageUri: null,
                    createdAt: data.createdAt ? data.createdAt.toDate() : new Date(),
                };
            });
            fetchedMemos.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            setMemos(fetchedMemos);
        }, (error) => {
            console.log('メモ同期エラー:', error);
        });
        return () => unsubscribe();
    }, [userEmail]);

    const handleSaveMemo = async () => {
        if (!userEmail) {
            Alert.alert('エラー', 'ログインセッションが有効ではありません。');
            return;
        }
        if (!newMemoContent.trim()) {
            Alert.alert('エラー', 'メモ内容を入力してください。');
            return;
        }
        try {
            await addDoc(collection(db, 'memos'), {
                userId: userEmail,
                subject: newMemoSubject.trim() || 'その他',
                content: newMemoContent.trim(),
                date: getCurrentDate(),
                tags: newMemoTags.trim() ? newMemoTags.split(',').map(t => t.trim()).filter(t => t) : [],
                createdAt: serverTimestamp()
            });
            setNewMemoContent('');
            setNewMemoSubject('');
            setNewMemoTags('');
            Alert.alert('成功', 'メモを保存しました！');
        } catch (error) {
            console.log('メモ保存エラー:', error);
            Alert.alert('エラー', 'データの保存に失敗しました。');
        }
    };

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
            <View style={[styles.card, { padding: 16, marginBottom: 16, marginTop: 8 }]}>
                <View style={{ paddingBottom: 12 }}>
                    <Text style={styles.textLg}>学習メモ作成</Text>
                    <Text style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>大事な公式や解法、暗記項目をストック</Text>
                </View>
                <View>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#4b5563', marginBottom: 6 }}>科目名</Text>
                    <TextInput style={[styles.inputBase, { marginBottom: 12, borderRadius: 12, padding: 10 }]} value={newMemoSubject} onChangeText={setNewMemoSubject} placeholder="例: 数学Ⅱ, 英語構文" placeholderTextColor="#a1a1aa" />

                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#4b5563', marginBottom: 6 }}>メモ内容</Text>
                    <TextInput style={[styles.inputBase, { height: 100, marginBottom: 12, borderRadius: 12, padding: 10, textAlignVertical: 'top' }]} value={newMemoContent} onChangeText={setNewMemoContent} placeholder="公式や間違えたポイントをここに記入..." placeholderTextColor="#a1a1aa" multiline={true} />

                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#4b5563', marginBottom: 6 }}>タグ (カンマ区切り)</Text>
                    <TextInput style={[styles.inputBase, { marginBottom: 16, borderRadius: 12, padding: 10 }]} value={newMemoTags} onChangeText={setNewMemoTags} placeholder="例: 公式, 注意点" placeholderTextColor="#a1a1aa" />

                    <TouchableOpacity onPress={handleSaveMemo} style={styles.buttonPrimary}>
                        <Icon name="Upload" style={{ fontSize: 14, color: '#fff', marginRight: 8 }} />
                        <Text style={styles.buttonText}>メモを保存</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
                <View style={{ paddingBottom: 12 }}>
                    <Text style={styles.textLg}>メモ履歴</Text>
                    <Text style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>過去に作成した学習メモ</Text>
                </View>
                <View>
                    {memos.map((memo: Memo) => (
                        <MemoItem key={memo.id} memo={memo} />
                    ))}
                    {memos.length === 0 && (
                        <Text style={{ color: '#71717a', textAlign: 'center', marginTop: 10, fontSize: 13 }}>保存されたメモはありません。</Text>
                    )}
                </View>
            </View>
        </ScrollView>
    );
};

interface MemoItemProps {
    memo: Memo;
}

const MemoItem: React.FC<MemoItemProps> = ({ memo }) => {
    return (
        <View style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' }}>
            <View style={[styles.flexRow, { justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }]}>
                <View style={[styles.flexRow, { alignItems: 'center' }]}>
                    <View style={{ backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginRight: 8 }}>
                        <Text style={{ fontSize: 11, color: Colors.primary, fontWeight: '600' }}>{memo.subject}</Text>
                    </View>
                    <Text style={{ fontSize: 11, color: '#71717a' }}>{memo.date}</Text>
                </View>
            </View>
            <Text style={{ fontSize: 14, color: '#18181b', lineHeight: 20, marginBottom: 6 }}>{memo.content}</Text>
            {memo.tags && memo.tags.length > 0 && (
                <View style={[styles.flexRow, { flexWrap: 'wrap', gap: 4 }]}>
                    {memo.tags.map((tag, idx) => (
                        <Text key={idx} style={{ fontSize: 11, color: '#4b5563', backgroundColor: '#f4f4f5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                            #{tag}
                        </Text>
                    ))}
                </View>
            )}
        </View>
    );
};

export default StudyMemo;