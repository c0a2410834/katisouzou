import React, { useCallback, useState, useEffect, useRef } from 'react'; // コメントは真横に書く
import { ScrollView, Text, TouchableOpacity, View, Alert, Image, Platform, Vibration, ActivityIndicator, Modal } from 'react-native'; 
import { SafeAreaView } from 'react-native-safe-area-context'; 
import * as ImagePicker from 'expo-image-picker'; 
import AsyncStorage from '@react-native-async-storage/async-storage'; 
import { collection, doc, setDoc, deleteDoc, getDocs, orderBy, query, onSnapshot, where, serverTimestamp, getDoc } from 'firebase/firestore'; 
import { signOut, onAuthStateChanged } from 'firebase/auth'; 
import Head from 'expo-router/head'; 
import { Colors, Icon, mockSessions, Session, SeatType, styles, TabName } from './definition'; 
import { db, auth } from './firebase'; 
import StudyEvent from './event'; 
import StudySeat from './seat'; 
import StudyLearning from './learning'; 
import Login from './login'; 
import MyPage from './mypage'; 
import AdminManagement from './admin'; 

const headerText: Record<TabName, string> = {
    event: 'イベント・コミュニティ広告',
    seat: '自習室チェックイン',
    learning: 'AI学習サポートメニュー',
    mypage: 'マイページ',
    admin: '【最高管理者】アプリ運用コントロール',
};

const navItems = [
    { tab: 'event' as const, icon: 'Calendar' as const, label: 'イベント' },
    { tab: 'seat' as const, icon: 'Camera' as const, label: '座席予約' },
    { tab: 'learning' as const, icon: 'Sparkles' as const, label: '学習サポート' },
    { tab: 'mypage' as const, icon: 'User' as const, label: 'マイページ' },
];

interface AppHeaderProps {
    activeTab: TabName;
    hasNewNotice: boolean; 
    onPressBell: () => void; 
}

const AppHeader: React.FC<AppHeaderProps> = ({ activeTab, hasNewNotice, onPressBell }) => {
    return (
        <View style={[styles.header, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 }]}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: Colors.foreground }}>{headerText[activeTab]}</Text>
            <TouchableOpacity onPress={onPressBell} style={{ position: 'relative', padding: 4 }}>
                <Text style={{ fontSize: 22 }}>🔔</Text>
                {hasNewNotice && (
                    <View style={{ position: 'absolute', top: 2, right: 2, width: 10, height: 10, borderRadius: 5, backgroundColor: '#ef4444', borderWidth: 1.5, borderColor: '#ffffff' }} />
                )}
            </TouchableOpacity>
        </View>
    );
};

interface TabButtonProps {
    icon: "Calendar" | "Camera" | "Sparkles" | "User" | "Wand2"; 
    label: string;
    tabName: string;
    activeTab: TabName;
    onPress: () => void;
    avatarUri: string | null;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, tabName, activeTab, onPress, avatarUri }) => {
    const isActive = activeTab === tabName;
    return (
        <TouchableOpacity style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }} onPress={onPress}>
            {tabName === 'mypage' && avatarUri ? (
                <Image source={{ uri: avatarUri }} style={{ width: 24, height: 24, borderRadius: 12, marginBottom: 4, borderWidth: isActive ? 2 : 0, borderColor: Colors.primary }} />
            ) : (
                <Icon name={icon} style={{ fontSize: 22, color: isActive ? Colors.primary : Colors.mutedForeground, marginBottom: 4 }} />
            )}
            <Text style={{ fontSize: 11, fontWeight: '600', color: isActive ? Colors.primary : Colors.mutedForeground }}>{label}</Text>
        </TouchableOpacity>
    );
};

interface AnnouncementType { 
    id: string;
    text: string;
    title?: string;
    description?: string;
    createdAt: any;
    date?: string;
}

export default function App() {
    const [activeTab, setActiveTab] = useState<TabName>('event');
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true); 
    const [userEmail, setUserEmail] = useState('');
    const [userName, setUserName] = useState('');
    const [avatarUri, setAvatarUri] = useState<string | null>(null);
    const [sessions, setSessions] = useState<Session[]>([]); 
    const [fbSeats, setFbSeats] = useState<SeatType[]>([]);
    const [currentUid, setCurrentUid] = useState('');
    const [notices, setNotices] = useState<AnnouncementType[]>([]); 
    const [hasNewNotice, setHasNewNotice] = useState(false); 
    const [showNoticeModal, setShowNoticeModal] = useState(false); 
    const [swRunning, setSwRunning] = useState(false);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [countdownRunning, setCountdownRunning] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [targetTime, setTargetTime] = useState(1500);
    const [timeRemaining, setTimeRemaining] = useState(1500);
    const timerIntervalRef = useRef<any>(null);
    const [isAdminUser, setIsAdminUser] = useState(false); // 管理者判定を状態管理にしてタイミングのズレを防ぐ

    const triggerAlarmEffects = () => {
        try {
            Vibration.vibrate([0, 300, 300, 300]); 
        } catch (e) {
            console.log('アラーム処理失敗:', e);
        }
    };

    useEffect(() => {
        const qNotice = query(collection(db, 'announcements'), orderBy('createdAt', 'desc')); 
        const unsubscribeNotice = onSnapshot(qNotice, async (snapshot) => {
            const fetchedList = snapshot.docs.map(docDoc => {
                const data = docDoc.data();
                return { id: docDoc.id, text: data.text || '', createdAt: data.createdAt, date: data.createdAt ? new Date(data.createdAt.seconds * 1000).toLocaleDateString() : '' }; 
            }) as AnnouncementType[];
            setNotices(fetchedList);
            if (fetchedList.length > 0) {
                const latestId = fetchedList[0].id;
                const lastSeenId = await AsyncStorage.getItem('@last_seen_notice_id');
                if (lastSeenId !== latestId) {
                    setHasNewNotice(true); 
                }
            }
        }, (error) => { console.log("お知らせ取得失敗:", error); });

        const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
            if (user && user.email) {
                const email = user.email;
                setUserEmail(email);
                setCurrentUid(email);
                setIsAdminUser(user.uid === 'd7MySuDbrXgMUhqXZmSuSpaXotz2' || user.uid === 'wBYeerfELpMhbM3unpm0EQhUSkm2' || user.uid === 'L2goIgfSARS4C7PWEAaPVTQ6GHV2'); // 複数人を管理者に追加
                const cachedName = await AsyncStorage.getItem('userName');
                if (cachedName) setUserName(cachedName);
                const userDocSnap = await getDoc(doc(db, 'users', email));
                if (userDocSnap.exists()) {
                    const userData = userDocSnap.data();
                    if (userData.name) setUserName(userData.name);
                    if (userData.avatarUri) setAvatarUri(userData.avatarUri);
                }
                setIsLoggedIn(true); 
            } else {
                setIsLoggedIn(false);
                setIsAdminUser(false); // ログアウト時は管理者状態も落とす
            }
            setIsLoading(false); 
        });
        return () => {
            unsubscribeAuth();
            unsubscribeNotice(); 
        };
    }, []);

    useEffect(() => {
        if (!isLoggedIn) return; 
        const q = query(collection(db, 'seats'), orderBy('id', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const seatsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as SeatType[];
            setFbSeats(seatsData);
        }, (error) => {
            console.log("座席データの取得に失敗しました:", error); 
        });
        return () => unsubscribe();
    }, [isLoggedIn]); 

    useEffect(() => {
        if (!isLoggedIn || !userEmail) {
            setSessions([]); 
            return;
        }
        const q = query(collection(db, 'sessions'), where('userId', '==', userEmail)); 
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sessionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as unknown as Session[];
            if (sessionsData.length > 0) {
                const sorted = sessionsData.sort((a, b) => b.date.localeCompare(a.date));
                setSessions(sorted);
            } else {
                setSessions([]); 
            }
        }, (error) => { console.log(error); });
        return () => unsubscribe();
    }, [isLoggedIn, userEmail]); 

    useEffect(() => {
        if (!isLoggedIn || !userEmail) return;
        const unsubscribe = onSnapshot(doc(db, 'users', userEmail), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.name) setUserName(data.name); 
                if (data.avatarUri) setAvatarUri(data.avatarUri); 
            }
        });
        return () => unsubscribe();
    }, [isLoggedIn, userEmail]);

    useEffect(() => {
        if (swRunning) {
            timerIntervalRef.current = setInterval(() => { setElapsedTime(p => p + 1); }, 1000);
        } else if (countdownRunning) {
            timerIntervalRef.current = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        clearInterval(timerIntervalRef.current); 
                        setCountdownRunning(false);
                        triggerAlarmEffects(); 
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => { 
            if (timerIntervalRef.current) {
                clearInterval(timerIntervalRef.current);
                timerIntervalRef.current = null;
            }
        };
    }, [swRunning, countdownRunning]);

    const handleLoginSuccess = async (email: string, name: string) => {
        try {
            await AsyncStorage.setItem('userEmail', email);
            await AsyncStorage.setItem('userName', name);
            setUserEmail(email); setUserName(name); setCurrentUid(email); 
            const userDocSnap = await getDoc(doc(db, 'users', email));
            if (userDocSnap.exists()) {
                const userData = userDocSnap.data();
                if (userData.name) setUserName(userData.name); 
                if (userData.avatarUri) setAvatarUri(userData.avatarUri); 
            }
            setIsLoggedIn(true);
        } catch (e) {
            console.log(e);
        }
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            await AsyncStorage.removeItem('userEmail');
            await AsyncStorage.removeItem('userName');
            setUserEmail(''); setUserName(''); setCurrentUid(''); setAvatarUri(null); 
            setIsLoggedIn(false); setActiveTab('event'); setSwRunning(false); setCountdownRunning(false);
        } catch (e) {
            console.log(e);
        }
    };

    const resizeImageWeb = (uri: string): Promise<string> => { 
        return new Promise((resolve) => {
            const img = document.createElement('img');
            img.src = uri;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 200; canvas.height = 200;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    let sourceX = 0; let sourceY = 0; let sourceWidth = img.width; let sourceHeight = img.height; 
                    if (img.width > img.height) { sourceWidth = img.height; sourceX = (img.width - img.height) / 2; } 
                    else if (img.height > img.width) { sourceHeight = img.width; sourceY = (img.height - img.width) / 2; }
                    ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, 200, 200); 
                }
                resolve(canvas.toDataURL('image/jpeg', 0.5)); 
            };
        });
    };

    const pickAvatarImage = async () => {
        const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissionResult.granted === false) {
            if (Platform.OS === 'web') alert('カメラロールへのアクセス許可が必要です。'); 
            else Alert.alert('許可必要', 'カメラロールへのアクセス許可が必要です。');
            return null;
        }
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true, aspect: [1, 1], quality: 0.1, base64: true, 
        });
        if (!result.canceled && result.assets && result.assets[0]) {
            const asset = result.assets[0];
            let base64Data = asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri;
            try {
                if (Platform.OS === 'web') base64Data = await resizeImageWeb(asset.uri);
                await setDoc(doc(db, 'users', userEmail), { avatarUri: base64Data }, { merge: true }); 
                return base64Data;
            } catch (error) {
                console.log('画像処理失敗:', error);
                return null;
            }
        }
        return null;
    };

    const onAddSession = async (session: Session) => {
        if (!userEmail) return; 
        try {
            await setDoc(doc(db, 'sessions', session.id), {
                id: session.id, userId: userEmail, subject: session.subject, durationMin: session.durationMin, secondsRemainder: session.secondsRemainder, pages: session.pages, date: session.date, createdAt: serverTimestamp() 
            });
        } catch (e) { console.log(e); }
    };

    const onDeleteSession = async (id: string) => {
        try { await deleteDoc(doc(db, 'sessions', id)); } catch (e) { console.log(e); }
    };

    const handleOpenNotices = async () => { 
        setHasNewNotice(false); setShowNoticeModal(true);
        if (notices.length > 0) { await AsyncStorage.setItem('@last_seen_notice_id', notices[0].id); }
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'event': return <StudyEvent />; 
            case 'seat': return <StudySeat firebaseSeats={fbSeats} currentUid={userEmail} />; 
            case 'learning': return (
                <StudyLearning 
                    sessions={sessions} onAddSession={onAddSession} onDeleteSession={onDeleteSession} 
                    timerState={{ swRunning, setSwRunning, elapsedTime, setElapsedTime, countdownRunning, setCountdownRunning, isPaused, setIsPaused, targetTime, setTargetTime, timeRemaining, setTimeRemaining }}
                />
            ); 
            case 'mypage': return <MyPage userName={userName} userEmail={userEmail} avatarUri={avatarUri} pickAvatarImage={pickAvatarImage} handleLogout={handleLogout} />;
            case 'admin': return <AdminManagement />;
        }
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
                <ActivityIndicator size="large" color={Colors.primary} />
            </View>
        );
    }

    if (!isLoggedIn) {
        return (
            <>
                <Head>
                    <title>AICADEMY</title>
                    <meta name="apple-mobile-web-app-title" content="AICADEMY" />
                    <meta name="apple-mobile-web-app-capable" content="yes" />
                    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                </Head>
                <SafeAreaView style={styles.safeArea}>
                    <Login onLoginSuccess={handleLoginSuccess} />
                </SafeAreaView>
            </>
        );
    }

    return (
        <>
            <Head>
                <title>AICADEMY</title>
                <meta name="apple-mobile-web-app-title" content="AICADEMY" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
            </Head>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.appContainer}>
                    <AppHeader activeTab={activeTab} hasNewNotice={hasNewNotice} onPressBell={handleOpenNotices} />
                    <View style={[styles.mainContent, { flex: 1 }]} >
                        {renderContent()}
                    </View>
                    <View style={styles.nav}>
                        <View style={styles.flexRow}>
                            {navItems.map(item => (
                                <TabButton key={item.tab} icon={item.icon} label={item.label} tabName={item.tab} activeTab={activeTab} onPress={() => setActiveTab(item.tab as TabName)} avatarUri={avatarUri} /> 
                            ))}
                            {isAdminUser && (
                                <TabButton icon="Wand2" label="管理者" tabName="admin" activeTab={activeTab} onPress={() => setActiveTab('admin')} avatarUri={null} />
                            )}
                        </View>
                    </View>
                </View>

                <Modal visible={showNoticeModal} transparent={true} animationType="fade" onRequestClose={() => setShowNoticeModal(false)}>
                    <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                        <View style={{ backgroundColor: '#ffffff', width: '100%', maxHeight: '80%', borderRadius: 20, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 5 }}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f4f4f5', paddingBottom: 12 }}>
                                <Text style={{ fontSize: 18, fontWeight: 'bold', color: Colors.foreground }}>📢 お知らせ一覧</Text>
                                <TouchableOpacity onPress={() => setShowNoticeModal(false)} style={{ padding: 4 }}><Text style={{ fontSize: 16, fontWeight: 'bold', color: Colors.mutedForeground }}>✕</Text></TouchableOpacity>
                            </View>
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {notices.length === 0 ? (
                                    <Text style={{ textAlign: 'center', color: Colors.mutedForeground, marginVertical: 32, fontSize: 14 }}>現在お知らせはありません。</Text>
                                ) : (
                                    notices.map((notice) => (
                                        <View key={notice.id} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f4f4f5' }}>
                                            <Text style={{ fontSize: 14, color: Colors.foreground, lineHeight: 22, fontWeight: '500' }}>{notice.text}</Text>
                                            {notice.date && (
                                                <Text style={{ fontSize: 11, color: Colors.mutedForeground, marginTop: 6 }}>配信日: {notice.date}</Text>
                                            )}
                                        </View>
                                    ))
                                )}
                            </ScrollView>
                            <TouchableOpacity style={[styles.buttonSecondary, { marginTop: 16 }]} onPress={() => setShowNoticeModal(false)}><Text style={{ color: Colors.foreground, fontWeight: 'bold' }}>閉じる</Text></TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            </SafeAreaView>
        </>
    );
}