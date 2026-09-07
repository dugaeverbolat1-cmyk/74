
import React, { useState } from 'react';
import { Gender } from '../types';
import { useLocale } from '../i18n';

interface AddStudentModalProps {
  onClose: () => void;
  onAddStudent: (name: string, gender: Gender) => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ onClose, onAddStudent }) => {
  const { t } = useLocale();
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('male');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onAddStudent(name.trim(), gender);
    }
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md"
        onClick={e => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit}>
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('addStudent')}</h3>
            </div>
            
            <div className="p-6 space-y-4">
                <div>
                    <label htmlFor="student-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('studentFullName')}
                    </label>
                    <input
                        type="text"
                        id="student-name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2.5 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition"
                        placeholder={t('studentNamePlaceholder')}
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('gender')}
                    </label>
                    <div className="flex flex-col gap-3">
                        <label className="flex items-center cursor-pointer text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors">
                            <input
                                type="radio"
                                name="gender"
                                value="male"
                                checked={gender === 'male'}
                                onChange={() => setGender('male')}
                                className="form-radio h-4 w-4 text-sky-600 focus:ring-sky-500"
                            />
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{t('genderMale')}</span>
                        </label>
                        <label className="flex items-center cursor-pointer text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded-md hover:bg-pink-50 dark:hover:bg-pink-900/20 transition-colors">
                            <input
                                type="radio"
                                name="gender"
                                value="female"
                                checked={gender === 'female'}
                                onChange={() => setGender('female')}
                                className="form-radio h-4 w-4 text-pink-600 focus:ring-pink-500"
                            />
                            <span className="ml-2 text-gray-700 dark:text-gray-300">{t('genderFemale')}</span>
                        </label>
                    </div>
                </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 dark:focus:ring-offset-gray-800"
                >
                    {t('cancel')}
                </button>
                <button
                    type="submit"
                    disabled={!name.trim()}
                    className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {t('add')}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default React.memo(AddStudentModal);
