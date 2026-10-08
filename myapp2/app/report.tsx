import React, { useMemo, useState } from 'react'; 
import { Dimensions, Text, TextInput, TouchableOpacity, View, ScrollView } from 'react-native'; 
import { LineChart } from "react-native-chart-kit";
import { Colors, Icon, ReportData, Session, SubjectBreakdown, formatMinToHourMin, styles } from './definition';

const screenWidth = Dimensions.get("window").width;
const chartWidth = screenWidth > 448 ? 448 - 32 : screenWidth - 32;

const dateToComparableNumber = (dateStr: string): number => {
  const parts = dateStr.split('/').map(Number);
  if (parts.length === 3) return parts[0] * 10000 + parts[1] * 100 + parts[2]; 
  return parts[0] * 100 + parts[1]; 
};

interface StudyReportProps {
  sessions: Session[];
}

const StudyReport: React.FC<StudyReportProps> = ({ sessions }) => {
  const [reportType, setReportType] = useState<'week' | 'month'>('week');

  const { totalDuration, totalPages, avgDaily, processedSubjectData, weeklyReportData, maxDuration, maxPages } = useMemo(() => {
    const totalDuration = sessions.reduce((sum, item) => sum + item.durationMin, 0);
    const totalPages = sessions.reduce((sum, item) => sum + item.pages, 0);

    const subjectMap: Record<string, number> = {};
    sessions.forEach(s => {
      subjectMap[s.subject] = (subjectMap[s.subject] || 0) + s.durationMin;
    });

    const subjectBreakdown: SubjectBreakdown[] = Object.keys(subjectMap).map(subject => {
      const duration = subjectMap[subject];
      const percentage = totalDuration > 0 ? Math.round((duration / totalDuration) * 100) : 0;
      return { subject, duration, percentage };
    });
    const processedSubjectData = subjectBreakdown.sort((a, b) => b.duration - a.duration);

    const dailyMap: Record<string, { duration: number; pages: number }> = {};
    sessions.forEach(s => {
      if (!dailyMap[s.date]) {
        dailyMap[s.date] = { duration: 0, pages: 0 };
      }
      dailyMap[s.date].duration += s.durationMin;
      dailyMap[s.date].pages += s.pages;
    });

    const dailyList: ReportData[] = Object.keys(dailyMap).map(date => ({
      date,
      duration: dailyMap[date].duration,
      pages: dailyMap[date].pages
    }));

    const sortedDailyList = dailyList.sort((a, b) => dateToComparableNumber(a.date) - dateToComparableNumber(b.date));
    const weeklyReportData = sortedDailyList.slice(-7); 

    const dayCount = weeklyReportData.length || 1;
    const avgDaily = Math.round((weeklyReportData.reduce((sum, item) => sum + item.duration, 0) / dayCount) * 10) / 10;

    const maxDuration = Math.max(...weeklyReportData.map(d => d.duration / 60), 1);
    const maxPages = Math.max(...weeklyReportData.map(d => d.pages), 1);

    return { totalDuration, totalPages, avgDaily, processedSubjectData, weeklyReportData, maxDuration, maxPages };
  }, [sessions]);

  const chartLabels = useMemo(() => {
    if (weeklyReportData.length === 0) return ["データ無"];
    return weeklyReportData.map(d => {
      const parts = d.date.split('/');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d.date; 
    });
  }, [weeklyReportData]);

  const durationDataPoints = useMemo(() => {
    if (weeklyReportData.length === 0) return [0];
    return weeklyReportData.map(d => Math.round((d.duration / 60) * 10) / 10);
  }, [weeklyReportData]);

  const pagesDataPoints = useMemo(() => {
    if (weeklyReportData.length === 0) return [0];
    return weeklyReportData.map(d => d.pages);
  }, [weeklyReportData]);

  const chartConfig = {
    backgroundGradientFrom: Colors.card,
    backgroundGradientTo: Colors.card,
    decimalPlaces: 1, 
    color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`, 
    labelColor: (opacity = 1) => `rgba(113, 113, 122, ${opacity})`, 
    style: { borderRadius: 16 },
    propsForDots: { r: "4", strokeWidth: "2", stroke: Colors.primary },
    propsForBackgroundLines: { strokeDasharray: "4", stroke: "#e4e4e7" }
  };

  const ChartComponent = ({ dataKey }: { dataKey: 'duration' | 'pages', maxValue: number, unit: string }) => {
    const dataPoints = dataKey === 'duration' ? durationDataPoints : pagesDataPoints;
    return (
      <View style={{ alignItems: 'center', marginLeft: -10 }}>
        <LineChart
          data={{ labels: chartLabels, datasets: [{ data: dataPoints }] }}
          width={chartWidth}
          height={180}
          chartConfig={chartConfig}
          bezier
          style={{ marginVertical: 8, borderRadius: 16 }}
          fromZero={true}
          segments={4}
        />
      </View>
    );
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 32 }}> 
      <View style={{ paddingHorizontal: 16, paddingTop: 16 }}>
        <View style={[styles.flexRow, { backgroundColor: '#e4e4e7', borderRadius: 12, padding: 4, marginBottom: 16 }]}>
          <TouchableOpacity onPress={() => setReportType('week')} style={[{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, reportType === 'week' && { backgroundColor: Colors.card }]}>
            <Text style={[{ fontSize: 11, fontWeight: '700', color: '#71717a' }, reportType === 'week' && { color: Colors.primary }]}>週間レポート</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setReportType('month')} style={[{ flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, reportType === 'month' && { backgroundColor: Colors.card }]}>
            <Text style={[{ fontSize: 11, fontWeight: '700', color: '#71717a' }, reportType === 'month' && { color: Colors.primary }]}>月間レポート</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.flexRow, { paddingHorizontal: 16, marginBottom: 16 }]}> 
        <View style={[styles.card, { flex: 1, padding: 12, marginRight: 8 }]}>
          <Text style={{ fontSize: 11, color: '#71717a' }}>総学習時間</Text>
          <Text style={[styles.text2xl, styles.textBold, { color: Colors.primary, marginTop: 4 }]}>{formatMinToHourMin(totalDuration)}</Text> 
        </View>
        <View style={[styles.card, { flex: 1, padding: 12, marginLeft: 8 }]}>
          <Text style={{ fontSize: 11, color: '#71717a' }}>総学習ページ</Text>
          <Text style={[styles.text2xl, styles.textBold, { color: '#10b981', marginTop: 4 }]}>{totalPages} p</Text> 
        </View>
      </View>

      <View style={[styles.card, { paddingHorizontal: 16, paddingVertical: 12, marginHorizontal: 16, marginBottom: 16, backgroundColor: Colors.primaryLight, borderColor: 'transparent' }]}>
        <Text style={{ fontSize: 12, color: Colors.primary, fontWeight: '600' }}>💡 1日あたりの平均学習時間: {avgDaily}時間</Text>
      </View>

      <View style={[styles.card, { padding: 16, marginHorizontal: 16, marginBottom: 16 }]}>
        <Text style={styles.textLg}>学習時間の推移</Text>
        <Text style={{ fontSize: 11, color: '#71717a', marginBottom: 12 }}>最近7日間の時間変化 (h)</Text>
        <ChartComponent dataKey="duration" maxValue={maxDuration} unit="時間" />
      </View>

      <View style={[styles.card, { padding: 16, marginHorizontal: 16, marginBottom: 16 }]}>
        <Text style={styles.textLg}>学習ページ数の推移</Text>
        <Text style={{ fontSize: 11, color: '#71717a', marginBottom: 12 }}>最近7日間の学習ページ数の変化</Text>
        <ChartComponent dataKey="pages" maxValue={maxPages} unit="ページ" />
      </View>

      <View style={[styles.card, { padding: 16, marginHorizontal: 16, marginBottom: 16 }]}>
        <Text style={styles.textLg}>科目別学習時間</Text>
        <Text style={{ fontSize: 11, color: '#71717a', marginBottom: 12 }}>時間の内訳と割合</Text>
        {processedSubjectData.map((item: SubjectBreakdown, index: number) => (
          <View key={index} style={{ marginBottom: 12 }}>
            <View style={[styles.flexRow, { justifyContent: 'space-between', marginBottom: 4 }]}>
              <View style={styles.flexRow}>
                <Text style={{ fontSize: 10, fontWeight: 'bold', backgroundColor: '#f4f4f5', color: '#18181b', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, marginRight: 6 }}>{item.subject}</Text>
                <Text style={{ fontSize: 11, color: '#71717a' }}>{formatMinToHourMin(item.duration)}</Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: Colors.primary }}>{item.percentage}%</Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#e4e4e7', borderRadius: 3, overflow: 'hidden' }}>
              <View style={{ height: '100%', backgroundColor: Colors.primary, width: `${item.percentage}%` }} />
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

export default StudyReport;