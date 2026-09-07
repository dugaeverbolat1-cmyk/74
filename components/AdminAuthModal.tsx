
import React, { useState } from 'react';
import { useLocale } from '../i18n';

interface AdminAuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AdminAuthModal: React.FC<AdminAuthModalProps> = ({ onClose, onSuccess }) => {
  const { t } = useLocale();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we'd check against the user's password.
    // Here we use 'admin' as defined in constants.ts or '0000' as suggested by i18n
    if (password === 'admin' || password === '0000') {
      onSuccess();
    } else {
      setError(true);
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-6">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {t('adminAuthTitle')}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-6">
            {t('enterAdminCode')}
          </p>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full bg-gray-50 dark:bg-gray-700 border ${error ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-200 dark:border-gray-600'} text-gray-900 dark:text-white rounded-xl p-3 text-center text-2xl tracking-widest focus:ring-2 focus:ring-purple-500 transition outline-none`}
                placeholder="****"
              />
              {error && <p className="text-red-500 text-xs text-center mt-2 animate-shake">{t('wrongCode')}</p>}
            </div>
            
            <div className="flex gap-3">
              <button type="button" onClick={onClose} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition">
                {t('cancel')}
              </button>
              <button type="submit" className="flex-1 py-3 bg-purple-600 text-white font-bold rounded-xl hover:bg-purple-700 shadow-lg transition active:scale-95">
                {t('login')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminAuthModal;
