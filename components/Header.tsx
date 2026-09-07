
import React, { useEffect, useState } from 'react';
import { useLocale } from '../i18n';
import { User } from '../types';
import { 
    LogOut, 
    Moon, 
    Sun, 
    LayoutDashboard, 
    Users, 
    Settings, 
    Database, 
    PieChart,
    Sparkles,
    User as UserIcon
} from 'lucide-react';

interface HeaderProps {
    onShowReportingDashboard: () => void;
    onShowManageStudents: () => void;
    onShowManageClasses: () => void;
    onShowManageUsers: () => void;
    onShowManageStatuses: () => void;
    onShowBilimClassSync: () => void;
    onShowAIAssistant: () => void;
    isUserAdmin: boolean;
    isUserViewer: boolean;
    currentUser: User;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
    onShowReportingDashboard,
    onShowManageUsers,
    onShowManageStatuses,
    onShowBilimClassSync,
    onShowAIAssistant,
    isUserAdmin,
    isUserViewer,
    currentUser,
    onLogout
}) => {
    const { t, locale, setLocale } = useLocale();
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && systemPrefersDark)) {
            setIsDark(true);
            document.documentElement.classList.add('dark');
        } else {
            setIsDark(false);
            document.documentElement.classList.remove('dark');
        }
    }, []);

    const toggleTheme = () => {
        if (isDark) {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
            setIsDark(false);
        } else {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
            setIsDark(true);
        }
    };

    const langButtonClasses = (lang: 'ru' | 'kk') => 
        `px-2 py-1 text-[10px] font-bold rounded transition-colors ${
            locale === lang 
            ? 'bg-sky-500 text-white shadow-sm' 
            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
        }`;

    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 transition-colors duration-300 sticky top-0 z-50">
            <div className="container mx-auto px-4 py-3 md:px-8">
                <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-sky-200 dark:shadow-none">
                            <LayoutDashboard size={24} />
                        </div>
                        <h1 className="text-xl font-black text-gray-900 dark:text-white tracking-tight">
                            iBaqyla
                        </h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center bg-gray-100 dark:bg-gray-700 p-1 rounded-lg gap-1">
                            <button onClick={() => setLocale('ru')} className={langButtonClasses('ru')}>RU</button>
                            <button onClick={() => setLocale('kk')} className={langButtonClasses('kk')}>KZ</button>
                        </div>
                        
                        <button 
                            onClick={toggleTheme} 
                            className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                        >
                            {isDark ? <Sun size={18} /> : <Moon size={18} />}
                        </button>

                        {currentUser.id !== 0 && (
                            <div className="flex items-center gap-3 pl-4 border-l border-gray-200 dark:border-gray-700">
                                <div className="hidden sm:block text-right">
                                    <p className="text-xs font-bold text-gray-900 dark:text-white leading-none">{currentUser.name}</p>
                                    <p className="text-[10px] text-sky-600 dark:text-sky-400 font-bold uppercase mt-1">
                                        {currentUser.role === 'admin' ? t('roleAdmin') : currentUser.role === 'viewer' ? t('roleViewer') : t('roleTeacher')}
                                    </p>
                                </div>
                                <button 
                                    onClick={onLogout}
                                    className="p-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors"
                                    title={t('logout')}
                                >
                                    <LogOut size={18} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {currentUser.id !== 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                        <button 
                            onClick={onShowReportingDashboard}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap"
                        >
                            <PieChart size={16} className="text-sky-500" />
                            {t('reports')}
                        </button>

                        <button 
                            onClick={onShowAIAssistant}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 rounded-lg transition-colors whitespace-nowrap"
                        >
                            <Sparkles size={16} />
                            {t('aiAssistant')}
                        </button>

                        <button 
                            onClick={onShowBilimClassSync}
                            className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors whitespace-nowrap"
                        >
                            <Database size={16} />
                            {t('bilimClassSync')}
                        </button>

                        {isUserAdmin && (
                            <>
                                <button 
                                    onClick={onShowManageUsers}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap"
                                >
                                    <Users size={16} className="text-orange-500" />
                                    {t('manageUsers')}
                                </button>
                                <button 
                                    onClick={onShowManageStatuses}
                                    className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors whitespace-nowrap"
                                >
                                    <Settings size={16} className="text-purple-500" />
                                    {t('manageStatuses')}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </header>
    );
};

export default React.memo(Header);
