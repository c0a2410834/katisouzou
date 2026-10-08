import React, { useState } from 'react'; 
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'; 
import { Colors, Icon, Session, styles } from './definition'; 

import QuestionAnswer from './ai_anser'; 
import QuestionGenerator from './ai_create'; 
import StudyMemo from './memo'; 
import StudyReport from './report'; 
import StudyTimer from './timer'; 
import Test from './test'; 

interface StudyLearningProps {
    sessions: Session[];
    onAddSession: (session: Session) => void;
    onDeleteSession: (id: string) => void; 
    timerState: any; // 親（index.tsx）のタイマーオブジェクトを格納
}

type LearningSubTab = 'question' | 'generate' | 'test' | 'timer' | 'report' | 'memo';

const StudyLearning: React.FC<StudyLearningProps> = ({ sessions, onAddSession, onDeleteSession, timerState }) => {
    const [subTab, setSubTab] = useState<LearningSubTab>('question'); 

    const subNavItems = [
        { tab: 'question' as const, icon: 'BookOpen' as const, label: '解答' }, 
        { tab: 'generate' as const, icon: 'Wand2' as const, label: '生成' }, 
        { tab: 'test' as const, icon: 'Target' as const, label: 'テスト' }, 
        { tab: 'timer' as const, icon: 'Clock' as const, label: 'タイマー' }, 
        { tab: 'report' as const, icon: 'BarChart3' as const, label: '分析' }, 
        { tab: 'memo' as const, icon: 'NotebookText' as const, label: 'メモ' } 
    ];

    const renderSubContent = () => {
        switch (subTab) {
            case 'question': return <QuestionAnswer />;
            case 'generate': return <QuestionGenerator />;
            case 'test': return <Test />;
            // timerStateをそのままtimer.tsxへパス
            case 'timer': return <StudyTimer sessions={sessions} onAddSession={onAddSession} onDeleteSession={onDeleteSession} timerState={timerState} />; 
            case 'report': return <StudyReport sessions={sessions} />;
            case 'memo': return <StudyMemo />;
            default: return <Text>コンテンツが見つかりません</Text>;
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <View style={[styles.card, { padding: 4, marginBottom: 12, backgroundColor: '#f4f4f5' }]}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false} 
                    contentContainerStyle={{ flexDirection: 'row', paddingHorizontal: 2 }}
                >
                    {subNavItems.map((item) => {
                        const isActive = subTab === item.tab;
                        return (
                            <TouchableOpacity
                                key={item.tab}
                                onPress={() => setSubTab(item.tab)}
                                style={{
                                    width: 72, 
                                    flexDirection: 'column', 
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    paddingVertical: 10, 
                                    marginHorizontal: 3,
                                    borderRadius: 16, 
                                    backgroundColor: isActive ? Colors.card : 'transparent', 
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isActive ? 0.04 : 0, 
                                    shadowRadius: 6,
                                    elevation: isActive ? 2 : 0,
                                }}
                            >
                                <Icon name={item.icon} style={{ fontSize: 16, color: isActive ? Colors.primary : '#71717a', marginBottom: 4 }} />
                                <Text style={{ color: isActive ? Colors.primary : '#71717a', fontSize: 11, fontWeight: isActive ? '800' : '600' }}>
                                    {item.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={{ flex: 1 }}>
                {renderSubContent()}
            </View>
        </View>
    );
};

export default StudyLearning;