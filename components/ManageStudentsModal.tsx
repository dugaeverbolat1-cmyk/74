
import React, { useState } from 'react';
import { Student, Gender } from '../types';
import { useLocale } from '../i18n';

interface ManageStudentsModalProps {
  students: Student[];
  onClose: () => void;
  onRemoveStudent: (studentId: number) => void;
  onEditStudent: (studentId: number, newName: string, newGender: Gender) => void;
}

const ManageStudentsModal: React.FC<ManageStudentsModalProps> = ({ students, onClose, onRemoveStudent, onEditStudent }) => {
  const { t } = useLocale();
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const handleEditClick = (student: Student) => {
    setEditingStudent({ ...student });
  };

  const handleCancelClick = () => {
    setEditingStudent(null);
  };

  const handleSaveClick = () => {
    if (editingStudent && editingStudent.name.trim()) {
      onEditStudent(editingStudent.id, editingStudent.name.trim(), editingStudent.gender);
    }
    setEditingStudent(null);
  };

  const handleEditingFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editingStudent) return;
    const { name, value } = e.target;
    setEditingStudent(prev => prev ? { ...prev, [name]: value as Gender } : null);
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('manageClass')}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6">
            {students.length > 0 ? (
                <ul className="space-y-3">
                    {students.map(student => (
                        <li key={student.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                           {editingStudent?.id === student.id ? (
                                <div className="flex-grow flex items-center gap-2">
                                    <input
                                        type="text"
                                        name="name"
                                        value={editingStudent.name}
                                        onChange={handleEditingFormChange}
                                        className="flex-grow bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md p-1.5 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveClick() }}
                                    />
                                    <div className="flex items-center text-sm gap-2 text-gray-600 dark:text-gray-300">
                                      <label className="flex items-center cursor-pointer">
                                        <input type="radio" name="gender" value="male" checked={editingStudent.gender === 'male'} onChange={handleEditingFormChange} className="form-radio text-sky-500 focus:ring-sky-500" />
                                        <span className="ml-1">{t('genderMaleShort')}</span>
                                      </label>
                                       <label className="flex items-center cursor-pointer">
                                        <input type="radio" name="gender" value="female" checked={editingStudent.gender === 'female'} onChange={handleEditingFormChange} className="form-radio text-pink-500 focus:ring-pink-500"/>
                                        <span className="ml-1">{t('genderFemaleShort')}</span>
                                      </label>
                                    </div>
                                    <div className="flex items-center ml-2 flex-shrink-0">
                                       <button onClick={handleSaveClick} className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                       </button>
                                       <button onClick={handleCancelClick} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-colors">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                       </button>
                                    </div>
                                </div>
                           ) : (
                                <>
                                    <div className="flex items-center gap-2 truncate">
                                      <span className="text-gray-800 dark:text-gray-200 truncate">{student.name}</span>
                                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                                          student.gender === 'male'
                                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                            : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                      }`}>
                                          {student.gender === 'male' ? '♂ ' + t('genderMaleShort') : '♀ ' + t('genderFemaleShort')}
                                      </span>
                                    </div>
                                    <div className="flex items-center flex-shrink-0">
                                        <button onClick={() => handleEditClick(student)} className="text-sky-500 hover:text-sky-700 p-1 rounded-full hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                        </button>
                                        <button onClick={() => onRemoveStudent(student.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                            </svg>
                                        </button>
                                    </div>
                                </>
                           )}
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-center text-gray-500 dark:text-gray-400">{t('noStudentsInClass')}</p>
            )}
        </div>
        
        <div className="p-6 mt-auto border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button 
                onClick={onClose} 
                className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800"
            >
                {t('done')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ManageStudentsModal);
