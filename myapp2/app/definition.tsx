import { Text } from 'react-native'; 
import * as LucideIcons from 'lucide-react-native'; 

export type TabName = 'event' | 'seat' | 'learning' | 'mypage' | 'admin';

export interface Question {
    id: string;
    text: string;
    subject: string;
    date: string;
    answered: boolean;
    unit: string;
}

export interface GeneratedQuestion {
    id: string;
    text: string;
    subject: string;
    difficulty: string;
    copied: boolean;
    answer: string; 
}

export interface Answer {
    id: string;
    userName: string;
    subject: string;
    content: string;
    votes: number;
    date: string;
}

export interface Session {
    id: string;
    subject: string;
    durationMin: number;    
    secondsRemainder: number; 
    pages: number;
    date: string;
}

export interface ReportData {
    date: string;
    duration: number; 
    pages: number;
}

export interface SubjectBreakdown {
    subject: string;
    duration: number; 
    percentage: number;
}

export interface Memo {
    id: string;
    subject: string;
    content: string; 
    tags: string[];
    date: string;
    imageUri: string | null; 
}

export interface ReservationSlot {
    startTime: number; 
    userId: string; 
    date?: string;
}

export interface SeatType {
    id: string; 
    reservedSlots: ReservationSlot[]; 
}

export const mockQuestion: string = 'y = x² + 2x + 1 のグラフの頂点の座標を求めよ。';

export const mockAIAnswer: string = `解説
二次関数 y = x² + 2x + 1 の頂点の座標を求めるには、平方完成を行います。
1.  y = x² + 2x + 1
2.  平方完成の準備：xの項（2x）の係数（2）の半分（1）の2乗（1）を足して引きます。
3.  y = (x² + 2x + 1) - 1 + 1
4.  y = (x + 1)² + 0
5.  頂点の読み取り：y = a(x - p)² + q の形から、頂点は (p, q) です。
6.  したがって、頂点の座標は (-1, 0) です。

類似問題
二次関数 y = x² - 4x + 5 の頂点の座標を求めよ。`;

export const mockPreviousQuestions: Question[] = [
    { id: 'q1', text: '二次関数 y = x² + 2x + 1 の頂点の座標を求めよ。', subject: '数学', date: '10/18', answered: true, unit: '二次関数' },
    { id: 'q2', text: '光合成の化学反応式を記述せよ。', subject: '理科', date: '10/17', answered: false, unit: '生物' },
    { id: 'q3', text: 'I am reading a book. を受動態にしなさい。', subject: '英語', date: '10/16', answered: true, unit: '受動態' },
];

export const mockAnswers: Answer[] = [
    { id: 'a1', userName: '田中', subject: '数学', content: '頂点の座標は(-1, 0)ですね！平方完成が基本です。', votes: 15, date: '10/18' },
    { id: 'a2', userName: '山本', subject: '数学', content: '判別式Dを使う方法もありますが、この形なら平方完成が一番早いです。', votes: 8, date: '10/18' },
];

export const mockSessions: Session[] = [
    { id: 's1', subject: '数学', durationMin: 60, secondsRemainder: 0, pages: 12, date: '10/18' },
    { id: 's2', subject: '英語', durationMin: 45, secondsRemainder: 30, pages: 8, date: '10/18' },
    { id: 's3', subject: '理科', durationMin: 30, secondsRemainder: 0, pages: 5, date: '10/17' },
];

export const mockMemos: Memo[] = [
    { id: 'm1', content: '三平方の定理: a² + b² = c²。斜辺はc!', subject: '数学', tags: ['#公式', '#重要'], date: '2024/10/15', imageUri: null },
    { id: 'm2', content: '不定詞はto + 動詞の原形', subject: '英語', tags: ['#文法', '#基本'], date: '2024/10/14', imageUri: null },
    { id: 'm3', content: '酸化還元反応：酸化数に注意', subject: '化学', tags: ['#モル', '計算'], date: '2024/10/09', imageUri: null },
];

import { Colors as GlobalColors, globalStyles } from '../styles/global'; 

export const Colors = {
    ...GlobalColors,
    primary: '#0066ff', 
    primaryBorder: '#3b82f6', 
    primaryLight: '#eff6ff', 
    greenSuccess: '#10b981', 
    greenLight: '#ecfdf5', 
    card: '#ffffff', 
    border: '#e4e4e7', 
    mutedTranslucent: '#f4f4f5', 
};

export const styles = {
    ...globalStyles,
    card: {
        ...globalStyles.card,
        backgroundColor: Colors.card, 
        borderRadius: 24, 
        padding: 20, 
        shadowColor: '#000', 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.04, 
        shadowRadius: 12, 
        elevation: 2, 
    },
    textLg: {
        ...globalStyles.textLg,
        fontSize: 18, 
        fontWeight: '800' as const, 
        color: '#18181b', 
    },
    infoBox: {
        ...globalStyles.infoBox,
        padding: 14, 
        borderRadius: 16, 
    },
    buttonPrimary: {
        ...globalStyles.buttonPrimary,
        backgroundColor: Colors.primary, 
        height: 52, 
        borderRadius: 16, 
    },
    timerButtonDanger: {
        ...globalStyles.timerButtonDanger,
        backgroundColor: '#ef4444', 
        height: 52, 
        borderRadius: 16, 
    },
    buttonText: {
        ...globalStyles.buttonText,
        color: '#ffffff', 
        fontSize: 14, 
        fontWeight: '700' as const, 
    },
    inputBase: {
        ...globalStyles.inputBase,
        borderWidth: 1, 
        borderColor: '#cbd5e1', 
        backgroundColor: '#f8fafc', 
        opacity: 1.0, 
        padding: 12, 
        borderRadius: 12, 
    }
};

interface IconProps {
    name: keyof typeof iconMap;
    style?: any;
}

const iconMap = {
    BookOpen: LucideIcons.BookOpen, 
    Clock: LucideIcons.Clock, 
    BarChart3: LucideIcons.BarChart3, 
    Sparkles: LucideIcons.Sparkles, 
    Wand2: LucideIcons.Wand2, 
    Upload: LucideIcons.Upload, 
    ThumbsUp: LucideIcons.ThumbsUp, 
    ThumbsDown: LucideIcons.ThumbsDown, 
    Camera: LucideIcons.Camera, 
    Play: LucideIcons.Play, 
    Pause: LucideIcons.Pause, 
    Square: LucideIcons.Square, 
    Calendar: LucideIcons.Calendar, 
    Download: LucideIcons.Download, 
    Copy: LucideIcons.Copy, 
    Check: LucideIcons.Check, 
    BookMarked: LucideIcons.BookMarked, 
    Target: LucideIcons.Target, 
    NotebookText: LucideIcons.NotebookTabs, 
    RotateCcw: LucideIcons.RotateCcw, 
    Settings: LucideIcons.Settings, 
    User: LucideIcons.User, 
    Trash2: LucideIcons.Trash2, 
};

export const Icon: React.FC<IconProps> = ({ name, style }) => {
    const IconComponent = iconMap[name];
    if (!IconComponent) return <Text>?</Text>;
    const resolvedSize = style?.fontSize || 18; 
    const resolvedColor = style?.color || Colors.foreground; 
    return (
        <IconComponent size={resolvedSize} color={resolvedColor} style={style} /> 
    );
};

export const formatDuration = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

export const formatMinToHourMin = (min: number, secondsRemain: number = 0): string => {
    const totalMinutes = min;
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const s = secondsRemain;
    let parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    if (s > 0) {
        if (h === 0 && m === 0) return `${s}s`;
        parts.push(`${s}s`);
    }
    if (parts.length === 0) return '0s';
    return parts.join(' ');
};

export const _placeholder = true;