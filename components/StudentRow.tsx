
import React from 'react';
import { Student, AttendanceStatus, AttendanceDetail, StatusOption } from '../types';
import { useLocale } from '../i18n';

interface StudentRowProps {
  student: Student;
  index: number;
  attendanceDetail?: AttendanceDetail;
  onStatusChange: (studentId: number, status: AttendanceStatus) => void;
  availableStatuses: StatusOption[];
  onAddNewStatusRequest: () => void;
  onHistoryClick: (student: Student) => void;
  isSelected: boolean;
  onToggleSelect: (studentId: number) => void;
  disabled?: boolean;
}

const StudentRow: React.FC<StudentRowProps> = ({ 
  index, 
  student, 
  attendanceDetail, 
  onStatusChange, 
  availableStatuses, 
  onAddNewStatusRequest, 
  onHistoryClick, 
  isSelected, 
  onToggleSelect,
  disabled = false
}) => {
  const { t, statusKeys } = useLocale();
  // Default to PRESENT if no status is recorded
  const status = attendanceDetail?.status || statusKeys.PRESENT;

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'ADD_NEW_STATUS') {
        onAddNewStatusRequest();
        return;
    }
    const newStatus = value as AttendanceStatus;
    onStatusChange(student.id, newStatus);
  };

  const getStatusColorClass = (s: string | undefined) => {
    switch(s) {
        case statusKeys.PRESENT: 
            return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700';
        case statusKeys.LATE:
            return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-700';
        case statusKeys.ABSENT_ILLNESS:
        case statusKeys.ABSENT_VALID:
        case statusKeys.ABSENT_UNEXCUSED:
            return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-700';
        case statusKeys.ABSENT_ORDER:
             return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700';
        case statusKeys.ABSENT_PARENTAL:
             return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-700';
        case statusKeys.ABSENT_COMPETITION:
             return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700';
        default:
            if (!s) return 'bg-white text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600';
            // Custom statuses
            return 'bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700';
    }
  };

  // Add distinct row styling (border and subtle background) based on status
  const getRowStyle = (s: string | undefined) => {
    switch(s) {
        case statusKeys.PRESENT: 
            return 'border-l-4 border-green-400 hover:bg-green-50 dark:hover:bg-green-900/10';
        case statusKeys.LATE:
            return 'border-l-4 border-yellow-400 bg-yellow-50/50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20';
        case statusKeys.ABSENT_ILLNESS:
        case statusKeys.ABSENT_VALID:
        case statusKeys.ABSENT_UNEXCUSED:
            return 'border-l-4 border-red-500 bg-red-50/50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20';
        case statusKeys.ABSENT_ORDER:
             return 'border-l-4 border-blue-500 bg-blue-50/50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20';
        case statusKeys.ABSENT_PARENTAL:
             return 'border-l-4 border-purple-500 bg-purple-50/50 dark:bg-purple-900/10 hover:bg-purple-100 dark:hover:bg-purple-900/20';
        case statusKeys.ABSENT_COMPETITION:
             return 'border-l-4 border-indigo-500 bg-indigo-50/50 dark:bg-indigo-900/10 hover:bg-indigo-100 dark:hover:bg-indigo-900/20';
        default:
            if (!s) return 'border-l-4 border-transparent hover:bg-gray-50 dark:hover:bg-gray-700/50';
            // Custom statuses
            return 'border-l-4 border-sky-500 bg-sky-50/50 dark:bg-sky-900/10 hover:bg-sky-100 dark:hover:bg-sky-900/20';
    }
  };

  const currentColorClass = getStatusColorClass(status);
  const rowStyle = getRowStyle(status);

  return (
    <div className={`px-6 py-4 flex items-center justify-between transition-colors group ${rowStyle} ${isSelected ? 'bg-sky-50 dark:bg-sky-900/20' : ''}`}>
        <div className="flex items-center gap-3 flex-grow">
             <div className="flex items-center justify-center mr-2">
                <input 
                    type="checkbox" 
                    checked={isSelected}
                    onChange={() => onToggleSelect(student.id)}
                    className="w-5 h-5 rounded text-sky-600 focus:ring-sky-500 border-gray-300 dark:border-gray-500 dark:bg-gray-700 cursor-pointer"
                />
             </div>
             <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white dark:bg-gray-700 shadow-sm flex items-center justify-center border border-gray-100 dark:border-gray-600">
                 <span className="font-semibold text-xs text-gray-600 dark:text-gray-300">{index}</span>
             </div>
             <div className="flex flex-col">
                 <button 
                    onClick={() => onHistoryClick(student)}
                    className="font-medium text-gray-900 dark:text-white flex items-center gap-2 hover:text-sky-600 dark:hover:text-sky-400 transition-colors text-left group-hover:underline decoration-dotted decoration-gray-400 underline-offset-4"
                 >
                     {student.name}
                     <span 
                        className="ml-1 p-1 text-gray-400 hover:text-sky-500 bg-transparent hover:bg-sky-50 dark:text-gray-500 dark:hover:text-sky-400 dark:hover:bg-sky-900/30 rounded-full transition-all opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100"
                        title={t('history')}
                     >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                     </span>
                 </button>
             </div>
        </div>
        
        <div>
            <select
                value={status}
                onChange={handleSelectChange}
                disabled={disabled}
                className={`block w-48 pl-3 pr-8 py-2 text-base border-2 focus:outline-none focus:ring-2 focus:ring-opacity-50 sm:text-sm rounded-md transition-colors ${currentColorClass} focus:ring-yellow-400 ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            >
                 {availableStatuses.map((option) => (
                    <option key={option.value} value={option.value} className="bg-white text-gray-900 dark:bg-gray-700 dark:text-white">
                        {option.label}
                    </option>
                ))}
                <option value="ADD_NEW_STATUS" className="font-semibold text-sky-600 bg-sky-50 dark:bg-gray-800 dark:text-sky-400">
                    {t('addNewStatusOption')}
                </option>
            </select>
        </div>
    </div>
  );
};

export default React.memo(StudentRow);
