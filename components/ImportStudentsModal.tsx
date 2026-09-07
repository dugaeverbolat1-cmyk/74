
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Gender } from '../types';
import { useLocale } from '../i18n';

interface ImportStudentsModalProps {
  onClose: () => void;
  onImport: (students: {name: string, gender: Gender}[]) => void;
}

const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({ onClose, onImport }) => {
  const { t } = useLocale();
  const [text, setText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const guessGender = (name: string): Gender => {
    const n = name.trim().toLowerCase();
    // Kazakh female heuristic
    if (n.endsWith('қызы') || n.endsWith('kyzy')) return 'female';
    
    // Common Russian/Kazakh female endings (a, ya)
    // Exceptions exist (Ilya, Nikita), but this is a helper, not a guarantor.
    if (n.endsWith('а') || n.endsWith('я')) return 'female';
    
    return 'male';
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
            
            // Extract names from the first column of each row
            const names = data
                .map((row: any) => String(row[0] || '').trim())
                .filter((name: string) => name.length > 0 && name !== 'ФИО' && name !== 'Имя' && name !== 'Name');
            
            if (names.length === 0) {
                alert(t('noStudentsMatchFilter'));
                return;
            }

            setText(names.join('\n'));
        } catch (err) {
            console.error(err);
            alert(t('excelImportError'));
        } finally {
            setIsProcessing(false);
        }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = () => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return;

    const students = lines.map(line => ({
        name: line.trim(),
        gender: guessGender(line.trim())
    }));

    onImport(students);
  };

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
        onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{t('importTitle')}</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                </button>
            </div>
        </div>
        
        <div className="p-6 flex-grow flex flex-col">
            <p className="text-gray-600 dark:text-gray-300 mb-4 text-sm">{t('importInstructions')}</p>
            
            <div className="mb-4 p-4 bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-xl">
                <label className="block text-sm font-bold text-sky-700 dark:text-sky-300 mb-2">{t('importExcel')}</label>
                <div className="flex items-center gap-3">
                    <input
                        type="file"
                        accept=".xlsx, .xls, .csv"
                        onChange={handleExcelUpload}
                        className="hidden"
                        id="excel-upload-students"
                    />
                    <label 
                        htmlFor="excel-upload-students"
                        className="cursor-pointer px-4 py-2 bg-white dark:bg-gray-700 border border-sky-200 dark:border-sky-800 rounded-lg text-sm font-medium text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-900/40 transition flex items-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('selectExcelFile')}
                    </label>
                    {isProcessing && <div className="w-4 h-4 border-2 border-sky-600 border-t-transparent rounded-full animate-spin"></div>}
                </div>
                <p className="text-[10px] text-sky-600/70 dark:text-sky-400/70 mt-2">
                    {t('excelTemplateInfo')}
                </p>
            </div>

            <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="w-full flex-grow bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-3 focus:ring-2 focus:ring-yellow-400 focus:border-yellow-400 transition font-mono text-sm h-64"
                placeholder={t('pasteNamesHere')}
            />
             <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-right">
                {text.split('\n').filter(l => l.trim()).length} {t('count')}
            </p>
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
                onClick={handleImport}
                disabled={!text.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-sky-600 rounded-lg hover:bg-sky-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-500 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {t('import')}
            </button>
        </div>
      </div>
    </div>
  );
};

export default React.memo(ImportStudentsModal);
