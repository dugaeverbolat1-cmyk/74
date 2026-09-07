
import React, { useState } from 'react';
import { useLocale } from '../i18n';
import { Class, Student } from '../types';

interface BilimClassSyncModalProps {
  onClose: () => void;
  selectedClass: Class | null;
  attendanceData: any;
  onSyncComplete: () => void;
  onImportStudents: (students: Student[]) => void;
}

const BilimClassSyncModal: React.FC<BilimClassSyncModalProps> = ({ onClose, selectedClass, attendanceData, onSyncComplete, onImportStudents }) => {
  const { t } = useLocale();
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (login && password) {
      // Mock connection
      setIsSyncing(true);
      setTimeout(() => {
        setIsConnected(true);
        setIsSyncing(false);
      }, 1500);
    }
  };

  const handleSync = () => {
    if (!selectedClass) return;
    setIsSyncing(true);
    // Simulated API call to BilimClass.kz
    setTimeout(() => {
      setIsSyncing(false);
      onSyncComplete();
      onClose();
    }, 2500);
  };

  const handleImport = () => {
    setIsSyncing(true);
    // Simulated student import from BilimClass.kz
    setTimeout(() => {
      const mockStudents: Student[] = [
        { id: Date.now() + 1, name: 'Алибек Сапаров', gender: 'male' },
        { id: Date.now() + 2, name: 'Айгерим Муратова', gender: 'female' },
        { id: Date.now() + 3, name: 'Данияр Ибраев', gender: 'male' },
        { id: Date.now() + 4, name: 'Мадина Оспанова', gender: 'female' },
        { id: Date.now() + 5, name: 'Ерлан Каримов', gender: 'male' },
      ];
      onImportStudents(mockStudents);
      setIsSyncing(false);
      alert(t('bilimClassSyncSuccess'));
    }, 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 bg-gradient-to-r from-sky-600 to-blue-700 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                <span className="text-blue-700 font-black text-xl">B</span>
             </div>
             <h3 className="text-xl font-bold">BilimClass.kz</h3>
          </div>
          <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="p-8">
          {!isConnected ? (
            <form onSubmit={handleConnect} className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {t('bilimClassConnect')}
              </p>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('bilimClassLogin')}</label>
                <input 
                  type="text" 
                  value={login} 
                  onChange={e => setLogin(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="teacher_id"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">{t('bilimClassPassword')}</label>
                <input 
                  type="password" 
                  value={password} 
                  onChange={e => setPassword(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500"
                  placeholder="••••••••"
                />
              </div>
              <button 
                type="submit" 
                disabled={isSyncing || !login || !password}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSyncing ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : t('login')}
              </button>
            </form>
          ) : (
            <div className="space-y-6 text-center">
               <div className="flex flex-col items-center">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-full flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white">{t('bilimClassStatusConnected')}</h4>
                  <p className="text-sm text-gray-500">{selectedClass?.name} {t('class')}</p>
               </div>

               <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={handleImport}
                    disabled={isSyncing}
                    className="p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 transition-all group"
                  >
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 text-blue-600 mx-auto mb-2 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('bilimClassImportStudents')}</span>
                  </button>

                  <button 
                    onClick={handleSync}
                    disabled={isSyncing || !selectedClass}
                    className="p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-xl border border-gray-200 dark:border-gray-600 transition-all group"
                  >
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 text-green-600 mx-auto mb-2 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" /></svg>
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{t('bilimClassSyncNow')}</span>
                  </button>
               </div>

               {isSyncing && (
                 <div className="flex items-center justify-center gap-3 text-blue-600 font-bold animate-pulse">
                    <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>{t('aiThinking')}</span>
                 </div>
               )}
            </div>
          )}
        </div>
        
        <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-100 dark:border-gray-700 flex justify-center">
            <p className="text-[10px] text-gray-400 font-medium">iBaqyla x BilimClass Integration v1.0</p>
        </div>
      </div>
    </div>
  );
};

export default BilimClassSyncModal;
