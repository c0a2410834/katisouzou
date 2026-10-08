import React, { useState, useRef, useMemo, useEffect } from 'react'; 
import { Alert, Text, TouchableOpacity, View, ScrollView, StyleSheet, Platform } from 'react-native'; 
import { CameraView, useCameraPermissions } from 'expo-camera'; 
import { doc, setDoc } from 'firebase/firestore'; 
import jsQR from 'jsqr'; 
import { Colors, Icon, SeatType, ReservationSlot, styles } from './definition'; 
import { db } from './firebase'; 

interface StudySeatProps {
    firebaseSeats: SeatType[];
    currentUid: string;
}

const ALL_SEAT_IDS = [
    'W-1', 'W-2', 'W-3', 'W-4',
    'A-1', 'A-2', 'B-1', 'B-2', 'C-1', 'C-2', 'D-1', 'D-2',
    'A-3', 'A-4', 'B-3', 'B-4', 'C-3', 'C-4', 'D-3', 'D-4'
];

const StudySeat: React.FC<StudySeatProps> = ({ firebaseSeats, currentUid }) => {
    const [selectedHour, setSelectedHour] = useState<number>(10); 
    const [permission, requestPermission] = useCameraPermissions(); 
    const [showCamera, setShowCamera] = useState<boolean>(false); 
    const isProcessing = useRef<boolean>(false); 
    const webStreamRef = useRef<MediaStream | null>(null); 
    const webVideoRef = useRef<HTMLVideoElement | null>(null); 
    const webCanvasRef = useRef<HTMLCanvasElement | null>(null); 
    const webIntervalRef = useRef<any>(null); 
    const [showRightIndicator, setShowRightIndicator] = useState<boolean>(true);
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; 
    const currentDate = now.getDate();
    const currentDay = now.getDay(); 
    const currentActualHour = now.getHours();
    const todayStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;

    useEffect(() => {
        if (Platform.OS === 'web') {
            if (showCamera) {
                if (!webCanvasRef.current) {
                    webCanvasRef.current = document.createElement('canvas'); 
                }
                navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } }).then(stream => {
                    webStreamRef.current = stream;
                    if (webVideoRef.current) {
                        webVideoRef.current.srcObject = stream;
                        webVideoRef.current.play().catch(() => {});
                        webIntervalRef.current = setInterval(() => {
                            if (isProcessing.current || !webVideoRef.current || !webCanvasRef.current) return;
                            const video = webVideoRef.current;
                            const canvas = webCanvasRef.current;
                            if (video.readyState === video.HAVE_ENOUGH_DATA) {
                                canvas.width = video.videoWidth;
                                canvas.height = video.videoHeight;
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                                    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' });
                                    if (code && code.data) {
                                        handleBarcodeScanned({ data: code.data }); 
                                    }
                                }
                            }
                        }, 300);
                    }
                }).catch(() => {});
            } else {
                if (webIntervalRef.current) clearInterval(webIntervalRef.current);
                if (webStreamRef.current) {
                    webStreamRef.current.getTracks().forEach(track => track.stop()); 
                    webStreamRef.current = null;
                }
            }
        }
        return () => {
            if (webIntervalRef.current) clearInterval(webIntervalRef.current);
            if (webStreamRef.current) {
                webStreamRef.current.getTracks().forEach(track => track.stop()); 
            }
        };
    }, [showCamera]);

    const availableHours = useMemo(() => {
        let closingHour = 16; 
        if (currentDay === 0) {
            closingHour = 16;
        } else {
            if (currentMonth >= 10 || currentMonth <= 2) {
                closingHour = 16;
            } else if (currentMonth === 3 || currentMonth === 4) {
                closingHour = 17;
            } else if (currentMonth >= 5 && currentMonth <= 9) {
                closingHour = 18;
            }
        }
        const hours = [];
        for (let h = 10; h < closingHour; h++) {
            hours.push(h);
        }
        return hours;
    }, [currentMonth, currentDay]);

    useEffect(() => {
        if (!availableHours.includes(selectedHour) && availableHours.length > 0) {
            setSelectedHour(availableHours[0]);
        }
    }, [availableHours, selectedHour]);

    useEffect(() => {
        firebaseSeats.forEach(async (seat) => {
            let isChanged = false;
            const cleanedSlots = seat.reservedSlots.filter(s => {
                if (s.startTime === 99) return true;
                const slotDate = s.date || todayStr;
                if (slotDate < todayStr) {
                    isChanged = true;
                    return false;
                }
                if (slotDate === todayStr && currentActualHour >= s.startTime + 1) {
                    const hasCheckIn = seat.reservedSlots.some(sCheck => sCheck.startTime === 99 && sCheck.userId === s.userId);
                    if (!hasCheckIn) {
                        isChanged = true;
                        return false;
                    }
                }
                return true;
            });
            if (isChanged) {
                try {
                    const seatDocRef = doc(db, 'seats', seat.id);
                    await setDoc(seatDocRef, {
                        id: seat.id,
                        reservedSlots: cleanedSlots
                    }, { merge: true }); 
                } catch (error) {
                    console.error('自動クリーンアップ失敗:', error);
                }
            }
        });
    }, [firebaseSeats, currentActualHour, todayStr]);

    const seatMap = useMemo(() => {
        const map: Record<string, SeatType> = {};
        ALL_SEAT_IDS.forEach(id => {
            map[id] = { id, reservedSlots: [] };
        });
        firebaseSeats.forEach(s => {
            if (map[s.id]) {
                map[s.id].reservedSlots = s.reservedSlots || [];
            }
        });
        return map;
    }, [firebaseSeats]);

    const wSeats = useMemo(() => ['W-1', 'W-2', 'W-3', 'W-4'].map(id => seatMap[id]), [seatMap]);
    const iSeatsLeft = useMemo(() => ['A-1', 'A-2', 'B-1', 'B-2', 'C-1', 'C-2', 'D-1', 'D-2'].map(id => seatMap[id]), [seatMap]);
    const iSeatsRight = useMemo(() => ['A-3', 'A-4', 'B-3', 'B-4', 'C-3', 'C-4', 'D-3', 'D-4'].map(id => seatMap[id]), [seatMap]);

    const mySeat = useMemo(() => {
        for (const seatId of ALL_SEAT_IDS) {
            const slot = seatMap[seatId].reservedSlots.find(s => s.userId === currentUid && s.startTime === 99);
            if (slot) {
                return seatId;
            }
        }
        return null;
    }, [seatMap, currentUid]);

    const myReservation = useMemo(() => {
        for (const seatId of ALL_SEAT_IDS) {
            const slot = seatMap[seatId].reservedSlots.find(s => s.userId === currentUid && s.startTime !== 99 && (s.date || todayStr) === todayStr);
            if (slot) {
                return { seatId, startTime: slot.startTime };
            }
        }
        return null;
    }, [seatMap, currentUid, todayStr]);

    const customSimpleAlert = (title: string, message: string) => {
        if (Platform.OS === 'web') {
            alert(`${title}: ${message}`);
        } else {
            Alert.alert(title, message);
        }
    };

    const handleQrScanStart = async () => {
        if (mySeat) { customSimpleAlert('チェックイン済み', `すでに席 ${mySeat} に着席しています。`); return; }
        if (Platform.OS !== 'web' && !permission?.granted) {
            const res = await requestPermission(); 
            if (!res.granted) { customSimpleAlert('エラー', 'カメラの利用が許可されていません。'); return; }
        }
        isProcessing.current = false; 
        setShowCamera(true); 
    };

    const executeCheckIn = async (targetId: string, currentSlots: ReservationSlot[], shouldOverwrite: boolean) => {
        try {
            const seatDocRef = doc(db, 'seats', targetId);
            let updatedSlots = [...currentSlots];
            if (shouldOverwrite) {
                updatedSlots = updatedSlots.filter(s => s.startTime !== 99);
            }
            const newSlot: ReservationSlot = { startTime: 99, userId: currentUid, date: todayStr };
            updatedSlots.push(newSlot);
            await setDoc(seatDocRef, { id: targetId, reservedSlots: updatedSlots }, { merge: true });
            setShowCamera(false);
            customSimpleAlert('チェックイン成功', `席 ${targetId} に着席しました！`);
        } catch (error) {
            console.error('チェックイン失敗:', error);
            isProcessing.current = false;
        }
    };

    const handleBarcodeScanned = async ({ data }: { data: string }) => {
        if (isProcessing.current) return; 
        isProcessing.current = true; 
        const targetId = data.trim(); 
        if (ALL_SEAT_IDS.includes(targetId)) { 
            const currentSeatData = seatMap[targetId]; 
            const occupiedSlot = currentSeatData.reservedSlots.find(s => s.startTime === 99);
            if (occupiedSlot) {
                if (occupiedSlot.userId === currentUid) {
                    customSimpleAlert('エラー', `すでに席 ${targetId} に着席中として処理されています。`);
                    isProcessing.current = false;
                    setShowCamera(false);
                    return;
                }
                if (Platform.OS === 'web') {
                    const confirmOverwrite = window.confirm(`席 ${targetId} は現在利用中となっています。誰もいない場合は上書きして着席しますか？`);
                    if (confirmOverwrite) {
                        await executeCheckIn(targetId, currentSeatData.reservedSlots, true);
                    } else {
                        isProcessing.current = false;
                        setShowCamera(false);
                    }
                } else {
                    Alert.alert('席の確認', `席 ${targetId} は現在利用中となっています。誰もいない場合は上書きして着席しますか？`, [
                        { text: 'キャンセル', style: 'cancel', onPress: () => { isProcessing.current = false; setShowCamera(false); } },
                        { text: '上書きする', onPress: async () => { await executeCheckIn(targetId, currentSeatData.reservedSlots, true); } }
                    ]);
                }
                return;
            }
            if (myReservation && myReservation.seatId !== targetId) {
                if (Platform.OS === 'web') {
                    alert(`エラー: あなたは現在 ${myReservation.seatId} を予約しています。予約席のQRをスキャンしてください。`);
                    isProcessing.current = false;
                    setShowCamera(false);
                } else {
                    Alert.alert('エラー', `あなたは現在 ${myReservation.seatId} を予約しています。予約席のQRをスキャンしてください。`, [
                        { text: 'OK', onPress: () => { isProcessing.current = false; setShowCamera(false); } } 
                    ]);
                }
                return;
            }
            await executeCheckIn(targetId, currentSeatData.reservedSlots, false);
        } else {
            if (Platform.OS === 'web') {
                alert(`エラー: 無効な座席データです: ${targetId}`);
                isProcessing.current = false;
                setShowCamera(false);
            } else {
                isProcessing.current = false; 
                Alert.alert('エラー', `無効な座席データです: ${targetId}`, [
                    { text: 'OK', onPress: () => { setShowCamera(false); } } 
                ]);
            }
        }
    };

    const handleCheckOut = async () => {
        if (!mySeat) return;
        try {
            const seatDocRef = doc(db, 'seats', mySeat);
            const currentSeatData = seatMap[mySeat];
            const updatedSlots = currentSeatData.reservedSlots.filter(s => !(s.userId === currentUid && s.startTime === 99));
            await setDoc(seatDocRef, { id: mySeat, reservedSlots: updatedSlots }, { merge: true });
            customSimpleAlert('退室完了', 'ご利用ありがとうございました！お疲れ様です！'); 
        } catch (error) {
            console.error('退席失敗:', error);
        }
    };

    const handleSelectSeat = async (seat: SeatType) => {
        if (mySeat) return; 
        const isCurrentlyOccupied = seat.reservedSlots.some(s => s.startTime === 99);
        if (isCurrentlyOccupied) {
            customSimpleAlert('予約不可', 'この席は現在、他のユーザーが実装着席中のため予約できません。');
            return;
        }
        const slot = seat.reservedSlots.find(s => s.startTime === selectedHour && (s.date || todayStr) === todayStr);
        if (slot) {
            if (slot.userId === currentUid) {
                if (Platform.OS === 'web') {
                    const confirmCancel = window.confirm(`${selectedHour}:00からの席 ${seat.id} の予約を取り消しますか？`);
                    if (confirmCancel) {
                        try {
                            const seatDocRef = doc(db, 'seats', seat.id);
                            const updatedSlots = seat.reservedSlots.filter(r => !(r.startTime === selectedHour && (r.date || todayStr) === todayStr));
                            await setDoc(seatDocRef, { id: seat.id, reservedSlots: updatedSlots }, { merge: true });
                        } catch (error) {
                            console.error('予約キャンセル失敗:', error);
                        }
                    }
                } else {
                    Alert.alert('予約キャンセル', `${selectedHour}:00からの席 ${seat.id} の予約を取り消しますか？`, [
                        { text: 'いいえ', style: 'cancel' },
                        { text: '取り消す', style: 'destructive', onPress: async () => {
                            try {
                                const seatDocRef = doc(db, 'seats', seat.id);
                                const updatedSlots = seat.reservedSlots.filter(r => !(r.startTime === selectedHour && (r.date || todayStr) === todayStr));
                                await setDoc(seatDocRef, { id: seat.id, reservedSlots: updatedSlots }, { merge: true });
                            } catch (error) {
                                console.error('予約キャンセル失敗:', error);
                            }
                        }}
                    ]);
                }
            } else {
                customSimpleAlert('予約不可', 'この時間はすでに他のユーザーに予約されています。');
            }
            return;
        }
        if (myReservation) { customSimpleAlert('制限', '同時に予約できるのは1つの時間枠のみです。'); return; }
        if (Platform.OS === 'web') {
            const confirmReserve = window.confirm(`${selectedHour}:00 からの1時間で 席 ${seat.id} を予約しますか？`);
            if (confirmReserve) {
                try {
                    const seatDocRef = doc(db, 'seats', seat.id);
                    const newSlot: ReservationSlot = { startTime: selectedHour, userId: currentUid, date: todayStr };
                    const updatedSlots = [...seat.reservedSlots, newSlot];
                    await setDoc(seatDocRef, { id: seat.id, reservedSlots: updatedSlots }, { merge: true });
                } catch (error) {
                    console.error('予約失敗:', error);
                }
            }
        } else {
            Alert.alert('席の予約確認', `${selectedHour}:00 からの1時間で 席 ${seat.id} を予約しますか？`, [
                { text: 'キャンセル', style: 'cancel' },
                { text: '予約する', onPress: async () => {
                    try {
                        const seatDocRef = doc(db, 'seats', seat.id);
                        const newSlot: ReservationSlot = { startTime: selectedHour, userId: currentUid, date: todayStr };
                        const updatedSlots = [...seat.reservedSlots, newSlot];
                        await setDoc(seatDocRef, { id: seat.id, reservedSlots: updatedSlots }, { merge: true });
                    } catch (error) {
                        console.error('予約失敗:', error);
                    }
                }}
            ]);
        }
    };

    const handleScroll = (event: any) => {
        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const isCloseToRight = layoutMeasurement.width + contentOffset.x >= contentSize.width - 20;
        setShowRightIndicator(!isCloseToRight);
    };

    const renderSeat = (seat: SeatType) => {
        const isOccupiedByMe = mySeat === seat.id;
        const currentSlot = seat.reservedSlots.find(s => s.startTime === selectedHour && (s.date || todayStr) === todayStr);
        const globalCheckInSlot = seat.reservedSlots.find(s => s.startTime === 99);
        let seatColor = Colors.border; 
        let seatBg = Colors.card;
        if (isOccupiedByMe) {
            seatColor = Colors.greenSuccess; seatBg = Colors.greenLight; 
        } else if (globalCheckInSlot) {
            seatColor = Colors.primaryBorder; seatBg = Colors.primaryLight;
        } else if (currentSlot) {
            if (currentSlot.userId === currentUid) { 
                seatColor = '#f97316'; seatBg = '#ffedd5'; 
            } else { 
                seatColor = Colors.primaryBorder; seatBg = Colors.primaryLight; 
            }
        }
        return (
            <TouchableOpacity key={seat.id} onPress={() => handleSelectSeat(seat)} style={{ alignItems: 'center', margin: 4 }}>
                <View style={{ width: 18, height: 18, borderRadius: 4, marginBottom: 2, backgroundColor: seatBg, borderWidth: 1.5, borderColor: seatColor }} />
                <View style={{ width: 44, height: 28, borderRadius: 4, backgroundColor: '#f3f4f6', borderWidth: 1.5, borderColor: seatColor, justifyContent: 'center', alignItems: 'center' }}>
                    <Text style={{ fontSize: 8, fontWeight: 'bold', color: seatColor }}>{seat.id}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingVertical: 10 }}>
            <View style={[styles.card, { padding: 16, marginBottom: 16 }]}>
                <View style={styles.flexRow}>
                    <Icon name="Target" style={{ fontSize: 20, color: Colors.primary, marginRight: 8 }} />
                    <Text style={styles.textLg}>自習室予約・チェックイン</Text>
                </View>
                <View style={[styles.infoBox, { marginVertical: 10, backgroundColor: mySeat ? Colors.greenLight : (myReservation ? '#ffedd5' : Colors.mutedTranslucent) }]}>
                    <Text style={[styles.infoBoxText, { fontWeight: '600' }]}>
                        {mySeat ? `現在の状況: 【 席 ${mySeat} に着席中 】` : (myReservation ? `状況: 【 席 ${myReservation.seatId} を ${myReservation.startTime}:00から予約中 】` : '状況: 【 未受付 / 時間を選んで席を予約 】')}
                    </Text>
                </View>
                <View style={{ backgroundColor: '#f3f4f6', padding: 12, borderRadius: 12, marginVertical: 4, position: 'relative' }}>
                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: '#4b5563', marginBottom: 8 }}>利用可能時間帯 ({todayStr}):</Text>
                    <View style={{ position: 'relative', flexDirection: 'row', alignItems: 'center' }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} onScroll={handleScroll} scrollEventThrottle={16} style={{ flexDirection: 'row' }}>
                            {availableHours.map(h => (
                                <TouchableOpacity key={h} onPress={() => setSelectedHour(h)} style={{ backgroundColor: selectedHour === h ? Colors.primary : '#fff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, marginRight: 8, borderWidth: 1, borderColor: selectedHour === h ? Colors.primary : Colors.border }}>
                                    <Text style={{ fontSize: 11, fontWeight: 'bold', color: selectedHour === h ? '#fff' : '#4b5563' }}>{h}:00 ~</Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                        {showRightIndicator && availableHours.length > 4 && (
                            <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', pointerEvents: 'none' }}><View style={{ position: 'absolute', left: 0, top: 0, bottom: 0, right: 0, backgroundColor: 'rgba(243,244,246,0.7)' }} /><Icon name="Play" style={{ fontSize: 14, color: '#9ca3af', marginRight: 4, opacity: 0.8 }} /></View>
                        )}
                    </View>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginTop: 10, padding: 6, backgroundColor: '#f9fafb', borderRadius: 6 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 10, height: 10, backgroundColor: Colors.card, borderWidth: 1, borderColor: Colors.border, borderRadius: 2, marginRight: 4 }} /><Text style={{ fontSize: 9, color: '#6b7280' }}>空席</Text></View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 10, height: 10, backgroundColor: Colors.primaryLight, borderWidth: 1, borderColor: Colors.primaryBorder, borderRadius: 2, marginRight: 4 }} /><Text style={{ fontSize: 9, color: '#6b7280' }}>予約不可</Text></View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 10, height: 10, backgroundColor: '#ffedd5', borderWidth: 1, borderColor: '#f97316', borderRadius: 2, marginRight: 4 }} /><Text style={{ fontSize: 9, color: '#6b7280' }}>自分の予約</Text></View>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}><View style={{ width: 10, height: 10, backgroundColor: Colors.greenLight, borderWidth: 1, borderColor: Colors.greenSuccess, borderRadius: 2, marginRight: 4 }} /><Text style={{ fontSize: 9, color: '#6b7280' }}>着席中</Text></View>
                </View>
                {showCamera && (
                    <View style={{ height: 250, borderRadius: 12, overflow: 'hidden', marginVertical: 10 }}>
                        {Platform.OS === 'web' ? (
                            <video ref={webVideoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
                        ) : (
                            <CameraView
                                style={StyleSheet.absoluteFillObject}
                                onBarcodeScanned={handleBarcodeScanned} 
                                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                            />
                        )}
                        <TouchableOpacity onPress={() => setShowCamera(false)} style={[styles.buttonPrimary, { backgroundColor: '#ef4444', position: 'absolute', bottom: 10, left: 10, right: 10, marginTop: 0 }]}>
                            <Text style={styles.buttonText}>カメラを閉じる</Text>
                        </TouchableOpacity>
                    </View>
                )}
                {!showCamera && (
                    !mySeat ? (
                        <TouchableOpacity onPress={handleQrScanStart} style={[styles.buttonPrimary, { marginTop: 12 }]}>
                            <Icon name="Camera" style={{ color: '#fff', marginRight: 8 }} />
                            <Text style={styles.buttonText}>{myReservation ? '予約席のQRをスキャンして着席' : 'QRスキャンで直接着席'}</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={handleCheckOut} style={[styles.buttonPrimary, { backgroundColor: '#ef4444', marginTop: 12 }]}>
                            <Icon name="Square" style={{ color: '#fff', marginRight: 8 }} />
                            <Text style={styles.buttonText}>利用終了（退室手続き）</Text>
                        </TouchableOpacity>
                    )
                )}
            </View>
            <View style={[styles.card, { padding: 16 }]}>
                <Text style={[styles.textLg, { marginBottom: 16, textAlign: 'center' }]}>座席マップ ({selectedHour}:00台)</Text>
                <View style={{ flexDirection: 'row', backgroundColor: '#f9fafb', padding: 12, borderRadius: 12, justifyContent: 'space-between' }}>
                    <View style={{ backgroundColor: '#e0f2fe', padding: 8, borderRadius: 8, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#bae6fd' }}>
                        <Text style={{ fontSize: 9, color: '#0369a1', fontWeight: 'bold', marginBottom: 8 }}>窓側 🪟</Text>
                        <View style={{ flexDirection: 'column' }}>
                            {wSeats.map(renderSeat)}
                        </View>
                    </View>
                    <View style={{ width: 12 }} />
                    <View style={{ flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start' }}>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 110, justifyContent: 'center' }}>
                            {iSeatsLeft.map(renderSeat)}
                        </View>
                        <View style={{ width: 8 }} />
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', width: 110, justifyContent: 'center' }}>
                            {iSeatsRight.map(renderSeat)}
                        </View>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
};

export default StudySeat;