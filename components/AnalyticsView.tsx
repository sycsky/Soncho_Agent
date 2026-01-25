import React, { useEffect, useState } from 'react';
import { Settings, Bot, Users, Activity, MessageSquare, Lock } from 'lucide-react';
import { analyticsApi, AnalyticsSummary, AnalyticsTrendItem } from '../services/analyticsApi';
import { Subscription } from '../services/billingApi';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useTranslation } from 'react-i18next';

interface AnalyticsViewProps {
  subscription: Subscription | null;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ subscription }) => {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [trend, setTrend] = useState<AnalyticsTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7'); // '7' or '30'

  const canAccessHistory = subscription?.supportAnalyticsHistory ?? false;

  useEffect(() => {
    fetchData();
  }, [dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - parseInt(dateRange));
      
      const startIso = start.toISOString();
      const endIso = end.toISOString();

      const [summaryData, trendData] = await Promise.all([
        analyticsApi.getSummary(startIso, endIso),
        analyticsApi.getTrend(startIso, endIso)
      ]);

      setSummary(summaryData);
      setTrend(trendData);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#8dd1e1', '#a4de6c', '#d0ed57'];
  const statusData = summary ? Object.entries(summary.sessionStatusDistribution || {}).map(([name, value]) => ({ name, value })) : [];
  const tagsData = summary ? Object.entries(summary.topTags || {}).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 10) : [];

  if (loading && !summary) {
    return <div className="p-8 text-center">{t('analytics.loading')}</div>;
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
  
    if (percent <= 0.05) return null; // Don't show label for small slices

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="p-8 w-full max-w-7xl mx-auto animate-in fade-in duration-300">
        <style>{`
            .recharts-wrapper, .recharts-surface, .recharts-layer { outline: none !important; }
            *:focus { outline: none !important; }
            .recharts-cartesian-axis-tick text { font-size: 11px; fill: #6b7280; }
        `}</style>
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-800">{t('analytics.dashboard_title')}</h2>
            <div className="flex gap-2 bg-white p-1 rounded-lg border border-gray-200">
                <button 
                    onClick={() => setDateRange('7')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${dateRange === '7' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'}`}
                >
                    {t('analytics.last_7_days')}
                </button>
                <button 
                    onClick={() => canAccessHistory && setDateRange('30')}
                    disabled={!canAccessHistory}
                    title={!canAccessHistory ? t('analytics.upgrade_for_history') : ''}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors flex items-center gap-1 ${dateRange === '30' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-50'} ${!canAccessHistory ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    {t('analytics.last_30_days')}
                    {!canAccessHistory && <Lock size={12} />}
                </button>
            </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-50 rounded-lg text-blue-600"><MessageSquare size={24} /></div>
                    <div className="flex-1 flex flex-row items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-500">{t('analytics.total_conversations')}</p>
                        <p className="text-2xl font-bold text-gray-900">{summary?.totalConversations || 0}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-purple-50 rounded-lg text-purple-600"><Bot size={24} /></div>
                    <div className="flex-1 flex flex-row items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-500">{t('analytics.ai_messages')}</p>
                        <p className="text-2xl font-bold text-gray-900">{summary?.aiMessages || 0}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-50 rounded-lg text-green-600"><Users size={24} /></div>
                    <div className="flex-1 flex flex-row items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-500">{t('analytics.human_messages')}</p>
                        <p className="text-2xl font-bold text-gray-900">{summary?.humanMessages || 0}</p>
                    </div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-orange-50 rounded-lg text-orange-600"><Activity size={24} /></div>
                    <div className="flex-1 flex flex-row items-center justify-between gap-2">
                        <p className="text-sm font-medium text-gray-500">{t('analytics.order_lookups')}</p>
                        <p className="text-2xl font-bold text-gray-900">{summary?.orderActions?.lookup || 0}</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200 h-[400px]">
                <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                    <Activity size={18} className="text-blue-500"/>
                    {t('analytics.conversation_trend')}
                </h3>
                <ResponsiveContainer width="100%" height="300">
                    <LineChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                            dataKey="date" 
                            tick={{fontSize: 10, fill: '#9ca3af'}} 
                            tickLine={false}
                            axisLine={{stroke: '#e5e7eb'}}
                            minTickGap={50}
                            tickFormatter={(value) => {
                                const d = new Date(value);
                                return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
                            }}
                        />
                        <YAxis 
                            tick={{fontSize: 11, fill: '#9ca3af'}} 
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <Legend wrapperStyle={{paddingTop: '20px'}}/>
                        <Line type="monotone" dataKey="conversations" name={t('analytics.total_conversations')} stroke="#3b82f6" strokeWidth={3} dot={false} activeDot={{r: 6, strokeWidth: 0}} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200 h-[400px]">
                <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                    <MessageSquare size={18} className="text-purple-500"/>
                    {t('analytics.ai_vs_human_volume')}
                </h3>
                <ResponsiveContainer width="100%" height="300">
                    <BarChart data={trend} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                        <XAxis 
                            dataKey="date" 
                            tick={{fontSize: 10, fill: '#9ca3af'}} 
                            tickLine={false}
                            axisLine={{stroke: '#e5e7eb'}}
                            minTickGap={50}
                            tickFormatter={(value) => {
                                const d = new Date(value);
                                return `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`;
                            }}
                        />
                        <YAxis 
                            tick={{fontSize: 11, fill: '#9ca3af'}} 
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip 
                            contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                            labelFormatter={(value) => new Date(value).toLocaleDateString()}
                        />
                        <Legend wrapperStyle={{paddingTop: '20px'}}/>
                        <Bar dataKey="aiMessages" name={t('analytics.ai_messages')} fill="#8b5cf6" radius={[4, 4, 0, 0]} stackId="a" />
                        <Bar dataKey="humanMessages" name={t('analytics.human_messages')} fill="#10b981" radius={[4, 4, 0, 0]} stackId="a" />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Advanced Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
            {/* Session Status Distribution */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200 h-[400px]">
                <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                     <Activity size={18} className="text-indigo-500"/>
                    {t('analytics.session_status')}
                </h3>
                <ResponsiveContainer width="100%" height="300">
                    <PieChart>
                        <Pie
                            data={statusData}
                            cx="40%"
                            cy="50%"
                            labelLine={false}
                            label={renderCustomizedLabel}
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                        >
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={2} />
                            ))}
                        </Pie>
                        <Tooltip 
                             contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                        />
                        <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{right: 0}}/>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Top Tags */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100 hover:shadow-lg transition-shadow duration-200 h-[400px]">
                <h3 className="text-lg font-bold mb-6 text-gray-800 flex items-center gap-2">
                    <Settings size={18} className="text-gray-500"/>
                    {t('analytics.top_tags')}
                </h3>
                <ResponsiveContainer width="100%" height="300">
                    <BarChart
                        layout="vertical"
                        data={tagsData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                        <XAxis type="number" tick={{fontSize: 11, fill: '#9ca3af'}} tickLine={false} axisLine={false} />
                        <YAxis 
                            dataKey="name" 
                            type="category" 
                            width={140} 
                            tick={{fontSize: 10, fill: '#4b5563', fontWeight: 500}} 
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip 
                            cursor={{fill: '#f9fafb'}}
                            contentStyle={{backgroundColor: '#fff', borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'}}
                        />
                        <Bar dataKey="value" fill="#82ca9d" radius={[0, 4, 4, 0]} barSize={20}>
                            {tagsData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    </div>
  );
};
