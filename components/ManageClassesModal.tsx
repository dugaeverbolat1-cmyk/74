
import React, { useState } from 'react';
import { Class } from '../types';
import { useLocale } from '../i18n';

interface ManageClassesModalProps {
  classes: Class[];
  onClose: () => void;
  onAddClass: (name: string) => void;
  onEditClass: (classId: number, newName: string) => void;
  onDeleteClass: (classId: number) => void;
}

const ManageClassesModal: React.FC<ManageClassesModalProps> = ({ classes, onClose, onAddClass, onEditClass, onDeleteClass }) => {
  const { t } = useLocale();
  const [editingClassId, setEditingClassId] = useState<number | null>(null);
  const [editingClassName, setEditingClassName] = useState<string>('');
  const [newClassName, setNewClassName] = useState('');

  const handleEditClick = (cls: Class) => {
    setEditingClassId(cls.id);
    setEditingClassName(cls.name);
  };

  const handleCancelClick = () => {
    setEditingClassId(null);
    setEditingClassName('');
  };

  const handleSaveClick = () => {
    if (editingClassId && editingClassName.trim()) {
      onEditClass(editingClassId, editingClassName.trim());
    }
    setEditingClassId(null);
    setEditingClassName('');
  };

  const handleAddClassSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newClassName.trim()) {
      onAddClass(newClassName.trim());
      setNewClassName('');
    }
  };

  const handleDeleteClick = (classId: number, className: string) => {
    if (window.confirm(t('deleteClassConfirmation', { className }))) {
        onDeleteClass(classId);
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('manageClasses')}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <form onSubmit={handleAddClassSubmit} className="flex items-center gap-3">
                <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder={t('newClassNamePlaceholder')}
                    className="flex-grow bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                />
                <button
                    type="submit"
                    disabled={!newClassName.trim()}
                    className="px-4 py-2.5 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('add')}
                </button>
            </form>
        </div>
        
        <div className="p-6 overflow-y-auto">
            {classes.length > 0 ? (
                <ul className="space-y-3">
                    {classes.map(cls => (
                        <li key={cls.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                           {editingClassId === cls.id ? (
                                <>
                                    <input
                                        type="text"
                                        value={editingClassName}
                                        onChange={(e) => setEditingClassName(e.target.value)}
                                        className="flex-grow bg-white dark:bg-gray-600 border border-gray-300 dark:border-gray-500 rounded-md p-1.5 text-sm focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400"
                                        autoFocus
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveClick() }}
                                    />
                                    <div className="flex items-center ml-2 flex-shrink-0">
                                       <button onClick={handleSaveClick} className="text-green-500 hover:text-green-700 p-1 rounded-full hover:bg-green-100 dark:hover:bg-green-900/50 transition-colors">
                                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                                       </button>
                                       <button onClick={handleCancelClick} className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600/50 transition-colors">
                                         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                       </button>
                                    </div>
                                </>
                           ) : (
                               <>
                                   <span className="text-gray-800 dark:text-gray-200">{cls.name}</span>
                                   <div className="flex items-center flex-shrink-0">
                                       <button onClick={() => handleEditClick(cls)} className="text-sky-500 hover:text-sky-700 p-1 rounded-full hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors">
                                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg>
                                       </button>
                                       <button onClick={() => handleDeleteClick(cls.id, cls.name)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 p-1 rounded-full hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors">
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
                <p className="text-center text-gray-500 dark:text-gray-400">{t('noClassesInGrade')}</p>
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

export default React.memo(ManageClassesModal);
