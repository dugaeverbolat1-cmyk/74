
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Class, Student, AttendanceRecord } from '../types';
import { useLocale } from '../i18n';

interface AIAssistantModalProps {
  onClose: () => void;
  selectedClass: Class;
  attendanceData: Record<number, { status: string }>;
  selectedDate: string;
}

const AIAssistantModal: React.FC<AIAssistantModalProps> = ({ onClose, selectedClass, attendanceData, selectedDate }) => {
  const { t, getStatusLabel } = useLocale();
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState<string>('');

  const generateAIInsights = async () => {
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Prepare data for AI
      const studentsList = selectedClass.students.map(s => {
          const status = attendanceData[s.id]?.status || 'PRESENT';
          return `${s.name}: ${getStatusLabel(status)}`;
      }).join('\n');

      const prompt = `
        ${t('aiPromptInstruction')}
        
        Class: ${selectedClass.name}
        Date: ${selectedDate}
        Attendance Data:
        ${studentsList}
        
        Please provide:
        1. A summary of attendance for this day.
        2. Identify any worrying patterns (if possible with just this day).
        3. A draft of a polite notification message for parents of absent students.
        
        Reply in ${t('locale') === 'kk' ? 'Kazakh' : 'Russian'} language.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
      });

      setInsights(response.text || '');
    } catch (error) {
      console.error('AI Error:', error);
      setInsights('Error generating insights. Please check API key.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateAIInsights();
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-fade-in-up flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center shadow-inner">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
             </div>
             <h3 className="text-xl font-bold">{t('aiInsightsTitle')}</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-2 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8 overflow-y-auto flex-grow bg-emerald-50/10 dark:bg-emerald-950/20">
            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-emerald-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                        </div>
                    </div>
                    <p className="mt-6 text-emerald-700 dark:text-emerald-400 font-bold animate-pulse">{t('aiThinking')}</p>
                </div>
            ) : (
                <div className="prose prose-emerald dark:prose-invert max-w-none">
                    <div className="whitespace-pre-wrap text-gray-800 dark:text-gray-200 leading-relaxed text-sm md:text-base bg-white dark:bg-gray-700 p-6 rounded-xl border border-emerald-100 dark:border-emerald-800 shadow-sm">
                        {insights}
                    </div>
                </div>
            )}
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-emerald-100 dark:border-emerald-900 flex justify-between items-center px-8">
            <p className="text-[10px] text-gray-400 font-medium italic">Powered by Gemini 3 Flash AI</p>
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-md transition-all active:scale-95"
            >
                {t('done')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default AIAssistantModal;
