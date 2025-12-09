import React from 'react';
import { Settings, Bot, Users, BarChart } from 'lucide-react';

export const AnalyticsView: React.FC = () => {
  return (
    <div className="p-8 w-full animate-in fade-in duration-300">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Analytics Dashboard</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-blue-100 rounded-lg text-blue-600"><Settings size={24} /></div>
                    <div><p className="text-sm text-gray-500">Avg Response Time</p><p className="text-2xl font-bold text-gray-900">1.2m</p></div>
                </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-purple-100 rounded-lg text-purple-600"><Bot size={24} /></div>
                    <div><p className="text-sm text-gray-500">AI Resolution Rate</p><p className="text-2xl font-bold text-gray-900">68%</p></div>
                </div>
            </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <div className="flex items-center gap-4 mb-2">
                    <div className="p-3 bg-green-100 rounded-lg text-green-600"><Users size={24} /></div>
                    <div><p className="text-sm text-gray-500">Total Satisfaction</p><p className="text-2xl font-bold text-gray-900">4.8/5</p></div>
                </div>
            </div>
        </div>
        <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center text-gray-400">
            <BarChart size={48} className="mx-auto mb-4 opacity-50" />
            <p>Detailed visualization charts would use 'recharts' or 'd3' here.</p>
        </div>
    </div>
  );
};