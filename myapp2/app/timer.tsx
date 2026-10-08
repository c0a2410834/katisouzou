import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Alert, Text, TextInput, TouchableOpacity, Vibration, View, ScrollView, Platform, AppState, AppStateStatus } from 'react-native'; 
import { Colors, formatDuration, formatMinToHourMin, Icon, Session, styles } from './definition';

const getCurrentDate = (): string => {
    const now = new Date();
    return `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()}`; 
};

interface StudyTimerProps {
    sessions: Session[];
    onAddSession: (session: Session) => void;
    onDeleteSession: (id: string) => void; 
    timerState: any; 
}
interface StopwatchContentProps {
    timerRunning: boolean;
    elapsedTime: number;
    currentSubject: string;
    currentPages: string;
    setCurrentSubject: (text: string) => void;
    setCurrentPages: (text: string) => void;
    startTimer: () => void;
    stopTimer: () => void;
    resetTimer: () => void;
}
interface ManualContentProps {
    onSaveManualSession: (session: Session) => void;
}
interface CountdownContentProps {
    targetTime: number;
    setTargetTime: (seconds: number) => void;
    countdownRunning: boolean;
    isPaused: boolean; 
    timeRemaining: number;
    currentSubject: string;
    currentPages: string;
    setCurrentSubject: (text: string) => void;
    setCurrentPages: (text: string) => void;
    startCountdown: () => void; 
    stopCountdown: () => void; 
    resetCountdown: () => void; 
}

const StopwatchContent: React.FC<StopwatchContentProps> = React.memo(({
    timerRunning, elapsedTime, currentSubject, currentPages, setCurrentSubject, setCurrentPages, startTimer, stopTimer, resetTimer,
}) => (
    <View style={{ marginTop: 4 }}>
        <View style={styles.flexRow}>
            <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>科目</Text>
                <TextInput style={[styles.inputBase, { padding: 10, borderRadius: 12 }]} value={currentSubject} onChangeText={setCurrentSubject} placeholder="例: 数学" placeholderTextColor="#94a3b8" />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>ページ数</Text>
                <TextInput style={[styles.inputBase, { padding: 10, borderRadius: 12 }]} value={currentPages} onChangeText={setCurrentPages} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
            </View>
        </View>
        <View style={{ backgroundColor: Colors.primaryLight, marginTop: 16, padding: 16, borderRadius: 20, alignItems: 'center' }}>
            <Text style={{ fontSize: 44, fontWeight: '800', color: Colors.primary, fontFamily: 'Courier', marginVertical: 12 }}>{formatDuration(elapsedTime)}</Text>
            <View style={[styles.flexRow, { width: '100%', justifyContent: 'space-between' }]}>
                <TouchableOpacity onPress={timerRunning ? stopTimer : startTimer} style={[styles.buttonPrimary, { flex: 1, marginRight: 12, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, alignSelf: 'stretch' }]}>
                    <Icon name={timerRunning ? 'Pause' : 'Play'} style={{ fontSize: 13, color: '#fff', marginRight: 4 }} />
                    <Text style={[styles.buttonText, { fontSize: 13, letterSpacing: -0.3 }]} numberOfLines={1}>
                        {timerRunning ? '一時停止' : '開始'}
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={resetTimer} style={[styles.timerButtonDanger, { flex: 1, height: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, alignSelf: 'stretch' }]}>
                    <Icon name="Square" style={{ fontSize: 13, color: '#fff', marginRight: 4 }} />
                    <Text style={[styles.buttonText, { fontSize: 13, letterSpacing: -0.3 }]} numberOfLines={1}>
                        終了/記録
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    </View>
));

const ManualContent: React.FC<ManualContentProps> = React.memo(({ onSaveManualSession }) => {
    const [manualSubject, setManualSubject] = useState<string>('');
    const [manualStartTime, setManualStartTime] = useState<string>('09:00'); 
    const [manualEndTime, setManualEndTime] = useState<string>('10:30'); 
    const [manualPages, setManualPages] = useState<string>('');

    const handleSave = () => {
        const pagesValue = parseInt(manualPages || '0', 10);
        if (pagesValue < 0) {
            alert('ページ数にマイナスの値は入力できません。');
            return;
        }
        if (manualSubject) {
            const [startH, startM] = manualStartTime.split(':').map(Number);
            const [endH, endM] = manualEndTime.split(':').map(Number);
            const startDate = new Date(); startDate.setHours(startH, startM, 0, 0);
            const endDate = new Date(); endDate.setHours(endH, endM, 0, 0);
            let durationMin = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60));
            if (durationMin <= 0) { durationMin += 24 * 60; } 
            onSaveManualSession({ id: Date.now().toString(), subject: manualSubject || 'other', durationMin, secondsRemainder: 0, pages: pagesValue, date: getCurrentDate() });
            setManualSubject(''); setManualPages('');
        } else { 
            alert('科目を入力してください。');
        }
    };

    return (
        <View style={{ marginTop: 4 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>科目</Text>
            <TextInput style={[styles.inputBase, { marginBottom: 12, padding: 10, borderRadius: 12 }]} value={manualSubject} onChangeText={setManualSubject} placeholder="例: 数学" placeholderTextColor="#94a3b8" />
            <View style={styles.flexRow}>
                <View style={{ flex: 1, marginRight: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>開始時刻</Text>
                    <View style={{ width: '100%', height: 40, borderRadius: 12, borderStyle: 'solid', borderWidth: 1, borderColor: '#e4e4e7', backgroundColor: '#f4f4f5', overflow: 'hidden' }}>
                        <input type="time" value={manualStartTime} onChange={(e) => setManualStartTime(e.target.value)} style={{ width: '100%', height: '100%', padding: '0 10px', border: 'none', backgroundColor: 'transparent', color: '#18181b', fontFamily: 'inherit', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                    </View>
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>終了時刻</Text>
                    <View style={{ width: '100%', height: 40, borderRadius: 12, borderStyle: 'solid', borderWidth: 1, borderColor: '#e4e4e7', backgroundColor: '#f4f4f5', overflow: 'hidden' }}>
                        <input type="time" value={manualEndTime} onChange={(e) => setManualEndTime(e.target.value)} style={{ width: '100%', height: '100%', padding: '0 10px', border: 'none', backgroundColor: 'transparent', color: '#18181b', fontFamily: 'inherit', fontSize: '14px', outline: 'none', boxSizing: 'border-box' }} />
                    </View>
                </View>
            </View>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginTop: 12, marginBottom: 4 }}>ページ数</Text>
            <TextInput style={[styles.inputBase, { marginBottom: 16, padding: 10, borderRadius: 12 }]} value={manualPages} onChangeText={setManualPages} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
            <TouchableOpacity onPress={handleSave} style={styles.buttonPrimary}><Text style={styles.buttonText}>記録を保存</Text></TouchableOpacity>
        </View>
    );
});

const CountdownContent: React.FC<CountdownContentProps> = React.memo(({
    targetTime, setTargetTime, countdownRunning, isPaused, timeRemaining, currentSubject, currentPages, setCurrentSubject, setCurrentPages, startCountdown, stopCountdown, resetCountdown,
}) => {
    const [minutesInput, setMinutesInput] = useState<string>(String(Math.floor(targetTime / 60)));
    useEffect(() => { setMinutesInput(String(Math.floor(targetTime / 60))); }, [targetTime]);

    return (
        <View style={{ marginTop: 4 }}>
            <View style={[styles.flexRow, { marginBottom: 12 }]}>
                <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>設定時間 (分)</Text>
                    <TextInput style={[styles.inputBase, { padding: 10, borderRadius: 12 }]} value={minutesInput} onChangeText={(t) => { setMinutesInput(t); setTargetTime(parseInt(t || '0', 10) * 60); }} placeholder="25" placeholderTextColor="#94a3b8" keyboardType="numeric" editable={!countdownRunning && !isPaused} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>科目</Text>
                    <TextInput style={[styles.inputBase, { padding: 10, borderRadius: 12 }]} value={currentSubject} onChangeText={setCurrentSubject} placeholder="例: 数学" placeholderTextColor="#94a3b8" />
                </View>
            </View>
            <View>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#4b5563', marginBottom: 4 }}>ページ数</Text>
                <TextInput style={[styles.inputBase, { padding: 10, borderRadius: 12, marginBottom: 16 }]} value={currentPages} onChangeText={setCurrentPages} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
            </View>
            <View style={{ backgroundColor: Colors.primaryLight, padding: 16, borderRadius: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 44, fontWeight: '800', color: timeRemaining <= 10 && timeRemaining > 0 ? Colors.destructive : Colors.primary, fontFamily: 'Courier', marginVertical: 12 }}>{formatDuration(timeRemaining)}</Text>
                <View style={[styles.flexRow, { width: '100%', justifyContent: 'space-between' }]}>
                    <TouchableOpacity onPress={countdownRunning ? stopCountdown : startCountdown} disabled={targetTime === 0 && !isPaused} style={[styles.buttonPrimary, { flex: 1, marginRight: 12, height: 48, borderRadius: 12, opacity: (targetTime === 0 && !isPaused) ? 0.5 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, alignSelf: 'stretch' }]}>
                        <Icon name={countdownRunning ? 'Pause' : 'Play'} style={{ fontSize: 13, color: '#fff', marginRight: 4 }} />
                        <Text style={[styles.buttonText, { fontSize: 13, letterSpacing: -0.3 }]} numberOfLines={1}>
                            {countdownRunning ? '一時停止' : isPaused ? '再開' : '開始'}
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={resetCountdown} disabled={!countdownRunning && !isPaused} style={[styles.timerButtonDanger, { flex: 1, height: 48, borderRadius: 12, opacity: (!countdownRunning && !isPaused) ? 0.5 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2, alignSelf: 'stretch' }]}>
                        <Icon name="Square" style={{ fontSize: 13, color: '#fff', marginRight: 4 }} />
                        <Text style={[styles.buttonText, { fontSize: 13, letterSpacing: -0.3 }]} numberOfLines={1}>
                            終了/記録
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
});

const StudyTimer: React.FC<StudyTimerProps> = ({ sessions, onAddSession, onDeleteSession, timerState }) => {
    const { swRunning, setSwRunning, elapsedTime, setElapsedTime, countdownRunning, setCountdownRunning, isPaused, setIsPaused, targetTime, setTargetTime, timeRemaining, setTimeRemaining } = timerState;
    const [currentTab, setCurrentTab] = useState<'stopwatch' | 'timer' | 'manual'>('stopwatch');
    const [currentSubject, setCurrentSubject] = useState<string>('数学');
    const [currentPages, setCurrentPages] = useState<string>('10');
    const backgroundTimeRef = useRef<number | null>(null);

    const saveSession = useCallback((durationSeconds: number, pages: string, subject: string) => {
        if (durationSeconds > 0) {
            onAddSession({ id: Date.now().toString(), subject: subject || 'other', durationMin: Math.floor(durationSeconds / 60), secondsRemainder: durationSeconds % 60, pages: parseInt(pages || '0', 10), date: getCurrentDate() });
        }
    }, [onAddSession]);

    useEffect(() => {
        const handleAppStateChange = (nextAppState: AppStateStatus) => {
            if (nextAppState === 'background') {
                backgroundTimeRef.current = Date.now();
            } else if (nextAppState === 'active' && backgroundTimeRef.current !== null) {
                const elapsedMs = Date.now() - backgroundTimeRef.current;
                const elapsedSec = Math.floor(elapsedMs / 1000);
                if (elapsedSec > 0) {
                    if (swRunning) {
                        setElapsedTime((prev: number) => prev + elapsedSec);
                    } else if (countdownRunning) {
                        setTimeRemaining((prev: number) => Math.max(0, prev - elapsedSec));
                    }
                }
                backgroundTimeRef.current = null;
            }
        };
        const subscription = AppState.addEventListener('change', handleAppStateChange);
        return () => subscription.remove();
    }, [swRunning, countdownRunning, setElapsedTime, setTimeRemaining]);

    useEffect(() => {
        if (timeRemaining === 0 && countdownRunning) {
            setCountdownRunning(false);
            setIsPaused(false);
            Vibration.vibrate([0, 300, 300, 300]);
            if (Platform.OS === 'web') {
                if (confirm('時間です！記録を保存しますか？')) {
                    saveSession(targetTime, currentPages, currentSubject);
                }
                setTimeRemaining(targetTime);
            } else {
                Alert.alert('時間です！', '記録を保存しますか？', [
                    { text: 'キャンセル', style: 'cancel', onPress: () => setTimeRemaining(targetTime) },
                    { text: '保存', onPress: () => { saveSession(targetTime, currentPages, currentSubject); setTimeRemaining(targetTime); Vibration.vibrate(500); } }
                ]);
            }
        }
    }, [timeRemaining, countdownRunning, targetTime, currentPages, currentSubject, saveSession, setCountdownRunning, setIsPaused, setTimeRemaining]);

    const startStopwatch = useCallback(() => { setCountdownRunning(false); setSwRunning(true); }, [setSwRunning, setCountdownRunning]);
    const stopStopwatch = useCallback(() => { setSwRunning(false); }, [setSwRunning]);

    const resetStopwatch = useCallback(() => {
        if (elapsedTime === 0) {
            alert('計測時間が0秒のため保存されませんでした。');
            return;
        }
        if (confirm(`学習記録を保存しますか？\n計測時間: ${formatDuration(elapsedTime)}\n科目: ${currentSubject}`)) {
            saveSession(elapsedTime, currentPages, currentSubject);
            stopStopwatch();
            setElapsedTime(0);
        }
    }, [elapsedTime, currentPages, currentSubject, stopStopwatch, setElapsedTime, saveSession]);
    
    const startCountdownCall = useCallback(() => {
        if (timeRemaining <= 0) {
            alert('タイマー時間を設定してください。');
            return;
        }
        setSwRunning(false); setIsPaused(false); setCountdownRunning(true);
    }, [timeRemaining, setSwRunning, setIsPaused, setCountdownRunning]);

    const stopCountdownCall = useCallback(() => { setCountdownRunning(false); setIsPaused(true); }, [setCountdownRunning, setIsPaused]);
    
    const resetCountdownCall = useCallback(() => { 
        setCountdownRunning(false); 
        setIsPaused(false); 
        const actualStudiedSeconds = targetTime - timeRemaining; 
        if (actualStudiedSeconds > 0) { 
            saveSession(actualStudiedSeconds, currentPages, currentSubject);
            alert(`${currentSubject}の学習実績を保存しました。`);
        } 
        setTimeRemaining(targetTime); 
    }, [targetTime, timeRemaining, currentPages, currentSubject, saveSession, setCountdownRunning, setIsPaused, setTimeRemaining]); 
    
    useEffect(() => { if (!countdownRunning && !isPaused) setTimeRemaining(targetTime); }, [targetTime, countdownRunning, isPaused, setTimeRemaining]);
    
    const handleSaveManualSession = useCallback((session: Session) => {
        onAddSession(session);
        alert('保存完了: 学習記録を保存しました。');
    }, [onAddSession]);

    const handleDeletePress = useCallback((session: Session) => { 
        if (confirm(`${session.date}の「${session.subject}」の記録を削除しますか？`)) {
            onDeleteSession(session.id);
        }
    }, [onDeleteSession]);

    const todaySessions = sessions.filter(s => s.date === getCurrentDate());
    const todayDuration = todaySessions.reduce((sum, s) => sum + s.durationMin + Math.floor(s.secondsRemainder / 60), 0);
    const todayPages = todaySessions.reduce((sum, s) => sum + s.pages, 0);
    const recentDuration = sessions.slice(0, 7).reduce((sum, s) => sum + s.durationMin, 0);

    const TimeCard: React.FC<{ title: string; duration: string; detail: string; isPrimary: boolean }> = ({ title, duration, detail, isPrimary }) => {
        const parts = duration.split('h ');
        const displayH = parts.length > 1 ? parts[0] : '0';
        const displayM = parts.length > 1 ? parts[1].replace('m', '') : duration.replace('m', '').replace('s', '');
        return (
            <View style={[styles.card, { flex: 1, padding: 14, borderWidth: isPrimary ? 2 : 1, borderColor: isPrimary ? Colors.primary : Colors.border, alignItems: 'center' }]}>
                <Text style={{ fontSize: 11, color: '#71717a', marginBottom: 4 }}>{title}</Text>
                <Text style={{ fontSize: 20, fontWeight: '800', color: isPrimary ? Colors.primary : '#18181b' }}>{displayH === '0' ? displayM : `${displayH}h ${displayM}`}</Text>
                <Text style={{ fontSize: 11, color: '#71717a', marginTop: 2 }}>{detail}</Text>
            </View>
        );
    };

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 10 }}> 
            <View style={styles.flexRow}>
                <TimeCard title="本日の学習" duration={formatMinToHourMin(todayDuration, 0)} detail={`${todayPages}ページ`} isPrimary={true} />
                <View style={{ width: 8 }} />
                <TimeCard title="最近7日間" duration={formatMinToHourMin(recentDuration, 0)} detail={`${sessions.slice(0,7).length}セッション`} isPrimary={false} />
            </View>
            <View style={[styles.card, { padding: 16, marginVertical: 16 }]}>
                <Text style={styles.textLg}>学習時間記録</Text>
                <Text style={{ fontSize: 11, color: '#71717a', marginBottom: 12 }}>ストップウォッチ/カウントダウン</Text>
                <View style={[styles.flexRow, { backgroundColor: '#f4f4f5', borderRadius: 14, padding: 4, marginBottom: 16 }]}>
                    {(['stopwatch', 'timer', 'manual'] as const).map(tab => (
                        <TouchableOpacity key={tab} onPress={() => setCurrentTab(tab)} style={[{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: currentTab === tab ? Colors.card : 'transparent' }, currentTab === tab && { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 1 }]}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: currentTab === tab ? Colors.primary : '#71717a' }}>{tab === 'stopwatch' ? 'ストップウォッチ' : tab === 'timer' ? 'タイマー' : '手動入力'}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {currentTab === 'stopwatch' ? (
                    <StopwatchContent timerRunning={swRunning} elapsedTime={elapsedTime} currentSubject={currentSubject} currentPages={currentPages} setCurrentSubject={setCurrentSubject} setCurrentPages={setCurrentPages} startTimer={startStopwatch} stopTimer={stopStopwatch} resetTimer={resetStopwatch} />
                ) : currentTab === 'timer' ? (
                    <CountdownContent targetTime={targetTime} setTargetTime={setTargetTime} countdownRunning={countdownRunning} isPaused={isPaused} timeRemaining={timeRemaining} currentSubject={currentSubject} currentPages={currentPages} setCurrentSubject={setCurrentSubject} setCurrentPages={setCurrentPages} startCountdown={startCountdownCall} stopCountdown={stopCountdownCall} resetCountdown={resetCountdownCall} />
                ) : (
                    <ManualContent onSaveManualSession={handleSaveManualSession} /> 
                )}
            </View>
            <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
                <Text style={styles.textLg}>最近の学習記録</Text>
                <View style={{ marginTop: 12 }}>
                    {[...sessions].sort((a, b) => b.id.localeCompare(a.id)).map((session: Session) => (
                        <View key={session.id} style={[styles.flexRow, { justifyContent: 'space-between', padding: 12, backgroundColor: '#f9fafb', borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 8 }]}>
                            <View style={styles.flexRow}>
                                <Text style={{ fontSize: 10, fontWeight: 'bold', backgroundColor: Colors.primaryLight, color: Colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 8 }}>{session.subject}</Text>
                                <Text style={{ fontSize: 11, color: '#71717a' }}>{session.date.substring(5)}</Text>
                            </View>
                            <View style={styles.flexRow}>
                                <View style={{ alignItems: 'flex-end', marginRight: 12 }}>
                                    <Text style={{ fontSize: 12, fontWeight: '700', color: '#18181b' }}>{formatMinToHourMin(session.durationMin, session.secondsRemainder)}</Text>
                                    <Text style={{ fontSize: 10, color: '#9ca3af' }}>{session.pages}p</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleDeletePress(session)} style={{ padding: 4 }}>
                                    <Text style={{ fontSize: 14 }}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
};

export default StudyTimer;