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
  initialGradeId?: number;
  initialClassId?: number;
  onImportReport: (data: any) => void;
}

const toLocalISOString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

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
};

const getMonthDates = (d: Date) => {
    const date = new Date(d);
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({length: daysInMonth}, (_, i) => {
        return toLocalISOString(new Date(year, month, i + 1));
    });
};

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
};

const ReportingDashboardModal: React.FC<ReportingDashboardModalProps> = ({ 
    grades, 
    attendance, 
    submissions, 
    users, 
    onClose, 
    currentUser, 
    availableStatuses, 
    initialDate, 
    initialGradeId,
    initialClassId,
    onImportReport 
}) => {
    const { t, statusKeys, getStatusLabel } = useLocale();
    const [activeTab, setActiveTab] = useState<TabType>(currentUser.role === 'admin' ? 'activity' : 'stats');
    const [reportType, setReportType] = useState<ReportType>('day');
    
    const [selectedDate, setSelectedDate] = useState(initialDate);
    const [customStartDate, setCustomStartDate] = useState(initialDate);
    const [customEndDate, setCustomEndDate] = useState(initialDate);

    const [showExportOptions, setShowExportOptions] = useState<boolean>(false);
    const [filterStatus, setFilterStatus] = useState<string>('absent');
    const [isExportingPdf, setIsExportingPdf] = useState(false);
    const [isExportingOfficialPdf, setIsExportingOfficialPdf] = useState<boolean>(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const chartCanvasRef = useRef<HTMLCanvasElement>(null);
    const chartInstanceRef = useRef<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const printPdfContainerRef = useRef<HTMLDivElement>(null);

    const isUserAdmin = currentUser.role === 'admin';
    const isUserViewer = currentUser.role === 'viewer';
    const teacherClassIds = useMemo(() => new Set(currentUser.classIds), [currentUser]);
    
    const visibleGradesForFilter = useMemo(() => {
        if (isUserAdmin || isUserViewer) return grades;
        return grades
            .map(g => ({...g, classes: g.classes.filter(c => teacherClassIds.has(c.id))}))
            .filter(g => g.classes.length > 0);
    }, [grades, isUserAdmin, isUserViewer, teacherClassIds]);

    const [filterGradeId, setFilterGradeId] = useState<string>(initialGradeId ? String(initialGradeId) : 'all');
    const [filterClassId, setFilterClassId] = useState<string>(initialClassId ? String(initialClassId) : 'all');
    
    const availableClassesForFilter = useMemo(() => {
        if (filterGradeId === 'all') return visibleGradesForFilter.flatMap(g => g.classes);
        return visibleGradesForFilter.find(g => g.id === Number(filterGradeId))?.classes || [];
    }, [filterGradeId, visibleGradesForFilter]);

    const selectedGradeObj = useMemo(() => {
        if (filterGradeId === 'all') return null;
        return visibleGradesForFilter.find(g => g.id === Number(filterGradeId)) || null;
    }, [filterGradeId, visibleGradesForFilter]);

    const selectedClassObj = useMemo(() => {
        if (filterClassId === 'all') return null;
        return availableClassesForFilter.find(c => c.id === Number(filterClassId)) || null;
    }, [filterClassId, availableClassesForFilter]);

    const selectedClassTeacher = useMemo(() => {
        if (!selectedClassObj) return null;
        const teachers = users.filter(u => u.role === 'teacher' && u.classIds.includes(selectedClassObj.id));
        return teachers.map(t => t.name).join(', ') || null;
    }, [selectedClassObj, users]);

    const selectedClassSubmission = useMemo(() => {
        if (!selectedClassObj) return null;
        return submissions[selectedDate]?.[selectedClassObj.id] || null;
    }, [submissions, selectedDate, selectedClassObj]);

    const studentToClassMap = useMemo(() => {
        const map = new Map<number, { id: number, name: string }>();
        visibleGradesForFilter.flatMap(g => g.classes).forEach(c => {
            c.students.forEach(s => map.set(s.id, { id: c.id, name: c.name }));
        });
        return map;
    }, [visibleGradesForFilter]);

    const reportData = useMemo(() => {
        let dates: string[] = [];
        const baseDate = new Date(selectedDate + 'T00:00:00');
        if (reportType === 'day') dates = [selectedDate];
        else if (reportType === 'week') dates = getWeekDates(baseDate);
        else if (reportType === 'month') dates = getMonthDates(baseDate);
        else if (reportType === 'custom') dates = getCustomDateRange(customStartDate, customEndDate);

        const targetStudents = visibleGradesForFilter
            .filter(g => filterGradeId === 'all' || g.id === Number(filterGradeId))
            .flatMap(g => g.classes)
            .filter(c => filterClassId === 'all' || c.id === Number(filterClassId))
            .flatMap(c => c.students);

        const summary = {
            total: targetStudents.length * dates.length,
            present: 0,
            late: 0,
            absent_illness: 0,
            absent_valid: 0,
            absent_unexcused: 0,
            absent_order: 0,
            absent_parental: 0,
            absent_competition: 0,
            other: 0,
        };

        const details: { date: string; student: Student; status: AttendanceStatus; note?: string }[] = [];

        dates.forEach(dateStr => {
            const dayAttendance = attendance[dateStr] || {};
            targetStudents.forEach(student => {
                const record = dayAttendance[student.id];
                const status = record?.status || statusKeys.PRESENT;
                
                switch(status) {
                    case statusKeys.PRESENT: summary.present++; break;
                    case statusKeys.LATE: summary.late++; break;
                    case statusKeys.ABSENT_ILLNESS: summary.absent_illness++; break;
                    case statusKeys.ABSENT_VALID: summary.absent_valid++; break;
                    case statusKeys.ABSENT_UNEXCUSED: summary.absent_unexcused++; break;
                    case statusKeys.ABSENT_ORDER: summary.absent_order++; break;
                    case statusKeys.ABSENT_PARENTAL: summary.absent_parental++; break;
                    case statusKeys.ABSENT_COMPETITION: summary.absent_competition++; break;
                    default: summary.other++; break;
                }

                details.push({
                    date: dateStr,
                    student,
                    status,
                    note: record?.note
                });
            });
        });

        return { summary, details };
    }, [selectedDate, customStartDate, customEndDate, reportType, visibleGradesForFilter, filterGradeId, filterClassId, attendance, statusKeys]);

    const activityData = useMemo(() => {
        return visibleGradesForFilter.flatMap(grade => 
            grade.classes.map(cls => {
                const submission = submissions[selectedDate]?.[cls.id];
                const teachers = users.filter(u => u.role === 'teacher' && u.classIds.includes(cls.id));
                const teacherNames = teachers.map(t => t.name).join(', ') || t('noTeacherAssigned');

                return {
                    classId: cls.id,
                    className: cls.name,
                    teacherNames,
                    isSubmitted: !!submission,
                    submittedAt: submission ? new Date(submission.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '-'
                };
            })
        );
    }, [visibleGradesForFilter, submissions, selectedDate, users, t]);

    // Students for the official PDF summary (selected date and selected class/grade)
    const pdfStudentsList = useMemo(() => {
        const targetStudents = visibleGradesForFilter
            .filter(g => filterGradeId === 'all' || g.id === Number(filterGradeId))
            .flatMap(g => g.classes)
            .filter(c => filterClassId === 'all' || c.id === Number(filterClassId))
            .flatMap(c => c.students.map(s => ({
                student: s,
                className: c.name,
                classId: c.id
            })))
            .sort((a, b) => a.student.name.localeCompare(b.student.name, 'ru'));

        const dayAttendance = attendance[selectedDate] || {};

        return targetStudents.map(item => {
            const record = dayAttendance[item.student.id];
            const status = record?.status || statusKeys.PRESENT;
            return {
                student: item.student,
                className: item.className,
                classId: item.classId,
                status,
                note: record?.note || ''
            };
        });
    }, [visibleGradesForFilter, filterGradeId, filterClassId, attendance, selectedDate, statusKeys]);

    const pdfMetrics = useMemo(() => {
        const total = pdfStudentsList.length;
        let present = 0;
        let late = 0;
        let absentIllness = 0;
        let absentValid = 0;
        let absentUnexcused = 0;
        let absentOrder = 0;
        let absentParental = 0;
        let absentCompetition = 0;
        let other = 0;

        pdfStudentsList.forEach(s => {
            switch(s.status) {
                case statusKeys.PRESENT: present++; break;
                case statusKeys.LATE: late++; break;
                case statusKeys.ABSENT_ILLNESS: absentIllness++; break;
                case statusKeys.ABSENT_VALID: absentValid++; break;
                case statusKeys.ABSENT_UNEXCUSED: absentUnexcused++; break;
                case statusKeys.ABSENT_ORDER: absentOrder++; break;
                case statusKeys.ABSENT_PARENTAL: absentParental++; break;
                case statusKeys.ABSENT_COMPETITION: absentCompetition++; break;
                default: other++; break;
            }
        });

        const totalAbsent = absentIllness + absentValid + absentUnexcused + absentOrder + absentParental + absentCompetition + other;
        const presentRate = total > 0 ? ((present / total) * 100).toFixed(1) : '0.0';
        const lateRate = total > 0 ? ((late / total) * 100).toFixed(1) : '0.0';
        const absentRate = total > 0 ? ((totalAbsent / total) * 100).toFixed(1) : '0.0';
        const attendanceRate = total > 0 ? (((present + late) / total) * 100).toFixed(1) : '0.0';

        return {
            total,
            present,
            late,
            totalAbsent,
            absentIllness,
            absentValid,
            absentUnexcused,
            absentOrder,
            absentParental,
            absentCompetition,
            other,
            presentRate,
            lateRate,
            absentRate,
            attendanceRate
        };
    }, [pdfStudentsList, statusKeys]);

    // Pagination for PDF rendering: 16 students on Page 1, 22 on subsequent pages
    const pdfPages = useMemo(() => {
        const total = pdfStudentsList.length;
        if (total === 0) return [[]];
        if (total <= 16) return [pdfStudentsList];
        
        const pages: typeof pdfStudentsList[] = [];
        pages.push(pdfStudentsList.slice(0, 16));
        
        let cursor = 16;
        const pageSize = 22;
        while (cursor < total) {
            pages.push(pdfStudentsList.slice(cursor, cursor + pageSize));
            cursor += pageSize;
        }
        return pages;
    }, [pdfStudentsList]);

    const stats = useMemo(() => [
        { label: t('present'), value: reportData.summary.present, color: 'bg-green-500' },
        { label: t('late'), value: reportData.summary.late, color: 'bg-yellow-500' },
        { label: t('absentIllness'), value: reportData.summary.absent_illness, color: 'bg-red-500' },
        { label: t('absentValid'), value: reportData.summary.absent_valid, color: 'bg-orange-500' },
        { label: t('absentUnexcused'), value: reportData.summary.absent_unexcused, color: 'bg-rose-700' },
        { label: t('absentOrder'), value: reportData.summary.absent_order, color: 'bg-indigo-500' },
        { label: t('absentParental'), value: reportData.summary.absent_parental, color: 'bg-purple-500' },
        { label: t('absentCompetition'), value: reportData.summary.absent_competition, color: 'bg-cyan-500' },
    ], [reportData.summary, t]);

    useEffect(() => {
        if (activeTab !== 'stats' || !chartCanvasRef.current) return;
        
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        const ctx = chartCanvasRef.current.getContext('2d');
        if (!ctx) return;

        const isDark = document.documentElement.classList.contains('dark');

        chartInstanceRef.current = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: stats.map(s => s.label),
                datasets: [{
                    label: t('statsCount'),
                    data: stats.map(s => s.value),
                    backgroundColor: [
                        '#22c55e', '#eab308', '#ef4444', '#f97316', 
                        '#be123c', '#6366f1', '#a855f7', '#06b6d4'
                    ],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            precision: 0,
                            color: isDark ? '#9ca3af' : '#4b5563'
                        },
                        grid: {
                            color: isDark ? '#374151' : '#e5e7eb'
                        }
                    },
                    x: {
                        ticks: {
                            color: isDark ? '#9ca3af' : '#4b5563'
                        },
                        grid: { display: false }
                    }
                }
            }
        });

        return () => {
            if (chartInstanceRef.current) {
                chartInstanceRef.current.destroy();
            }
        };
    }, [activeTab, stats, t]);

    const filteredDetails = useMemo(() => {
        return reportData.details.filter(d => {
            if (filterStatus === 'all') return true;
            if (filterStatus === 'absent') return d.status !== statusKeys.PRESENT;
            return d.status === filterStatus;
        });
    }, [reportData.details, filterStatus, statusKeys]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                onImportReport(data);
                if (fileInputRef.current) fileInputRef.current.value = '';
            } catch (err) {
                console.error("Failed to parse report file", err);
                alert("Ошибка: Неверный формат файла отчета.");
            }
        };
        reader.readAsText(file);
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

    const handleExportOfficialPdf = async () => {
        setIsExportingOfficialPdf(true);
        try {
            const container = printPdfContainerRef.current;
            if (!container) throw new Error('PDF template container not found');

            const pageElements = container.querySelectorAll<HTMLElement>('.official-pdf-page');
            if (!pageElements || pageElements.length === 0) {
                throw new Error('No PDF pages found');
            }

            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });

            for (let i = 0; i < pageElements.length; i++) {
                if (i > 0) {
                    pdf.addPage('a4', 'portrait');
                }
                const pageEl = pageElements[i];
                const canvas = await html2canvas(pageEl, {
                    scale: 2,
                    useCORS: true,
                    logging: false,
                    backgroundColor: '#ffffff',
                    windowWidth: 794
                });

                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            }

            const classLabel = selectedClassObj 
                ? selectedClassObj.name 
                : (selectedGradeObj ? selectedGradeObj.name : 'Vse_Klassy');
            const safeClassLabel = classLabel.replace(/[\s/\\?%*:|"<>]/g, '_');
            const fileName = `Vedomost_${safeClassLabel}_${selectedDate}.pdf`;
            
            pdf.save(fileName);
            
            setSuccessMessage(t('pdfDownloadSuccess'));
            setTimeout(() => setSuccessMessage(null), 4000);
        } catch (error) {
            console.error('Error generating official PDF:', error);
            alert(t('pdfCreationError'));
        } finally {
            setIsExportingOfficialPdf(false);
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
    };

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
                
                {/* Responsive Filter Bar */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col md:flex-row flex-wrap gap-4 items-end bg-gray-50/50 dark:bg-gray-900/20">
                    <div className="flex-1 min-w-[150px]">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('date')}</label>
                        <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-800 dark:text-white" />
                    </div>

                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('grade')}</label>
                        <select 
                            value={filterGradeId} 
                            onChange={e => {
                                setFilterGradeId(e.target.value);
                                setFilterClassId('all');
                            }} 
                            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-800 dark:text-white"
                        >
                            <option value="all">{t('allGrades')}</option>
                            {visibleGradesForFilter.map(g => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[140px]">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('class')}</label>
                        <select 
                            value={filterClassId} 
                            onChange={e => setFilterClassId(e.target.value)} 
                            className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-800 dark:text-white"
                        >
                            <option value="all">{t('allClasses')}</option>
                            {availableClassesForFilter.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {activeTab === 'stats' && (
                        <>
                        <div className="flex-1 min-w-[140px]">
                            <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('reportType')}</label>
                            <select value={reportType} onChange={e => setReportType(e.target.value as ReportType)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-800 dark:text-white">
                                <option value="day">{t('day')}</option>
                                <option value="week">{t('week')}</option>
                                <option value="month">{t('month')}</option>
                                <option value="custom">{t('custom')}</option>
                            </select>
                        </div>
                        {reportType === 'custom' && (
                            <div className="flex flex-1 gap-2 min-w-[240px]">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('startDate')}</label>
                                    <input type="date" value={customStartDate} onChange={e => setCustomStartDate(e.target.value)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-800 dark:text-white" />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('endDate')}</label>
                                    <input type="date" value={customEndDate} onChange={e => setCustomEndDate(e.target.value)} className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg p-2 text-sm text-gray-800 dark:text-white" />
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
                                
                                <div className="flex justify-between items-center mb-4">
                                    <h5 className="font-bold text-gray-800 dark:text-white text-sm uppercase tracking-wider">{t('detailedReportSheet')}</h5>
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-bold text-gray-500 dark:text-gray-400">{t('filter')}:</label>
                                        <select 
                                            value={filterStatus} 
                                            onChange={e => setFilterStatus(e.target.value)}
                                            className="bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1 text-xs text-gray-800 dark:text-white"
                                        >
                                            <option value="absent">{t('allAbsent')}</option>
                                            <option value="all">{t('all')}</option>
                                            {availableStatuses.map(s => (
                                                <option key={s.value} value={s.value}>{s.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
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
                                            {filteredDetails.length === 0 && (
                                                <tr>
                                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                                                        {t('noStudentsInClass')}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                         )}

                         {/* Action Buttons Footer */}
                         <div className="mt-8 flex flex-col sm:flex-row justify-between items-center border-t border-gray-200 dark:border-gray-700 pt-6 gap-4">
                             <div className="flex items-center gap-3 w-full sm:w-auto">
                                 <button onClick={onClose} className="px-6 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white rounded-lg text-sm font-bold transition">{t('close')}</button>
                                 {successMessage && (
                                     <div className="px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 rounded-lg text-xs font-bold flex items-center gap-1.5 animate-fade-in">
                                         <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                         {successMessage}
                                     </div>
                                 )}
                             </div>

                             <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                                  {/* Dedicated Quick Action for Professional PDF Summary */}
                                  <button 
                                      onClick={handleExportOfficialPdf} 
                                      disabled={isExportingOfficialPdf}
                                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-bold shadow-md flex items-center gap-2 transition disabled:opacity-50"
                                      title={t('pdfButtonLabel')}
                                  >
                                      {isExportingOfficialPdf ? (
                                          <span className="flex items-center gap-2">
                                              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                              </svg>
                                              {t('generatingPdf')}
                                          </span>
                                      ) : (
                                          <>
                                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                              </svg>
                                              {t('pdfButtonLabel')}
                                          </>
                                      )}
                                  </button>

                                  {/* Export Dropdown */}
                                  <div className="relative">
                                       <button onClick={() => setShowExportOptions(!showExportOptions)} className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-sm font-black shadow-md flex items-center gap-2 transition">
                                           {isExportingPdf ? (
                                               <span className="flex items-center gap-2">
                                                   <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                       <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                       <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                   </svg>
                                                   ...
                                               </span>
                                           ) : (
                                               <>
                                                   {t('export')}
                                                   <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                               </>
                                           )}
                                       </button>
                                      {showExportOptions && (
                                          <div className="absolute right-0 bottom-12 w-56 bg-white dark:bg-gray-700 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-600 z-10 overflow-hidden text-gray-800 dark:text-gray-100">
                                              <button onClick={() => { handleExportOfficialPdf(); setShowExportOptions(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-emerald-50 dark:hover:bg-gray-600 font-bold text-emerald-700 dark:text-emerald-300 flex items-center gap-2 transition">
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                  {t('exportOfficialPdf')}
                                              </button>
                                              <button onClick={() => { handleExportToExcel(); setShowExportOptions(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition flex items-center gap-2 border-t border-gray-100 dark:border-gray-600">
                                                  <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                                  {t('exportToExcel')}
                                              </button>
                                              <button onClick={() => { handleExportToPdf(); setShowExportOptions(false); }} className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition border-t border-gray-100 dark:border-gray-600 flex items-center gap-2 text-gray-600 dark:text-gray-300">
                                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                                  {t('exportToPdf')}
                                              </button>
                                          </div>
                                      )}
                                  </div>
                             </div>
                         </div>
                     </div>
                </div>
            </div>

            {/* Offscreen high-res container for jsPDF multi-page rendering */}
            <div 
                ref={printPdfContainerRef} 
                style={{ 
                    position: 'fixed', 
                    top: 0, 
                    left: '-9999px', 
                    width: '794px', 
                    zIndex: -9999, 
                    pointerEvents: 'none',
                    backgroundColor: '#ffffff'
                }}
            >
                {pdfPages.map((pageStudents, pageIndex) => {
                    const isFirstPage = pageIndex === 0;
                    const isLastPage = pageIndex === pdfPages.length - 1;
                    const classTitle = selectedClassObj 
                        ? `${selectedClassObj.name} класс` 
                        : (selectedGradeObj ? `${selectedGradeObj.name} (Все классы)` : 'Все классы школы');
                    const teacherTitle = selectedClassTeacher || t('noTeacherAssigned');

                    return (
                        <div 
                            key={pageIndex}
                            className="official-pdf-page"
                            style={{
                                width: '794px',
                                minHeight: '1123px',
                                maxHeight: '1123px',
                                padding: '36px 40px',
                                boxSizing: 'border-box',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'space-between',
                                backgroundColor: '#ffffff',
                                color: '#111827',
                                fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                            }}
                        >
                            <div>
                                {/* Institutional Letterhead */}
                                {isFirstPage ? (
                                    <div style={{ borderBottom: '2px solid #1e3a8a', paddingBottom: '12px', marginBottom: '16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                {/* Institutional Emblem */}
                                                <div style={{ width: '44px', height: '44px', borderRadius: '50%', backgroundColor: '#1e3a8a', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f59e0b', flexShrink: 0 }}>
                                                    <svg style={{ width: '26px', height: '26px' }} fill="currentColor" viewBox="0 0 20 20">
                                                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a10.973 10.973 0 00-.75 2.875A1 1 0 005.5 12h9a1 1 0 001-1.074 10.973 10.973 0 00-.75-2.875l2.606-1.13a1 1 0 000-1.84l-7-3zM10 4.168l4.275 1.832L10 7.832 5.725 6 10 4.168zM5.5 13a1 1 0 00-.993.883C4.24 16.29 6.74 18 10 18s5.76-1.71 5.493-4.117A1 1 0 0014.5 13H5.5z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '11px', fontWeight: '800', letterSpacing: '1px', color: '#1e3a8a', textTransform: 'uppercase' }}>
                                                        Республика Казахстан • Министерство просвещения
                                                    </div>
                                                    <div style={{ fontSize: '15px', fontWeight: '900', color: '#0f172a' }}>
                                                        Система электронного учета посещаемости «iBaqyla»
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '10px', fontWeight: '700', color: '#64748b' }}>
                                                    ИД ДОКУМЕНТА:
                                                </div>
                                                <div style={{ fontSize: '11px', fontWeight: '800', fontFamily: 'monospace', color: '#0f172a' }}>
                                                    IBQ-{selectedDate.replace(/-/g, '')}-{selectedClassObj?.id || 'ALL'}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Document Main Heading */}
                                        <div style={{ marginTop: '14px', textAlign: 'center' }}>
                                            <h1 style={{ fontSize: '18px', fontWeight: '900', color: '#1e3a8a', letterSpacing: '0.5px', margin: 0, textTransform: 'uppercase' }}>
                                                {t('pdfSummaryTitle')}
                                            </h1>
                                            <p style={{ fontSize: '11px', color: '#475569', margin: '3px 0 0 0' }}>
                                                {t('pdfSummarySubtitle')} • Дата: <strong style={{ color: '#0f172a' }}>{selectedDate}</strong>
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    /* Continuation Header */
                                    <div style={{ borderBottom: '1.5px solid #cbd5e1', paddingBottom: '8px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <span style={{ fontSize: '12px', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase' }}>
                                                {t('pdfSummaryTitle')} (Продолжение)
                                            </span>
                                            <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '12px' }}>
                                                Класс: <strong>{classTitle}</strong> | Дата: <strong>{selectedDate}</strong>
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#64748b', fontWeight: '600' }}>
                                            Страница {pageIndex + 1} из {pdfPages.length}
                                        </div>
                                    </div>
                                )}

                                {/* Context Metadata and Metrics only on Page 1 */}
                                {isFirstPage && (
                                    <>
                                        {/* Context Details Grid */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', backgroundColor: '#f8fafc', padding: '10px 14px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '14px', fontSize: '11px' }}>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>{t('class')}:</span>
                                                <strong style={{ color: '#0f172a', fontSize: '12px' }}>{classTitle}</strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>{t('classTeacher')}:</span>
                                                <strong style={{ color: '#0f172a', fontSize: '12px' }}>{teacherTitle}</strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>{t('status')}:</span>
                                                <strong style={{ color: selectedClassSubmission ? '#15803d' : '#b91c1c', fontSize: '12px' }}>
                                                    {selectedClassSubmission 
                                                        ? `${t('submitted')} (${new Date(selectedClassSubmission.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` 
                                                        : t('notSubmitted')}
                                                </strong>
                                            </div>
                                            <div>
                                                <span style={{ color: '#64748b', display: 'block', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}>{t('pdfGeneratedAt')}:</span>
                                                <strong style={{ color: '#0f172a', fontSize: '11px' }}>
                                                    {new Date().toLocaleDateString('ru-RU')} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </strong>
                                            </div>
                                        </div>

                                        {/* Executive Attendance Metrics Cards */}
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '12px' }}>
                                            <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#1e40af', textTransform: 'uppercase', display: 'block' }}>{t('pdfTotalStudents')}</span>
                                                <span style={{ fontSize: '20px', fontWeight: '900', color: '#1e3a8a', display: 'block', lineHeight: 1.2 }}>{pdfMetrics.total}</span>
                                                <span style={{ fontSize: '10px', color: '#3b82f6', fontWeight: '600' }}>100% по списку</span>
                                            </div>
                                            <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', display: 'block' }}>{t('pdfPresent')}</span>
                                                <span style={{ fontSize: '20px', fontWeight: '900', color: '#15803d', display: 'block', lineHeight: 1.2 }}>{pdfMetrics.present}</span>
                                                <span style={{ fontSize: '10px', color: '#16a34a', fontWeight: '700' }}>{pdfMetrics.presentRate}%</span>
                                            </div>
                                            <div style={{ backgroundColor: '#fefce8', border: '1px solid #fef08a', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#854d0e', textTransform: 'uppercase', display: 'block' }}>{t('pdfLate')}</span>
                                                <span style={{ fontSize: '20px', fontWeight: '900', color: '#ca8a04', display: 'block', lineHeight: 1.2 }}>{pdfMetrics.late}</span>
                                                <span style={{ fontSize: '10px', color: '#a16207', fontWeight: '700' }}>{pdfMetrics.lateRate}%</span>
                                            </div>
                                            <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '8px 12px', textAlign: 'center' }}>
                                                <span style={{ fontSize: '10px', fontWeight: '700', color: '#991b1b', textTransform: 'uppercase', display: 'block' }}>{t('pdfTotalAbsent')}</span>
                                                <span style={{ fontSize: '20px', fontWeight: '900', color: '#dc2626', display: 'block', lineHeight: 1.2 }}>{pdfMetrics.totalAbsent}</span>
                                                <span style={{ fontSize: '10px', color: '#b91c1c', fontWeight: '700' }}>{pdfMetrics.absentRate}%</span>
                                            </div>
                                        </div>

                                        {/* Attendance Progress & Absence Breakdown */}
                                        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                                <span style={{ fontSize: '11px', fontWeight: '700', color: '#334155' }}>
                                                    {t('pdfAttendanceRate')}: <strong style={{ color: '#0f172a' }}>{pdfMetrics.attendanceRate}%</strong>
                                                </span>
                                                <span style={{ fontSize: '10px', color: '#64748b' }}>
                                                    Присутствуют: {pdfMetrics.present} • Опоздали: {pdfMetrics.late} • Отсутствуют: {pdfMetrics.totalAbsent}
                                                </span>
                                            </div>
                                            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', display: 'flex' }}>
                                                <div style={{ width: `${pdfMetrics.presentRate}%`, backgroundColor: '#22c55e' }}></div>
                                                <div style={{ width: `${pdfMetrics.lateRate}%`, backgroundColor: '#eab308' }}></div>
                                                <div style={{ width: `${pdfMetrics.absentRate}%`, backgroundColor: '#ef4444' }}></div>
                                            </div>
                                            {/* Badges of reasons */}
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px', fontSize: '10px' }}>
                                                <span style={{ color: '#475569' }}><strong>Причины отсутствия:</strong></span>
                                                <span style={{ backgroundColor: '#fee2e2', color: '#991b1b', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                                    Болезнь: {pdfMetrics.absentIllness}
                                                </span>
                                                <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                                    Уважительная: {pdfMetrics.absentValid}
                                                </span>
                                                <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                                    Без причины: {pdfMetrics.absentUnexcused}
                                                </span>
                                                <span style={{ backgroundColor: '#e0e7ff', color: '#3730a3', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                                    Приказ: {pdfMetrics.absentOrder}
                                                </span>
                                                <span style={{ backgroundColor: '#f3e8ff', color: '#6b21a8', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                                    Заявление: {pdfMetrics.absentParental}
                                                </span>
                                                <span style={{ backgroundColor: '#ede9fe', color: '#5b21b6', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                                    Соревнования: {pdfMetrics.absentCompetition}
                                                </span>
                                                {pdfMetrics.other > 0 && (
                                                    <span style={{ backgroundColor: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: '600' }}>
                                                        Другое: {pdfMetrics.other}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}

                                {/* Students Attendance Table */}
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1px solid #cbd5e1' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f1f5f9', borderBottom: '1.5px solid #94a3b8' }}>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', width: '32px', color: '#334155', fontWeight: '800' }}>№</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'left', color: '#334155', fontWeight: '800' }}>{t('student')}</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', width: '35px', color: '#334155', fontWeight: '800' }}>{t('gender')}</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', width: '70px', color: '#334155', fontWeight: '800' }}>{t('class')}</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'center', width: '160px', color: '#334155', fontWeight: '800' }}>{t('status')}</th>
                                            <th style={{ padding: '6px 8px', textAlign: 'left', color: '#334155', fontWeight: '800' }}>{t('note')}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageStudents.map((row, rowIdx) => {
                                            const globalIndex = isFirstPage ? rowIdx + 1 : 16 + (pageIndex - 1) * 22 + rowIdx + 1;
                                            const isPresent = row.status === statusKeys.PRESENT;
                                            const isLate = row.status === statusKeys.LATE;
                                            
                                            // Badge style per status
                                            let badgeBg = '#f1f5f9';
                                            let badgeColor = '#334155';
                                            let badgeBorder = '#cbd5e1';

                                            if (isPresent) {
                                                badgeBg = '#dcfce7';
                                                badgeColor = '#15803d';
                                                badgeBorder = '#86efac';
                                            } else if (isLate) {
                                                badgeBg = '#fef9c3';
                                                badgeColor = '#854d0e';
                                                badgeBorder = '#fde047';
                                            } else if (row.status === statusKeys.ABSENT_ILLNESS || row.status === statusKeys.ABSENT_UNEXCUSED) {
                                                badgeBg = '#fee2e2';
                                                badgeColor = '#991b1b';
                                                badgeBorder = '#fca5a5';
                                            } else if (row.status === statusKeys.ABSENT_VALID) {
                                                badgeBg = '#fef3c7';
                                                badgeColor = '#92400e';
                                                badgeBorder = '#fcd34d';
                                            } else if (row.status === statusKeys.ABSENT_ORDER || row.status === statusKeys.ABSENT_COMPETITION) {
                                                badgeBg = '#e0e7ff';
                                                badgeColor = '#3730a3';
                                                badgeBorder = '#a5b4fc';
                                            } else if (row.status === statusKeys.ABSENT_PARENTAL) {
                                                badgeBg = '#f3e8ff';
                                                badgeColor = '#6b21a8';
                                                badgeBorder = '#d8b4fe';
                                            }

                                            return (
                                                <tr key={row.student.id} style={{ backgroundColor: rowIdx % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                                    <td style={{ padding: '5px 8px', textAlign: 'center', fontWeight: '700', color: '#64748b' }}>{globalIndex}</td>
                                                    <td style={{ padding: '5px 8px', fontWeight: '700', color: '#0f172a' }}>{row.student.name}</td>
                                                    <td style={{ padding: '5px 8px', textAlign: 'center', color: '#64748b', fontSize: '10px', fontWeight: '600' }}>
                                                        {row.student.gender === 'male' ? t('genderMaleShort') : t('genderFemaleShort')}
                                                    </td>
                                                    <td style={{ padding: '5px 8px', textAlign: 'center', color: '#475569', fontWeight: '600' }}>{row.className}</td>
                                                    <td style={{ padding: '5px 8px', textAlign: 'center' }}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            padding: '2px 8px',
                                                            borderRadius: '12px',
                                                            fontSize: '10px',
                                                            fontWeight: '700',
                                                            backgroundColor: badgeBg,
                                                            color: badgeColor,
                                                            border: `1px solid ${badgeBorder}`,
                                                            whiteSpace: 'nowrap'
                                                        }}>
                                                            {getStatusLabel(row.status)}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '5px 8px', color: '#64748b', fontStyle: 'italic', fontSize: '10px' }}>
                                                        {row.note || '—'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                        {pageStudents.length === 0 && (
                                            <tr>
                                                <td colSpan={6} style={{ padding: '16px', textAlign: 'center', color: '#64748b' }}>
                                                    {t('noStudentsInClass')}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Signatures & Verification Footer */}
                            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                                {isLastPage && (
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 1fr', gap: '16px', alignItems: 'center', marginBottom: '14px' }}>
                                        {/* Class Teacher Signature */}
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                {t('pdfClassTeacher')}:
                                            </div>
                                            <div style={{ borderBottom: '1px solid #0f172a', height: '22px', display: 'flex', alignItems: 'flex-end' }}>
                                                <span style={{ fontSize: '11px', color: '#64748b' }}>/ {teacherTitle}</span>
                                            </div>
                                            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                                                (подпись / расшифровка подписи)
                                            </div>
                                        </div>

                                        {/* Official Stamp */}
                                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                                            <div style={{
                                                width: '64px',
                                                height: '64px',
                                                border: '1.5px dashed #94a3b8',
                                                borderRadius: '50%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: '#64748b',
                                                fontSize: '10px',
                                                fontWeight: '800'
                                            }}>
                                                <span>{t('pdfSealPlace')}</span>
                                                <span style={{ fontSize: '8px', fontWeight: '600' }}>печать</span>
                                            </div>
                                        </div>

                                        {/* Administrator Signature */}
                                        <div>
                                            <div style={{ fontSize: '10px', fontWeight: '700', color: '#475569', textTransform: 'uppercase', marginBottom: '4px' }}>
                                                {t('pdfSchoolAdmin')}:
                                            </div>
                                            <div style={{ borderBottom: '1px solid #0f172a', height: '22px' }}></div>
                                            <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                                                (подпись / расшифровка подписи)
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Document Footer Information */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '9px', color: '#94a3b8', borderTop: '1px solid #f1f5f9', paddingTop: '6px' }}>
                                    <div>
                                        {t('pdfOfficialNotice')}
                                    </div>
                                    <div style={{ fontWeight: '700' }}>
                                        Страница {pageIndex + 1} из {pdfPages.length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default React.memo(ReportingDashboardModal);
