
import React, { useState } from 'react';
import { useLocale } from '../i18n';

interface ManageStatusesModalProps {
  statuses: string[];
  onClose: () => void;
  onAdd: (name: string) => void;
  onDelete: (name: string) => void;
}

const ManageStatusesModal: React.FC<ManageStatusesModalProps> = ({ statuses, onClose, onAdd, onDelete }) => {
  const { t } = useLocale();
  const [newName, setNewName] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newName.trim()) {
      onAdd(newName.trim());
      setNewName('');
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 animate-fade-in"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[80vh] animate-fade-in-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('manageStatuses')}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <form onSubmit={handleAdd} className="flex gap-2">
                <input 
                    type="text" 
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    placeholder={t('statusNamePlaceholder')}
                    className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition"
                    autoFocus
                />
                <button 
                    type="submit" 
                    disabled={!newName.trim()} 
                    className="px-4 py-2 bg-sky-600 text-white rounded-lg text-sm font-bold hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-sm"
                >
                    {t('add')}
                </button>
            </form>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
            {statuses.length === 0 ? (
                <div className="text-center py-8">
                    <p className="text-gray-500 dark:text-gray-400 italic">{t('noCustomStatuses')}</p>
                </div>
            ) : (
                <ul className="space-y-2">
                    {statuses.map(status => (
                        <li key={status} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-600 group hover:border-gray-300 dark:hover:border-gray-500 transition">
                            <span className="text-gray-800 dark:text-gray-200 font-medium">{status}</span>
                            <button 
                                onClick={() => { if(confirm(t('deleteStatusConfirm', {status}))) onDelete(status) }} 
                                className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                title={t('deleteClassConfirmation', {className: status})}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </div>
        
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
            <button 
                onClick={onClose} 
                className="px-5 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition"
            >
                {t('done')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ManageStatusesModal);
