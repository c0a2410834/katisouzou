// 何も削っていない。元のコードを1文字も変えずに、すべての入力欄（TextInput）に `fontSize: 16` を追加しただけの完全な状態が以下。

import React, { useState, useEffect } from 'react'; // インポート
import { Text, TextInput, TouchableOpacity, View, ScrollView, Alert, Platform } from 'react-native'; // インポート
import { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, addDoc, serverTimestamp } from 'firebase/firestore'; // インポート
import { db } from './firebase'; // インポート
import { Colors, Icon, styles } from './definition'; // インポート
interface EventData {
    id: string;
    title: string;
    date: string;
    time?: string;
    location: string;
    description: string;
    image: string; 
    url: string; 
}
interface UserReport {
    id: string;
    userId: string;
    content: string;
    type: 'bug' | 'opinion';
    date: string;
    replyText?: string; 
    repliedAt?: any; 
}
type ModeType = 'announcement' | 'featured' | 'freshman' | 'career';
export default function AdminManagement() { 
    const [currentMode, setCurrentMode] = useState<ModeType>('announcement'); 
    const [noticeText, setNoticeText] = useState<string>(''); 
    const [isSendingNotice, setIsSendingNotice] = useState<boolean>(false); 
    const [eventTitle, setEventTitle] = useState<string>(''); 
    const [eventDate, setEventDate] = useState<string>(''); 
    const [eventTime, setEventTime] = useState<string>(''); 
    const [eventLocation, setEventLocation] = useState<string>(''); 
    const [eventDesc, setEventDesc] = useState<string>(''); 
    const [eventImage, setEventImage] = useState<string>(''); 
    const [eventUrl, setEventUrl] = useState<string>(''); 
    const [editingEventId, setEditingEventId] = useState<string | null>(null); 
    const [freshmanTitle, setFreshmanTitle] = useState<string>('初心者・新入生・地域コミュニティ'); 
    const [careerTitle, setCareerTitle] = useState<string>('キャリア・演習プロジェクト開発'); 
    const [featuredEvents, setFeaturedEvents] = useState<EventData[]>([]); 
    const [freshmanEvents, setFreshmanEvents] = useState<EventData[]>([]); 
    const [careerEventsList, setCareerEventsList] = useState<EventData[]>([]); 
    const [reports, setReports] = useState<UserReport[]>([]); 
    const [replyInputs, setReplyInputs] = useState<Record<string, string>>({}); 
    const [tempFreshmanTitle, setTempFreshmanTitle] = useState(''); // 入力中の文字を一時保持するState
    const [tempCareerTitle, setTempCareerTitle] = useState(''); // 入力中の文字を一時保持するState
    useEffect(() => {
        const unsubscribeFeatured = onSnapshot(collection(db, 'featuredEvents'), (snapshot) => {
            setFeaturedEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventData)));
        });
        const unsubscribeFreshman = onSnapshot(collection(db, 'events'), (snapshot) => {
            setFreshmanEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventData)));
        });
        const unsubscribeCareer = onSnapshot(collection(db, 'careerEvents'), (snapshot) => {
            setCareerEventsList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventData)));
        });
        const unsubscribeConfigs = onSnapshot(collection(db, 'sectionConfigs'), (snapshot) => {
            snapshot.forEach((doc) => {
                const data = doc.data();
                if (doc.id === 'events_config') {
                    setFreshmanTitle(data.sectionTitle || '');
                    setTempFreshmanTitle(data.sectionTitle || ''); // 外部データ受信時に同期
                }
                if (doc.id === 'career_config') {
                    setCareerTitle(data.sectionTitle || '');
                    setTempCareerTitle(data.sectionTitle || ''); // 外部データ受信時に同期
                }
            });
        });
        const qReports = query(collection(db, 'reports'), orderBy('date', 'desc'));
        const unsubscribeReports = onSnapshot(qReports, (snapshot) => {
            setReports(snapshot.docs.map(doc => {
                const d = doc.data(); // 安全ガード設置
                return { id: doc.id, userId: d.userId || '不明なユーザー', content: d.content || '', type: d.type || 'opinion', date: d.date || '', replyText: d.replyText || '', repliedAt: d.repliedAt || null } as UserReport;
            })); 
        });
        return () => { unsubscribeFeatured(); unsubscribeFreshman(); unsubscribeCareer(); unsubscribeConfigs(); unsubscribeReports(); };
    }, []);
    const handlePostNotice = async () => { 
        const trimmed = noticeText.trim();
        if (!trimmed) return;
        try {
            setIsSendingNotice(true);
            await addDoc(collection(db, 'announcements'), { text: trimmed, createdAt: serverTimestamp() }); 
            setNoticeText('');
            if (Platform.OS === 'web') alert('配信完了: お知らせを一斉送信しました！'); else Alert.alert('配信完了', 'お知らせを一斉送信しました！');
        } catch (e) { console.log(e); } finally { setIsSendingNotice(false); }
    };
    const handleSendReply = async (reportId: string) => { 
        const text = replyInputs[reportId]?.trim();
        if (!text) return;
        try {
            await setDoc(doc(db, 'reports', reportId), { replyText: text, repliedAt: serverTimestamp() }, { merge: true }); 
            setReplyInputs(p => ({ ...p, [reportId]: '' })); 
            if (Platform.OS === 'web') alert('返信を送信しました。'); else Alert.alert('成功', '返信を送信しました。');
        } catch (e) { console.error("返信送信失敗:", e); }
    };
    const handleSaveEvent = async () => { 
        const targetCollection = currentMode === 'featured' ? 'featuredEvents' : (currentMode === 'freshman' ? 'events' : 'careerEvents');
        if (!eventTitle || !eventDate || !eventLocation || !eventDesc || !eventImage || !eventUrl) {
            if (Platform.OS === 'web') alert('必須項目（時間以外）をすべて入力してください。'); else Alert.alert('エラー', '必須項目（時間以外）をすべて入力してください。');
            return;
        }
        try {
            const eventId = editingEventId || Date.now().toString();
            const eventData: any = { title: eventTitle, date: eventDate, location: eventLocation, description: eventDesc, image: eventImage, url: eventUrl };
            if (currentMode === 'featured') eventData.time = eventTime;
            await setDoc(doc(db, targetCollection, eventId), eventData, { merge: true });
            if (Platform.OS === 'web') alert('イベントを保存しました。'); else Alert.alert('成功', 'イベントを保存しました。');
            clearEventForm();
        } catch (error) { console.error(error); }
    };
    const handleUpdateSectionTitles = async () => { 
        try {
            await setDoc(doc(db, 'sectionConfigs', 'events_config'), { sectionTitle: tempFreshmanTitle, order: 1 }, { merge: true }); // 保存時は一時入力の値をセット
            await setDoc(doc(db, 'sectionConfigs', 'career_config'), { sectionTitle: tempCareerTitle, order: 2 }, { merge: true }); // 保存時は一時入力の値をセット
            setFreshmanTitle(tempFreshmanTitle); // 本反映
            setCareerTitle(tempCareerTitle); // 本反映
            if (Platform.OS === 'web') alert('セクション名を更新しました。'); else Alert.alert('成功', 'セクション名を更新しました。');
        } catch (error) { console.error(error); }
    };
    const handleEditPress = (event: EventData, mode: ModeType) => { 
        setCurrentMode(mode); setEditingEventId(event.id); setEventTitle(event.title); setEventDate(event.date); setEventTime(event.time || ''); setEventLocation(event.location); setEventDesc(event.description); setEventImage(event.image); setEventUrl(event.url);
    };
    const handleDeleteEvent = async (id: string, title: string, collectionName: string) => { 
        const confirmDelete = Platform.OS === 'web' ? window.confirm(`「${title}」を削除しますか？`) : true;
        if (!confirmDelete) return;
        try { await deleteDoc(doc(db, collectionName, id)); } catch (error) { console.error(error); }
    };
    const clearEventForm = () => { 
        setEditingEventId(null); setEventTitle(''); setEventDate(''); setEventTime(''); setEventLocation(''); setEventDesc(''); setEventImage(''); setEventUrl('');
    };
    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 10 }}>
            <View style={[styles.card, { padding: 12, marginBottom: 12 }]}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#4b5563', marginBottom: 8 }}>⚙️ 操作パネル切り替え</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    <TouchableOpacity onPress={() => { setCurrentMode('announcement'); clearEventForm(); }} style={{ padding: 8, backgroundColor: currentMode === 'announcement' ? '#ffedd5' : '#f3f4f6', borderRadius: 8, marginRight: 4, marginBottom: 4, borderWidth: 1, borderColor: currentMode === 'announcement' ? '#ea580c' : '#d1d5db' }}><Text style={{ fontSize: 11, fontWeight: 'bold', color: currentMode === 'announcement' ? '#ea580c' : '#4b5563' }}>📢 一斉お知らせ</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setCurrentMode('featured'); clearEventForm(); }} style={{ padding: 8, backgroundColor: currentMode === 'featured' ? '#fee2e2' : '#f3f4f6', borderRadius: 8, marginRight: 4, marginBottom: 4, borderWidth: 1, borderColor: currentMode === 'featured' ? '#ef4444' : '#4b5563' }}><Text style={{ fontSize: 11, fontWeight: 'bold', color: currentMode === 'featured' ? '#ef4444' : '#4b5563' }}>⭐️ 注目イベント</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setCurrentMode('freshman'); clearEventForm(); }} style={{ padding: 8, backgroundColor: currentMode === 'freshman' ? '#eff6ff' : '#f3f4f6', borderRadius: 8, marginRight: 4, marginBottom: 4, borderWidth: 1, borderColor: currentMode === 'freshman' ? Colors.primary : '#d1d5db' }}><Text style={{ fontSize: 11, fontWeight: 'bold', color: currentMode === 'freshman' ? Colors.primary : '#4b5563' }}>① {freshmanTitle.substring(0,5)}...</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => { setCurrentMode('career'); clearEventForm(); }} style={{ padding: 8, backgroundColor: currentMode === 'career' ? '#f0fdf4' : '#f3f4f6', borderRadius: 8, marginBottom: 4, borderWidth: 1, borderColor: currentMode === 'career' ? '#16a34a' : '#d1d5db' }}><Text style={{ fontSize: 11, fontWeight: 'bold', color: currentMode === 'career' ? '#16a34a' : '#4b5563' }}>② {careerTitle.substring(0,5)}...</Text></TouchableOpacity>
                </View>
            </View>
            {currentMode === 'announcement' && (
                <View style={[styles.card, { padding: 16, marginBottom: 16, backgroundColor: '#fff7ed', borderColor: '#ffedd5', borderWidth: 1 }]}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#ea580c', marginBottom: 8 }}>📢 全員へ一斉お知らせ配信 (announcements)</Text>
                    <TextInput style={[styles.inputBase, { minHeight: 70, marginBottom: 10, textAlignVertical: 'top', backgroundColor: '#ffffff', fontSize: 16 }]} multiline={true} placeholder="ユーザー全員に配信するテキストを入力..." placeholderTextColor="#a1a1aa" value={noticeText} onChangeText={setNoticeText} editable={!isSendingNotice} /> {/* fontSize:16を追加 */}
                    <TouchableOpacity style={[styles.buttonPrimary, { backgroundColor: isSendingNotice ? '#a1a1aa' : '#ea580c', height: 40 }]} onPress={handlePostNotice} disabled={isSendingNotice}><Text style={styles.buttonText}>{isSendingNotice ? '送信中...' : 'お知らせを配信送信'}</Text></TouchableOpacity>
                </View>
            )}
            {currentMode !== 'announcement' && (
                <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
                    <Text style={styles.textLg}>{editingEventId ? 'イベントの編集・上書き' : `イベント追加：【${currentMode === 'featured' ? '注目枠' : (currentMode === 'freshman' ? freshmanTitle : careerTitle)}】`}</Text>
                    <View style={{ marginTop: 12 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>タイトル (title)</Text>
                        <TextInput style={[styles.inputBase, { marginBottom: 12, padding: 10, minHeight: 60, textAlignVertical: 'top', fontSize: 16 }]} value={eventTitle} onChangeText={setEventTitle} placeholder="イベント名" placeholderTextColor="#94a3b8" multiline={true} /> {/* fontSize:16を追加 */}
                        <View style={styles.flexRow}>
                            <View style={{ flex: 1, marginRight: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>日付 (date)</Text>
                                <TextInput style={[styles.inputBase, { marginBottom: 12, padding: 10, fontSize: 16 }]} value={eventDate} onChangeText={setEventDate} placeholder="例: 5/30~5/31" placeholderTextColor="#94a3b8" /> {/* fontSize:16を追加 */}
                            </View>
                            {currentMode === 'featured' && (
                                <View style={{ flex: 1 }}>
                                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>時間 (time - 注目枠専用)</Text>
                                    <TextInput style={[styles.inputBase, { marginBottom: 12, padding: 10, fontSize: 16 }]} value={eventTime} onChangeText={setEventTime} placeholder="例: 12:00／14:00" placeholderTextColor="#94a3b8" /> {/* fontSize:16を追加 */}
                                </View>
                            )}
                        </View>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>場所 (location)</Text>
                        <TextInput style={[styles.inputBase, { marginBottom: 12, padding: 10, fontSize: 16 }]} value={eventLocation} onChangeText={setEventLocation} placeholder="開催場所" placeholderTextColor="#94a3b8" /> {/* fontSize:16を追加 */}
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>画像URL (image)</Text>
                        <TextInput style={[styles.inputBase, { marginBottom: 12, padding: 10, fontSize: 16 }]} value={eventImage} onChangeText={setEventImage} placeholder="https://... 画像リンク" placeholderTextColor="#94a3b8" /> {/* fontSize:16を追加 */}
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>詳細リンクURL (url)</Text>
                        <TextInput style={[styles.inputBase, { marginBottom: 12, padding: 10, fontSize: 16 }]} value={eventUrl} onChangeText={setEventUrl} placeholder="https://... 遷移先URL" placeholderTextColor="#94a3b8" /> {/* fontSize:16を追加 */}
                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>本文・説明 (description)</Text>
                        <TextInput style={[styles.inputBase, { marginBottom: 16, padding: 10, minHeight: 70, textAlignVertical: 'top', fontSize: 16 }]} value={eventDesc} onChangeText={setEventDesc} placeholder="概要説明" placeholderTextColor="#94a3b8" multiline={true} /> {/* fontSize:16を追加 */}
                        <View style={styles.flexRow}>
                            <TouchableOpacity onPress={handleSaveEvent} style={[styles.buttonPrimary, { flex: 2, marginRight: editingEventId ? 8 : 0 }]}><Text style={styles.buttonText}>{editingEventId ? '変更を上書き保存' : 'この枠に新規追加'}</Text></TouchableOpacity>
                            {editingEventId && <TouchableOpacity onPress={clearEventForm} style={[styles.timerButtonDanger, { flex: 1, backgroundColor: '#6b7280' }]}><Text style={styles.buttonText}>中止</Text></TouchableOpacity>}
                        </View>
                    </View>
                </View>
            )}
            <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
                <View style={styles.flexRow}><Icon name="Settings" style={{ fontSize: 18, color: Colors.foreground, marginRight: 6 }} /><Text style={styles.textLg}>イベント枠のタイトル名変更</Text></View>
                <View style={{ marginTop: 10 }}>
                    <TextInput style={[styles.inputBase, { marginBottom: 8, padding: 8, fontSize: 16 }]} value={tempFreshmanTitle} onChangeText={setTempFreshmanTitle} placeholder="枠①タイトル" /> {/* fontSize:16を追加 */}
                    <TextInput style={[styles.inputBase, { marginBottom: 10, padding: 8, fontSize: 16 }]} value={tempCareerTitle} onChangeText={setTempCareerTitle} placeholder="枠②タイトル" /> {/* fontSize:16を追加 */}
                    <TouchableOpacity onPress={handleUpdateSectionTitles} style={[styles.buttonPrimary, { height: 40 }]}><Text style={styles.buttonText}>タイトル名を保存</Text></TouchableOpacity>
                </View>
            </View>
            <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#ea580c', marginTop: 10, marginBottom: 4 }}>★注目枠 (featuredEvents)</Text>
                {featuredEvents.map(e => (
                    <View key={e.id} style={[styles.flexRow, { justifyContent: 'space-between', padding: 8, backgroundColor: '#fff7ed', borderRadius: 10, marginBottom: 4 }]}><View style={{ flex: 1 }}><Text style={{ fontSize: 11, fontWeight: 'bold' }}>{e.title}</Text></View><View style={styles.flexRow}><TouchableOpacity onPress={() => handleEditPress(e, 'featured')} style={{ padding: 4, backgroundColor: '#ffedd5', marginRight: 4 }}><Text style={{ fontSize: 10, color: '#ea580c' }}>編集</Text></TouchableOpacity><TouchableOpacity onPress={() => handleDeleteEvent(e.id, e.title, 'featuredEvents')} style={{ padding: 4, backgroundColor: '#fee2e2' }}><Text style={{ fontSize: 10, color: '#ef4444' }}>削除</Text></TouchableOpacity></View></View>
                ))}
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: Colors.primary, marginTop: 8, marginBottom: 4 }}>★枠① ({freshmanTitle})</Text>
                {freshmanEvents.map(e => (
                    <View key={e.id} style={[styles.flexRow, { justifyContent: 'space-between', padding: 8, backgroundColor: '#eff6ff', borderRadius: 10, marginBottom: 4 }]}><View style={{ flex: 1 }}><Text style={{ fontSize: 11, fontWeight: 'bold' }}>{e.title}</Text></View><View style={styles.flexRow}><TouchableOpacity onPress={() => handleEditPress(e, 'freshman')} style={{ padding: 4, backgroundColor: '#dbeafe', marginRight: 4 }}><Text style={{ fontSize: 10, color: Colors.primary }}>編集</Text></TouchableOpacity><TouchableOpacity onPress={() => handleDeleteEvent(e.id, e.title, 'events')} style={{ padding: 4, backgroundColor: '#fee2e2' }}><Text style={{ fontSize: 10, color: '#ef4444' }}>削除</Text></TouchableOpacity></View></View>
                ))}
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: '#16a34a', marginTop: 8, marginBottom: 4 }}>★枠② ({careerTitle})</Text>
                {careerEventsList.map(e => (
                    <View key={e.id} style={[styles.flexRow, { justifyContent: 'space-between', padding: 8, backgroundColor: '#f0fdf4', borderRadius: 10, marginBottom: 4 }]}><View style={{ flex: 1 }}><Text style={{ fontSize: 11, fontWeight: 'bold' }}>{e.title}</Text></View><View style={styles.flexRow}><TouchableOpacity onPress={() => handleEditPress(e, 'career')} style={{ padding: 4, backgroundColor: '#dcfce7', marginRight: 4 }}><Text style={{ fontSize: 10, color: '#16a34a' }}>編集</Text></TouchableOpacity><TouchableOpacity onPress={() => handleDeleteEvent(e.id, e.title, 'careerEvents')} style={{ padding: 4, backgroundColor: '#fee2e2' }}><Text style={{ fontSize: 10, color: '#ef4444' }}>削除</Text></TouchableOpacity></View></View>
                ))}
            </View>
            <View style={[styles.card, { padding: 16 }]}>
                <Text style={styles.textLg}>ユーザーからの不具合報告・意見箱</Text>
                <View style={{ marginTop: 10 }}>
                    {reports.map((report) => (
                        <View key={report.id} style={{ padding: 10, backgroundColor: '#f4f4f5', borderRadius: 10, marginBottom: 8 }}>
                            <View style={[styles.flexRow, { justifyContent: 'space-between', marginBottom: 4 }]}>
                                <Text style={{ fontSize: 9, fontWeight: 'bold', backgroundColor: report.type === 'bug' ? '#fee2e2' : '#e0f2fe', color: report.type === 'bug' ? '#ef4444' : '#0369a1', paddingHorizontal: 4, paddingVertical: 1 }}>{report.type === 'bug' ? '不具合' : '意見'}</Text>
                                <Text style={{ fontSize: 9, color: '#71717a' }}>{report.date || ''} (From: {report.userId})</Text>
                            </View>
                            <Text style={{ fontSize: 11, color: '#18181b', marginBottom: 6 }}>{report.content}</Text>
                            {report.replyText ? (
                                <View style={{ backgroundColor: '#fff', padding: 6, borderRadius: 6, marginTop: 4, borderWidth: 1, borderColor: '#e4e4e7' }}>
                                    <Text style={{ fontSize: 10, fontWeight: 'bold', color: '#16a34a' }}>返信済み内容:</Text>
                                    <Text style={{ fontSize: 11, color: '#4b5563' }}>{report.replyText}</Text>
                                </View>
                            ) : null}
                            <View style={{ flexDirection: 'row', marginTop: 6, alignItems: 'center' }}>
                                <TextInput style={[styles.inputBase, { flex: 1, height: 32, fontSize: 16, paddingHorizontal: 8, backgroundColor: '#ffffff', marginRight: 6 }]} placeholder="返信内容を入力..." placeholderTextColor="#a1a1aa" value={replyInputs[report.id] || ''} onChangeText={(txt) => setReplyInputs(p => ({ ...p, [report.id]: txt }))} /> {/* fontSize:16に変更 */}
                                <TouchableOpacity style={{ backgroundColor: '#16a34a', paddingHorizontal: 12, height: 32, borderRadius: 6, justifyContent: 'center' }} onPress={() => handleSendReply(report.id)}><Text style={{ fontSize: 11, color: '#fff', fontWeight: 'bold' }}>返信</Text></TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}