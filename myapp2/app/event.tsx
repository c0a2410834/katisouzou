import React, { useEffect, useState } from 'react'; // コメントは真横に書く
import { View, Text, ScrollView, StyleSheet, Image, Dimensions, TouchableOpacity, Linking } from 'react-native'; 
import { collection, onSnapshot } from 'firebase/firestore'; 
import { db } from './firebase'; 

const { width } = Dimensions.get('window');

interface EventData {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  description: string;
  image: string; 
  url: string; 
}

interface SectionConfig {
  id: string;
  sectionTitle: string;
  order: number;
}

export default function EventScreen() { 
  const [featuredEvent, setFeaturedEvent] = useState<EventData | null>(null); 
  const [sections, setSections] = useState<SectionConfig[]>([]); 
  const [freshmanEvents, setFreshmanEvents] = useState<EventData[]>([]); 
  const [careerEvents, setCareerEvents] = useState<EventData[]>([]); 

  const openEventLink = (url: string) => { 
    if (url) { Linking.openURL(url).catch(err => console.error("URLを開けませんでした", err)); }
  };

  useEffect(() => {
    const unsubscribeFeatured = onSnapshot(collection(db, 'featuredEvents'), (snapshot) => {
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventData));
      if (events.length > 0) setFeaturedEvent(events[0]); 
    });
    const unsubscribeConfigs = onSnapshot(collection(db, 'sectionConfigs'), (snapshot) => {
      const configs: SectionConfig[] = []; 
      snapshot.forEach((doc) => {
        const data = doc.data(); // 管理画面の固定IDとここでガチッと一致させる
        if (doc.id === 'events_config') { configs.push({ id: 'events', sectionTitle: data.sectionTitle || '初心者・新入生・地域コミュニティ', order: 1 }); }
        if (doc.id === 'career_config') { configs.push({ id: 'careerEvents', sectionTitle: data.sectionTitle || 'キャリア・演習プロジェクト開発', order: 2 }); }
      });
      if (configs.length === 0) { // データがFirestoreに1件もない時だけ初期値をセット
        configs.push({ id: 'events', sectionTitle: '初心者・新入生・地域コミュニティ', order: 1 });
        configs.push({ id: 'careerEvents', sectionTitle: 'キャリア・演習プロジェクト開発', order: 2 });
      }
      configs.sort((a, b) => a.order - b.order); 
      setSections(configs); 
    });
    const unsubscribeFreshman = onSnapshot(collection(db, 'events'), (snapshot) => {
      setFreshmanEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventData)));
    });
    const unsubscribeCareer = onSnapshot(collection(db, 'careerEvents'), (snapshot) => {
      setCareerEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EventData)));
    });
    return () => { unsubscribeFeatured(); unsubscribeConfigs(); unsubscribeFreshman(); unsubscribeCareer(); };
  }, []);

  const renderSection = (sectionTitle: string, events: EventData[]) => { 
    if (!events || events.length === 0) return null;
    return (
      <View key={sectionTitle}>
        <Text style={styles.sectionTitle}>{sectionTitle}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {events.map((event) => (
            <TouchableOpacity key={event.id} style={styles.card} onPress={() => openEventLink(event.url)}>
              <Image source={{ uri: event.image || 'https://via.placeholder.com/500' }} style={styles.cardImage} />
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle} numberOfLines={2}>{event.title}</Text>
                <Text style={styles.cardDetails}>日時: {event.date}</Text>
                <Text style={styles.cardDetails}>場所: {event.location}</Text>
                <Text style={styles.cardDescription} numberOfLines={2}>{event.description && event.description.trim() !== "" ? event.description : '詳細情報はありません。'}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>注目の地域イベント</Text>
      {featuredEvent ? (
        <TouchableOpacity style={styles.featuredCard} onPress={() => openEventLink(featuredEvent.url)}>
          <Image source={{ uri: featuredEvent.image || 'https://via.placeholder.com/500' }} style={styles.featuredImage} />
          <View style={styles.featuredInfo}>
            <Text style={styles.featuredEventTitle}>{featuredEvent.title}</Text>
            <Text style={styles.eventDetails}>日時: {featuredEvent.date} {featuredEvent.time}</Text>
            <Text style={styles.eventDetails}>場所: {featuredEvent.location}</Text>
            <Text style={styles.eventDescription} numberOfLines={2}>{featuredEvent.description}</Text>
          </View>
        </TouchableOpacity>
      ) : (
        <Text style={styles.emptyText}>イベントを読み込み中...</Text>
      )}
      {sections.map(section => { // ここで重複を完全に排除して動的に1回ずつループ描画
        const targetEvents = section.id === 'events' ? freshmanEvents : careerEvents;
        return renderSection(section.sectionTitle, targetEvents);
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, marginTop: 24, marginBottom: 12, color: '#333' },
  featuredCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  featuredImage: { width: '100%', height: 180 },
  featuredInfo: { padding: 16 },
  featuredEventTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  eventDetails: { fontSize: 13, color: '#666', marginBottom: 4 },
  eventDescription: { fontSize: 14, color: '#444', marginTop: 8 },
  horizontalScroll: { paddingLeft: 16, paddingBottom: 16 },
  card: { backgroundColor: '#fff', width: width * 0.6, marginRight: 16, borderRadius: 12, overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardImage: { width: '100%', height: 120 },
  cardContent: { padding: 12 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 4, height: 40 },
  cardDetails: { fontSize: 11, color: '#777', marginTop: 2 },
  cardDescription: { fontSize: 12, color: '#555', marginTop: 6, minHeight: 34 },
  emptyText: { marginLeft: 16, color: '#999' }
});