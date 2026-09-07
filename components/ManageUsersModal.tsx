
import React, { useState } from 'react';
import { User, UserRole, Grade } from '../types';
import { useLocale } from '../i18n';

interface ManageUsersModalProps {
  users: User[];
  grades: Grade[];
  onClose: () => void;
  onAddUser: (user: Omit<User, 'id'>) => void;
  onEditUser: (user: User) => void;
  onDeleteUser: (userId: number) => void;
}

const ManageUsersModal: React.FC<ManageUsersModalProps> = ({ users, grades, onClose, onAddUser, onEditUser, onDeleteUser }) => {
  const { t } = useLocale();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newUser, setNewUser] = useState<{ name: string; role: UserRole; password: string }>({ name: '', role: 'teacher', password: '1234' });

  const handleEditClick = (user: User) => {
    setEditingUser({ ...user, password: user.password || '1234' });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
  };

  const handleSaveEdit = () => {
    if (editingUser) {
      onEditUser(editingUser);
    }
    setEditingUser(null);
  };
  
  const handleAddUser = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newUser.name.trim()) return;
      onAddUser({ ...newUser, classIds: [] });
      setNewUser({ name: '', role: 'teacher', password: '1234' });
  }

  const handleClassAssignmentChange = (classId: number, checked: boolean) => {
    if (!editingUser) return;
    const currentClassIds = new Set(editingUser.classIds);
    if (checked) {
      currentClassIds.add(classId);
    } else {
      currentClassIds.delete(classId);
    }
    setEditingUser({ ...editingUser, classIds: Array.from(currentClassIds) });
  };

  const renderUserList = () => (
    <div className="p-6">
        <form onSubmit={handleAddUser} className="flex flex-col gap-3 mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
            <div className="flex gap-3">
                <input type="text" value={newUser.name} onChange={e => setNewUser(p => ({...p, name: e.target.value}))} placeholder={t('newUserFullName')} className="flex-grow bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg text-sm p-2" />
                <select value={newUser.role} onChange={e => setNewUser(p => ({...p, role: e.target.value as UserRole}))} className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg text-sm p-2">
                    <option value="teacher">{t('roleTeacher')}</option>
                    <option value="admin">{t('roleAdmin')}</option>
                    <option value="viewer">{t('roleViewer')}</option>
                </select>
            </div>
            <div className="flex gap-3">
                <input type="text" value={newUser.password} onChange={e => setNewUser(p => ({...p, password: e.target.value}))} placeholder={t('password')} className="flex-grow bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg text-sm p-2" />
                <button type="submit" disabled={!newUser.name.trim()} className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">{t('add')}</button>
            </div>
        </form>
        <ul className="space-y-3">
            {users.map(user => (
                <li key={user.id} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                    <div>
                        <span className="font-semibold text-gray-800 dark:text-gray-200">{user.name}</span>
                        <span className="text-xs ml-2 text-gray-500 dark:text-gray-400 uppercase">
                            {user.role === 'admin' ? t('roleAdmin') : user.role === 'viewer' ? t('roleViewer') : t('roleTeacher')}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handleEditClick(user)} className="text-sky-500 hover:text-sky-700 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                        <button onClick={() => onDeleteUser(user.id)} className="text-red-500 hover:text-red-700 p-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                    </div>
                </li>
            ))}
        </ul>
    </div>
  );

  const renderEditView = () => (
    <div className="p-6">
        <div className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('fullName')}</label>
                <input type="text" value={editingUser?.name || ''} onChange={e => setEditingUser(p => p ? {...p, name: e.target.value} : null)} className="w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('password')}</label>
                <input type="text" value={editingUser?.password || ''} onChange={e => setEditingUser(p => p ? {...p, password: e.target.value} : null)} className="w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg p-2" />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('role')}</label>
                <select value={editingUser?.role || 'teacher'} onChange={e => setEditingUser(p => p ? {...p, role: e.target.value as UserRole} : null)} className="w-full bg-gray-50 dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    <option value="teacher">{t('roleTeacher')}</option>
                    <option value="admin">{t('roleAdmin')}</option>
                    <option value="viewer">{t('roleViewer')}</option>
                </select>
            </div>
            {editingUser?.role === 'teacher' && (
                <div>
                    <h4 className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('assignedClasses')}</h4>
                    <div className="max-h-60 overflow-y-auto space-y-3 p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
                        {grades.map(grade => (
                            <div key={grade.id}>
                                <h5 className="font-semibold text-gray-800 dark:text-gray-200 mb-1">{grade.name} {t('class')}</h5>
                                <div className="space-y-1 pl-2">
                                    {grade.classes.map(cls => (
                                        <label key={cls.id} className="flex items-center gap-2 cursor-pointer text-sm">
                                            <input type="checkbox" checked={editingUser.classIds.includes(cls.id)} onChange={e => handleClassAssignmentChange(cls.id, e.target.checked)} className="form-checkbox h-4 w-4 rounded text-sky-600 focus:ring-sky-500" />
                                            {cls.name}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50" onClick={handleCancelEdit}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{editingUser ? `${t('editing')}: ${editingUser.name}` : t('manageUsers')}</h3>
            <button onClick={editingUser ? handleCancelEdit : onClose} className="text-gray-400 hover:text-gray-600"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
        </div>
        
        <div className="overflow-y-auto">
            {editingUser ? renderEditView() : renderUserList()}
        </div>
        
        <div className="p-6 mt-auto border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
            <button onClick={editingUser ? handleCancelEdit : onClose} className="px-5 py-2 text-sm font-medium bg-gray-100 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500 rounded-lg">
                {editingUser ? t('cancel') : t('close')}
            </button>
            {editingUser && <button onClick={handleSaveEdit} className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700">{t('save')}</button>}
        </div>
      </div>
    </div>
  );
};

export default ManageUsersModal;
