
import React, { useMemo, useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Chart, registerables } from 'chart.js';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { AttendanceRecord, Grade, Student, AttendanceStatus, User, SubmissionRecord, StatusOption } from '../types';
import { useLocale } from '../i18n';

Chart.register(...registerables);

type ReportType = 'day' | 'week' | 'month' | 'custom';
type TabType = 'stats' | 'activity';

interface ReportingDashboardModalProps {
  grades: Grade[];
  attendance: Record<string, AttendanceRecord>;
  submissions: SubmissionRecord;
  users: User[];
  onClose: () => void;
  currentUser: User;
  availableStatuses: StatusOption[];
  initialDate: string;
  onImportReport: (data: any) => void;
}

const toLocalISOString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

const getWeekDates = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); 
    const monday = new Date(date);
    monday.setDate(diff);
    return Array.from({length: 7}, (_, i) => {
        const cur = new Date(monday);
        cur.setDate(monday.getDate() + i);
        return toLocalISOString(cur);
    });
}

const getMonthDates = (d: Date) => {
    const date = new Date(d);
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({length: daysInMonth}, (_, i) => {
        return toLocalISOString(new Date(year, month, i + 1));
    });
}

const getCustomDateRange = (start: string, end: string) => {
    const dates = [];
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');
    const current = new Date(startDate);
    while (current <= endDate) {
        dates.push(toLocalISOString(current));
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

const ReportingDashboardModal: React.FC<ReportingDashboardModalProps> = ({ grades, attendance, submissions, users, onClose, currentUser, availableStatuses, initialDate, onImportReport }) => {
    const { t, statusKeys, getStatusLabel } = useLocale();
    const [activeTab, setActiveTab] = useState<TabType>(currentUser.role === 'admin' ? 'activity' : 'stats');
    const [reportType, setReportType] = useState<ReportType>('day');
    
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [customStartDate, setCustomStartDate] = useState(initialDate);
    const [customEndDate, setCustomEndDate] = useState(initialDate);

    const [showExportOptions, setShowExportOptions] = useState<boolean>(false);
    const [filterStatus, setFilterStatus] = useState<string>('absent');
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isUserAdmin = currentUser.role === 'admin';
    const isUserViewer = currentUser.role === 'viewer';
    const teacherClassIds = useMemo(() => new Set(currentUser.classIds), [currentUser]);
    
    const visibleGradesForFilter = useMemo(() => {
        if (isUserAdmin || isUserViewer) return grades;
        return grades
            .map(g => ({...g, classes: g.classes.filter(c => teacherClassIds.has(c.id))}))
            .filter(g => g.classes.length > 0);
    }, [grades, isUserAdmin, isUserViewer, teacherClassIds]);

    const [filterGradeId, setFilterGradeId] = useState<string>('all');
    const [filterClassId, setFilterClassId] = useState<string>('all');
    
    const availableClassesForFilter = useMemo(() => {
        if (filterGradeId === 'all') return visibleGradesForFilter.flatMap(g => g.classes);
        return visibleGradesForFilter.find(g => g.id === Number(filterGradeId))?.classes || [];
    }, [filterGradeId, visibleGradesForFilter]);

    const studentToClassMap = useMemo(() => {
        const map = new Map<number, { id: number, name: string }>();
        visibleGradesForFilter.flatMap(g => g.classes).forEach(c => {
            c.students.forEach(s => map.set(s.id, { id: c.id, name: c.name }));
        });
        return map;
    }, [visibleGradesForFilter]);

    const reportData = useMemo(() => {
        let dates: string[] = [];
        const dateObj = new Date(selectedDate + 'T00:00:00');
        if (reportType === 'day') dates = [selectedDate];
        if (reportType === 'week') dates = getWeekDates(dateObj);
        if (reportType === 'month') dates = getMonthDates(dateObj);
        if (reportType === 'custom') dates = getCustomDateRange(customStartDate, customEndDate);

        const filteredStudents = visibleGradesForFilter
            .filter(g => filterGradeId === 'all' || g.id === Number(filterGradeId))
            .flatMap(g => g.classes)
            .filter(c => filterClassId === 'all' || c.id === Number(filterClassId))
            .flatMap(c => c.students)
            .sort((a,b) => a.name.localeCompare(b.name, 'ru'));
        
        const summary = { total: 0, present: 0, late: 0, absentIllness: 0, absentValid: 0, absentUnexcused: 0, absentOrder: 0, absentParental: 0, absentCompetition: 0, other: 0 };
        const details: { student: Student; status: AttendanceStatus, date: string, note?: string }[] = [];
                
        for (const date of dates) {
            const dayAttendance = attendance[date] || {};
            const daySubmissions = submissions[date] || {};
            for (const student of filteredStudents) {
                const classInfo = studentToClassMap.get(student.id);
                if (!classInfo) continue;
                
                // For teachers, only show submitted reports. For admin/viewer, show everything.
                if (!isUserAdmin && !isUserViewer && !daySubmissions[classInfo.id]) continue;

                const record = dayAttendance[student.id];
                const status = record?.status || statusKeys.PRESENT;
                details.push({ student, status, date, note: record?.note });
                switch(status) {
                    case statusKeys.PRESENT: summary.present++; break;
                    case statusKeys.LATE: summary.late++; break;
                    case statusKeys.ABSENT_ILLNESS: summary.absentIllness++; break;
                    case statusKeys.ABSENT_VALID: summary.absentValid++; break;
                    case statusKeys.ABSENT_UNEXCUSED: summary.absentUnexcused++; break;
                    case statusKeys.ABSENT_ORDER: summary.absentOrder++; break;
                    case statusKeys.ABSENT_PARENTAL: summary.absentParental++; break;
                    case statusKeys.ABSENT_COMPETITION: summary.absentCompetition++; break;
                    default: summary.other++; break;
                }
                summary.total++;
            }
        }
        return { summary, details };
    }, [attendance, submissions, selectedDate, customStartDate, customEndDate, reportType, visibleGradesForFilter, filterGradeId, filterClassId, statusKeys, studentToClassMap]);

    const activityData = useMemo(() => {
        const allClasses = grades.flatMap(g => g.classes);
        const dateSubmissions = submissions[selectedDate] || {};

        return allClasses.map(cls => {
            const subLog = dateSubmissions[cls.id];
            const teachers = users.filter(u => u.role === 'teacher' && u.classIds.includes(cls.id));
            const teacherNames = teachers.map(t => t.name).join(', ') || t('noTeacherAssigned');
            return {
                classId: cls.id,
                className: cls.name,
                teacherNames,
                isSubmitted: !!subLog,
                submittedAt: subLog ? new Date(subLog.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-',
                submittedBy: subLog ? users.find(u => u.id === subLog.submittedByUserId)?.name : '-'
            };
        }).sort((a, b) => a.className.localeCompare(b.className, undefined, {numeric: true}));
    }, [grades, submissions, selectedDate, users, t]);

    const filteredDetails = useMemo(() => {
        if (filterStatus === 'all') return reportData.details;
        if (filterStatus === 'absent') {
            return reportData.details.filter(d => d.status !== statusKeys.PRESENT && d.status !== statusKeys.LATE);
        }
        return reportData.details.filter(d => d.status === filterStatus);
    }, [reportData.details, filterStatus, statusKeys]);

    const stats = useMemo(() => [
        { label: t('present'), value: reportData.summary.present, color: 'bg-green-500', hex: '#22c55e' },
        { label: t('late'), value: reportData.summary.late, color: 'bg-yellow-500', hex: '#eab308' },
        { label: t('absentIllnessShort'), value: reportData.summary.absentIllness, color: 'bg-red-500', hex: '#ef4444' },
        { label: t('absentValidShort'), value: reportData.summary.absentValid, color: 'bg-red-400', hex: '#f87171' },
        { label: t('absentUnexcusedShort'), value: reportData.summary.absentUnexcused, color: 'bg-red-600', hex: '#dc2626' },
        { label: t('absentOrderShort'), value: reportData.summary.absentOrder, color: 'bg-blue-500', hex: '#3b82f6' },
        { label: t('absentParentalShort'), value: reportData.summary.absentParental, color: 'bg-purple-500', hex: '#a855f7' },
        { label: t('absentCompetitionShort'), value: reportData.summary.absentCompetition, color: 'bg-indigo-500', hex: '#6366f1' },
        { label: t('other'), value: reportData.summary.other, color: 'bg-gray-500', hex: '#6b7280' },
    ], [reportData.summary, t]);

    useEffect(() => {
        if (activeTab !== 'stats') return;
        if (typeof Chart === 'undefined' || !chartCanvasRef.current) return;
        const ctx = chartCanvasRef.current.getContext('2d');
        if (!ctx) return;
        if (chartInstanceRef.current) chartInstanceRef.current.destroy();
        const activeStats = stats.filter(s => s.value > 0);
        if (activeStats.length === 0) return;
        chartInstanceRef.current = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: activeStats.map(s => s.label),
                datasets: [{ data: activeStats.map(s => s.value), backgroundColor: activeStats.map(s => s.hex), borderWidth: 1 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { color: document.documentElement.classList.contains('dark') ? '#e5e7eb' : '#374151', font: { size: 11 } } } },
                layout: { padding: 10 }
            }
        });
        return () => { if (chartInstanceRef.current) chartInstanceRef.current.destroy(); }
    }, [stats, activeTab]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = JSON.parse(evt.target?.result as string);
                onImportReport(data);
            } catch (err) { alert(t('importError')); }
        };
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const getExportFileName = () => {
        let dateStr = selectedDate;
        if (reportType === 'custom') dateStr = `${customStartDate}_to_${customEndDate}`;
        else if (reportType === 'week') dateStr = `Week_${selectedDate}`;
        else if (reportType === 'month') dateStr = `Month_${selectedDate.substring(0, 7)}`;
        return `${t('reportFileName')}_${dateStr}`;
    };

    const handleExportToExcel = () => {
        if (typeof XLSX === 'undefined') return alert(t('exportErrorXlsxNotFound'));
        const wb = XLSX.utils.book_new();
        const fileName = getExportFileName();
        if (activeTab === 'stats') {
            const summaryData = [[t('attendanceReportTitle')], [t('period'), reportType === 'day' ? selectedDate : (reportType === 'custom' ? `${customStartDate} - ${customEndDate}` : reportType)], [t('studentCount'), reportData.summary.total], [], [t('category'), t('statsCount'), t('percentage')], ...stats.map(s => [s.label, s.value, ((s.value / (reportData.summary.total || 1)) * 100).toFixed(1) + '%'])];
            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, t('summarySheet'));
            const detailData = [[t('date'), t('student'), t('class'), t('status'), t('note')], ...filteredDetails.map(d => [d.date, d.student.name, studentToClassMap.get(d.student.id)?.name || '', getStatusLabel(d.status), d.note || ''])];
            const wsDetails = XLSX.utils.aoa_to_sheet(detailData);
            XLSX.utils.book_append_sheet(wb, wsDetails, t('detailedReportSheet'));
            XLSX.writeFile(wb, `${fileName}.xlsx`);
        } else {
            const actData = [[t('teacherActivityTitle')], [t('date'), selectedDate], [], [t('class'), t('classTeacher'), t('status'), t('submissionTime')], ...activityData.map(a => [a.className, a.teacherNames, a.isSubmitted ? t('submitted') : t('notSubmitted'), a.submittedAt])];
            const wsAct = XLSX.utils.aoa_to_sheet(actData);
            XLSX.utils.book_append_sheet(wb, wsAct, t('tabActivity'));
            XLSX.writeFile(wb, `Activity_${selectedDate}.xlsx`);
        }
    };

    const handleExportToPdf = async () => {
        setIsExportingPdf(true);
        try {
            const reportElement = document.getElementById('report-content');
            if (!reportElement) throw new Error('Report element not found');

            // Temporarily adjust styles for better capture
            const originalStyle = reportElement.style.cssText;
            reportElement.style.maxHeight = 'none';
            reportElement.style.overflow = 'visible';
            
            const canvas = await html2canvas(reportElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: document.documentElement.classList.contains('dark') ? '#111827' : '#f9fafb'
            });

            // Restore original styles
            reportElement.style.cssText = originalStyle;

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: canvas.width > canvas.height ? 'l' : 'p',
                unit: 'px',
                format: [canvas.width, canvas.height]
            });

            pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
            const fileName = getExportFileName();
            pdf.save(`${fileName}.pdf`);
        } catch (e) { 
            console.error(e);
            alert(t('pdfCreationError')); 
        } finally { 
            setIsExportingPdf(false); 
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-5xl my-4 flex flex-col max-h-[95vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-900/50 rounded-t-2xl">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-yellow-500" viewBox="0 0 20 20" fill="currentColor"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>
                        {t('attendanceReports')}
                    </h3>
                    <div className="flex items-center gap-3">
                        {isUserAdmin && (
                            <>
                                <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
                                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-lg text-sm font-bold flex items-center gap-2 transition">
                                    {t('importReport')}
                                </button>
                            </>
                        )}
                        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                    </div>
                </div>
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    <button className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${activeTab === 'activity' ? 'text-sky-600 border-b-4 border-sky-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`} onClick={() => setActiveTab('activity')}>
                        {t('tabActivity')}
                    </button>
                    <button className={`flex-1 py-4 text-center font-bold text-sm transition-colors ${activeTab === 'stats' ? 'text-sky-600 border-b-4 border-sky-600' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'}`} onClick={() => setActiveTab('stats')}>
                        {t('tabStats')}
                    </button>
                </div>
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('date')}</label>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm" />
                    </div>
                    {activeTab === 'stats' && (
                        <>
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('reportType')}</label>
                            <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm">
                                <option value="day">{t('day')}</option>
                                <option value="week">{t('week')}</option>
                                <option value="month">{t('month')}</option>
                                <option value="custom">{t('custom')}</option>
                            </select>
                        </div>
                        {reportType === 'custom' && (
                            <div className="flex flex-1 gap-2">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('startDate')}</label>
                                    <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('endDate')}</label>
                                    <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm" />
                                </div>
                            </div>
                        )}
                        </>
                    )}
                </div>
                <div id="report-content" className="flex-grow overflow-y-auto p-6 bg-gray-50 dark:bg-gray-900/30">
                     <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
                         {activeTab === 'activity' ? (
                            <>
                                <h4 className="text-xl font-black text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                                    <span className="w-3 h-3 rounded-full bg-sky-500 animate-pulse"></span>
                                    {t('teacherActivityTitle')} ({selectedDate})
                                </h4>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead>
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('class')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('classTeacher')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('status')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('submissionTime')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {activityData.map((row) => (
                                                <tr key={row.classId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-black text-gray-900 dark:text-white">{row.className}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{row.teacherNames}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-black rounded-full shadow-sm 
                                                            ${row.isSubmitted ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                                            {row.isSubmitted ? t('submitted') : t('notSubmitted')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono font-bold">{row.submittedAt}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                         ) : (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-8">
                                    {stats.map(stat => (
                                        <div key={stat.label} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg border border-gray-100 dark:border-gray-600 text-center">
                                            <div className={`w-3 h-3 rounded-full mx-auto mb-2 ${stat.color}`}></div>
                                            <span className="text-2xl font-black text-gray-800 dark:text-white">{stat.value}</span>
                                            <span className="block text-xs text-gray-500 dark:text-gray-400 font-bold uppercase">{stat.label}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="h-80 relative mb-8"><canvas ref={chartCanvasRef}></canvas></div>
                                <div className="overflow-x-auto mt-8 border border-gray-200 dark:border-gray-700 rounded-lg">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-700">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('date')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('student')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('class')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('status')}</th>
                                                <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">{t('note')}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                            {filteredDetails.map((detail, idx) => (
                                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{detail.date}</td>
                                                    <td className="px-6 py-4 text-sm font-black text-gray-900 dark:text-white">{detail.student.name}</td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">{studentToClassMap.get(detail.student.id)?.name}</td>
                                                    <td className="px-6 py-4"><span className="px-2 py-1 text-xs font-black rounded-full bg-gray-100 dark:bg-gray-700 dark:text-gray-200">{getStatusLabel(detail.status)}</span></td>
                                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 italic">{detail.note || '-'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                         )}
                         <div className="mt-8 flex justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-6">
                             <button onClick={onClose} className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 rounded-lg text-sm font-bold transition">{t('close')}</button>
                             <div className="relative">
                                  <button onClick={() => setShowExportOptions(!showExportOptions)} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-black shadow-lg flex items-center gap-2 transition">
                                      {isExportingPdf ? (
                                          <span className="flex items-center gap-2">
                                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                              ...
                                          </span>
                                      ) : t('export')}
                                  </button>
                                 {showExportOptions && (
                                     <div className="absolute right-0 bottom-12 w-48 bg-white dark:bg-gray-700 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 z-10 overflow-hidden">
                                         <button onClick={() => { handleExportToExcel(); setShowExportOptions(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition">{t('exportToExcel')}</button>
                                         <button onClick={() => { handleExportToPdf(); setShowExportOptions(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition border-t border-gray-100 dark:border-gray-600">{t('exportToPdf')}</button>
                                     </div>
                                 )}
                             </div>
                         </div>
                     </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(ReportingDashboardModal);
