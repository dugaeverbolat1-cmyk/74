
import React from 'react';
import { User } from '../types';
import { useLocale } from '../i18n';

interface UserSwitcherProps {
  users: User[];
  currentUser: User;
  onUserChange: (userId: number) => void;
}

const UserSwitcher: React.FC<UserSwitcherProps> = ({ users, currentUser, onUserChange }) => {
  const { t } = useLocale();

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-green-100 dark:border-emerald-900/50 px-4 py-2 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider leading-none mb-0.5">{t('currentUser')}</span>
          <span className="text-sm font-bold text-gray-700 dark:text-gray-200 leading-none">{currentUser.name}</span>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 hidden sm:block">{t('switchUser')}:</label>
        <select
          value={currentUser.id}
          onChange={(e) => onUserChange(Number(e.target.value))}
          className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-200 text-xs rounded-lg px-2 py-1 focus:ring-2 focus:ring-emerald-500 transition outline-none"
        >
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name} ({user.role === 'admin' ? t('roleAdmin') : user.role === 'viewer' ? t('roleViewer') : t('roleTeacher')})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default UserSwitcher;
