
import React, { useMemo } from 'react';
import { Student, AttendanceRecord } from '../types';
import { useLocale } from '../i18n';

interface StudentHistoryModalProps {
  student: Student;
  attendance: Record<string, AttendanceRecord>;
  onClose: () => void;
}

const StudentHistoryModal: React.FC<StudentHistoryModalProps> = ({ student, attendance, onClose }) => {
  const { t, statusKeys, getStatusLabel } = useLocale();

  const history = useMemo(() => {
    // Get all dates where attendance was recorded, sort descending (newest first)
    const dates = Object.keys(attendance).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    
    return dates.map(date => {
        const dayRecord = attendance[date];
        // If day record exists, check student status. Default to PRESENT if missing in the day record but the day exists.
        const status = dayRecord[student.id]?.status || statusKeys.PRESENT;
        return { date, status };
    });
  }, [attendance, student.id, statusKeys]);

  const stats = useMemo(() => {
      const counts: Record<string, number> = {};
      let total = 0;
      history.forEach(h => {
          counts[h.status] = (counts[h.status] || 0) + 1;
          total++;
      });
      return { counts, total };
  }, [history]);

  const getStatusColorClass = (s: string) => {
    switch(s) {
        case statusKeys.PRESENT: 
            return 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800';
        case statusKeys.LATE:
            return 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800';
        case statusKeys.ABSENT_ILLNESS:
        case statusKeys.ABSENT_VALID:
        case statusKeys.ABSENT_UNEXCUSED:
            return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800';
        case statusKeys.ABSENT_ORDER:
             return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800';
        case statusKeys.ABSENT_PARENTAL:
             return 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800';
        case statusKeys.ABSENT_COMPETITION:
             return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800';
        default:
            return 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800';
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-t-2xl">
             <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="p-2 bg-sky-100 dark:bg-sky-900/50 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-sky-600 dark:text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <span className="block text-sm font-normal text-gray-500 dark:text-gray-400">{t('history')}</span>
                    {student.name}
                </div>
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-full p-2 hover:bg-gray-200 dark:hover:bg-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
        </div>

        <div className="p-6 overflow-y-auto">
            {/* Stats Summary */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                 <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-600 shadow-sm">
                    <span className="text-xs uppercase text-gray-500 dark:text-gray-400 font-bold tracking-wider">{t('totalRecords')}</span>
                    <span className="text-2xl font-black text-gray-800 dark:text-gray-100">{stats.total}</span>
                 </div>
                 {/* Absence Count */}
                 <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-xl flex items-center justify-between border border-red-100 dark:border-red-800/50 shadow-sm">
                    <span className="text-xs uppercase text-red-600 dark:text-red-500 font-bold tracking-wider">{t('absentAll')}</span>
                    <span className="text-2xl font-black text-red-700 dark:text-red-400">
                        {stats.total - (stats.counts[statusKeys.PRESENT] || 0) - (stats.counts[statusKeys.LATE] || 0)}
                    </span>
                 </div>
            </div>
            
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4 border-b border-gray-100 dark:border-gray-700 pb-2">{t('detailedReportSheet')}</h4>

            {/* History List */}
             {history.length > 0 ? (
                <div className="space-y-3">
                    {history.map((record, idx) => (
                        <div key={idx} className="flex justify-between items-center group">
                            <div className="flex items-center gap-4">
                                <div className="flex flex-col items-center">
                                    <div className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 mb-1"></div>
                                    {idx !== history.length - 1 && <div className="w-0.5 h-full bg-gray-100 dark:bg-gray-700"></div>}
                                </div>
                                <span className="text-gray-900 dark:text-gray-100 font-mono text-sm">{record.date}</span>
                            </div>
                            <span className={`px-3 py-1 text-xs font-bold rounded-lg shadow-sm border ${getStatusColorClass(record.status)}`}>
                                {getStatusLabel(record.status)}
                            </span>
                        </div>
                    ))}
                </div>
             ) : (
                 <div className="text-center py-12 bg-gray-50 dark:bg-gray-700/30 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">{t('noAttendanceRecords')}</p>
                 </div>
             )}
        </div>
        
        <div className="p-6 mt-auto border-t border-gray-200 dark:border-gray-700 flex justify-end bg-gray-50 dark:bg-gray-900/50 rounded-b-2xl">
             <button onClick={onClose} className="px-6 py-2 text-sm font-bold text-white bg-sky-600 rounded-lg hover:bg-sky-700 shadow-md transition-all hover:shadow-lg focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800">
                {t('close')}
             </button>
        </div>
      </div>
    </div>
  );
};
export default React.memo(StudentHistoryModal);
