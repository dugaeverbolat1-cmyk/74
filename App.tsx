
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { INITIAL_GRADES, INITIAL_USERS } from './constants';
import { AttendanceStatus, Student, AttendanceRecord, Grade, Class, Gender, User, UserRole, SubmissionRecord, StatusOption, SubmissionLog } from './types';
import Header from './components/Header';
import StudentRow from './components/StudentRow';
import ReportingDashboardModal from './components/ReportingDashboardModal';
import ManageStudentsModal from './components/ManageStudentsModal';
import AddStudentModal from './components/AddStudentModal';
import ManageClassesModal from './components/ManageClassesModal';
import ImportStudentsModal from './components/ImportStudentsModal';
import ImportClassModal from './components/ImportClassModal';
import UserSwitcher from './components/UserSwitcher';
import ManageUsersModal from './components/ManageUsersModal';
import AdminAuthModal from './components/AdminAuthModal';
import StudentHistoryModal from './components/StudentHistoryModal';
import ManageStatusesModal from './components/ManageStatusesModal';
import BilimClassSyncModal from './components/BilimClassSyncModal';
import AIAssistantModal from './components/AIAssistantModal';
import { useLocale } from './i18n';
import { useLocalStorage } from './useLocalStorage';
import { db, auth } from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  query, 
  getDoc,
  getDocs,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { signInAnonymously, onAuthStateChanged } from 'firebase/auth';

type SortByType = 'name' | 'gender';

const App: React.FC = () => {
  const { t, statusKeys, getStatusLabel } = useLocale();
  const [grades, setGrades] = useState<Grade[]>(INITIAL_GRADES);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [submissions, setSubmissions] = useState<SubmissionRecord>({});
  const [customStatuses, setCustomStatuses] = useState<string[]>([]);
  const [currentUserId, setCurrentUserId] = useLocalStorage<number>('school_current_user_id_v16', INITIAL_USERS[0]?.id || 0);
  const [isAuthReady, setIsAuthReady] = useState(false);

  const getLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getLocalDate());

  // Auth initialization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        signInAnonymously(auth).catch(console.error);
      } else {
        setIsAuthReady(true);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization for config
  useEffect(() => {
    if (!isAuthReady) return;

    const unsubGrades = onSnapshot(doc(db, 'config', 'grades'), (docSnap) => {
      if (docSnap.exists()) setGrades(docSnap.data().data);
      else setDoc(doc(db, 'config', 'grades'), { data: INITIAL_GRADES });
    });

    const unsubUsers = onSnapshot(doc(db, 'config', 'users'), (docSnap) => {
      if (docSnap.exists()) setUsers(docSnap.data().data);
      else setDoc(doc(db, 'config', 'users'), { data: INITIAL_USERS });
    });

    const unsubStatuses = onSnapshot(doc(db, 'config', 'statuses'), (docSnap) => {
      if (docSnap.exists()) setCustomStatuses(docSnap.data().data);
      else setDoc(doc(db, 'config', 'statuses'), { data: [] });
    });

    return () => {
      unsubGrades();
      unsubUsers();
      unsubStatuses();
    };
  }, [isAuthReady]);

  // Real-time synchronization for attendance and submissions based on selected date
  useEffect(() => {
    if (!isAuthReady || !selectedDate) return;

    const unsubAttendance = onSnapshot(collection(db, 'attendance', selectedDate), (snapshot) => {
      const dailyAttendance: AttendanceRecord = {};
      snapshot.forEach(doc => {
        dailyAttendance[Number(doc.id)] = doc.data() as any;
      });
      setAttendance(prev => ({ ...prev, [selectedDate]: dailyAttendance }));
    });

    const unsubSubmissions = onSnapshot(collection(db, 'submissions', selectedDate), (snapshot) => {
      const dailySubmissions: Record<number, SubmissionLog> = {};
      snapshot.forEach(doc => {
        dailySubmissions[Number(doc.id)] = doc.data() as any;
      });
      setSubmissions(prev => ({ ...prev, [selectedDate]: dailySubmissions }));
    });

    return () => {
      unsubAttendance();
      unsubSubmissions();
    };
  }, [isAuthReady, selectedDate]);

  const currentUser = useMemo<User>(() => {
    const fallbackUser: User = { id: 0, name: 'No User', role: 'teacher', classIds: [] };
    return users.find(u => u.id === currentUserId) || users[0] || fallbackUser;
  }, [users, currentUserId]);

  const [selectedGradeId, setSelectedGradeId] = useState<number>(0);
  const [selectedClassId, setSelectedClassId] = useState<number>(0);
  
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<number>>(new Set());
  
  const [showReportingDashboard, setShowReportingDashboard] = useState<boolean>(false);
  const [showManageStudents, setShowManageStudents] = useState<boolean>(false);
  const [showManageClasses, setShowManageClasses] = useState<boolean>(false);
  const [showManageUsers, setShowManageUsers] = useState<boolean>(false);
  const [showAddStudent, setShowAddStudent] = useState<boolean>(false);
  const [showImportStudents, setShowImportStudents] = useState<boolean>(false);
  const [showImportClass, setShowImportClass] = useState<boolean>(false);
  const [showManageStatuses, setShowManageStatuses] = useState<boolean>(false);
  const [showAdminAuth, setShowAdminAuth] = useState<boolean>(false);
  const [showBilimClassSync, setShowBilimClassSync] = useState<boolean>(false);
  const [showAIAssistant, setShowAIAssistant] = useState<boolean>(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  
  const [historyStudent, setHistoryStudent] = useState<Student | null>(null);
  const [sortBy, setSortBy] = useState<SortByType>('name');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const isUserAdmin = useMemo(() => currentUser.role === 'admin', [currentUser]);
  const isUserViewer = useMemo(() => currentUser.role === 'viewer', [currentUser]);

  const visibleGrades = useMemo(() => {
    if (isUserAdmin || isUserViewer) return grades;
    
    const teacherClassIds = new Set(currentUser.classIds);
    return grades
      .map(grade => ({
        ...grade,
        classes: grade.classes.filter(c => teacherClassIds.has(c.id)),
      }))
      .filter(grade => grade.classes.length > 0);
  }, [grades, currentUser, isUserAdmin]);

  const availableClasses = useMemo(() => {
    return visibleGrades.find(g => g.id === selectedGradeId)?.classes || [];
  }, [visibleGrades, selectedGradeId]);
  
  useEffect(() => {
      setSelectedStudentIds(new Set());
      setSearchQuery('');
  }, [selectedClassId, selectedGradeId, selectedDate]);

  useEffect(() => {
    if (visibleGrades.length > 0) {
        if (!visibleGrades.find(g => g.id === selectedGradeId)) {
            setSelectedGradeId(visibleGrades[0].id);
        }
    } else {
        setSelectedGradeId(0);
    }
  }, [visibleGrades, selectedGradeId]);

  useEffect(() => {
    if (availableClasses.length > 0) {
        if (!availableClasses.find(c => c.id === selectedClassId)) {
            setSelectedClassId(availableClasses[0].id);
        }
    } else {
        setSelectedClassId(0);
    }
  }, [availableClasses, selectedClassId]);

  const availableStatuses = useMemo<StatusOption[]>(() => {
    const standard = Object.values(statusKeys).map(key => ({
        value: key,
        label: getStatusLabel(key)
    }));
    const custom = customStatuses.map(s => ({ value: s, label: s }));
    return [...standard, ...custom];
  }, [statusKeys, customStatuses, getStatusLabel]);

  const selectedClass = useMemo(() => {
    return availableClasses.find(c => c.id === selectedClassId);
  }, [availableClasses, selectedClassId]);

  const canManageStudents = useMemo(() => {
      if (isUserAdmin) return true;
      if (isUserViewer) return false;
      if (!selectedClass) return false;
      return currentUser.classIds.includes(selectedClass.id);
  }, [isUserAdmin, isUserViewer, selectedClass, currentUser]);

  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    let students = [...selectedClass.students];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      students = students.filter(s => s.name.toLowerCase().includes(query));
    }

    return students.sort((a, b) => {
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name, 'ru');
      } else {
        return a.gender.localeCompare(b.gender);
      }
    });
  }, [selectedClass, sortBy, searchQuery]);

  const isSubmitted = useMemo(() => {
      return !!submissions[selectedDate]?.[selectedClassId];
  }, [submissions, selectedDate, selectedClassId]);

  const handleStatusChange = useCallback(async (studentId: number, status: AttendanceStatus) => {
    if (isUserViewer || !isAuthReady) return;
    
    try {
      await setDoc(doc(db, 'attendance', selectedDate, String(studentId)), {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  }, [selectedDate, isAuthReady, isUserViewer]);
  
  const handleToggleStudentSelection = useCallback((studentId: number) => {
      setSelectedStudentIds(prev => {
          const newSet = new Set(prev);
          if (newSet.has(studentId)) {
              newSet.delete(studentId);
          } else {
              newSet.add(studentId);
          }
          return newSet;
      });
  }, []);

  const handleSelectAll = useCallback(() => {
      if (!selectedClass) return;
      if (selectedStudentIds.size === selectedClass.students.length) {
          setSelectedStudentIds(new Set());
      } else {
          setSelectedStudentIds(new Set(selectedClass.students.map(s => s.id)));
      }
  }, [selectedClass, selectedStudentIds]);

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const handleConfirmAll = useCallback(async () => {
    if (!selectedClass || isUserViewer || !isAuthReady) return;
    
    const currentDayAttendance = attendance[selectedDate] || {};
    const batch = writeBatch(db);
    
    selectedClass.students.forEach(student => {
        if (!currentDayAttendance[student.id]) {
            const studentDoc = doc(db, 'attendance', selectedDate, String(student.id));
            batch.set(studentDoc, { 
              status: statusKeys.PRESENT,
              updatedAt: new Date().toISOString()
            });
        }
    });

    const submissionDoc = doc(db, 'submissions', selectedDate, String(selectedClass.id));
    batch.set(submissionDoc, {
        submittedAt: new Date().toISOString(),
        submittedByUserId: currentUser.id
    });

    try {
      await batch.commit();
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
      setShowConfirmModal(false);
    } catch (error) {
      console.error("Error submitting report:", error);
    }
  }, [selectedClass, selectedDate, attendance, currentUser.id, statusKeys, isAuthReady, isUserViewer]);

  const handleAddStudent = useCallback(async (name: string, gender: Gender) => {
    if (!selectedClass || !isAuthReady) return;
    const newStudent: Student = { id: Date.now(), name, gender };
    const updatedGrades = grades.map(g => {
        if (g.id === selectedGradeId) {
            return {
                ...g,
                classes: g.classes.map(c => {
                    if (c.id === selectedClassId) {
                        return { ...c, students: [...c.students, newStudent] };
                    }
                    return c;
                })
            };
        }
        return g;
    });
    
    try {
      await setDoc(doc(db, 'config', 'grades'), { data: updatedGrades });
      setShowAddStudent(false);
    } catch (error) {
      console.error("Error adding student:", error);
    }
  }, [grades, selectedGradeId, selectedClassId, selectedClass, isAuthReady]);

  const handleRemoveStudent = useCallback(async (studentId: number) => {
      if (!isAuthReady) return;
      const updatedGrades = grades.map(g => ({
          ...g,
          classes: g.classes.map(c => ({
              ...c,
              students: c.students.filter(s => s.id !== studentId)
          }))
      }));
      try {
        await setDoc(doc(db, 'config', 'grades'), { data: updatedGrades });
      } catch (error) {
        console.error("Error removing student:", error);
      }
  }, [grades, isAuthReady]);

  const handleEditStudent = useCallback(async (studentId: number, newName: string, newGender: Gender) => {
      if (!isAuthReady) return;
      const updatedGrades = grades.map(g => ({
          ...g,
          classes: g.classes.map(c => ({
              ...c,
              students: c.students.map(s => s.id === studentId ? { ...s, name: newName, gender: newGender } : s)
          }))
      }));
      try {
        await setDoc(doc(db, 'config', 'grades'), { data: updatedGrades });
      } catch (error) {
        console.error("Error editing student:", error);
      }
  }, [grades, isAuthReady]);

  const handleImportStudents = useCallback(async (students: {name: string, gender: Gender}[]) => {
      if (!selectedClass || !isAuthReady) return;
      const newStudents = students.map((s, i) => ({ id: Date.now() + i, name: s.name, gender: s.gender }));
      const updatedGrades = grades.map(g => {
        if (g.id === selectedGradeId) {
            return {
                ...g,
                classes: g.classes.map(c => {
                    if (c.id === selectedClassId) {
                        return { ...c, students: [...c.students, ...newStudents] };
                    }
                    return c;
                })
            };
        }
        return g;
    });
    try {
      await setDoc(doc(db, 'config', 'grades'), { data: updatedGrades });
      setShowImportStudents(false);
    } catch (error) {
      console.error("Error importing students:", error);
    }
  }, [grades, selectedGradeId, selectedClassId, selectedClass, isAuthReady]);

  const handleAddClass = useCallback(async (name: string) => {
      if (!isAuthReady) return;
      const updatedGrades = grades.map(g => {
          if (g.id === selectedGradeId) {
              return {
                  ...g,
                  classes: [...g.classes, { id: Date.now(), name, students: [] }]
              };
          }
          return g;
      });
      try {
        await setDoc(doc(db, 'config', 'grades'), { data: updatedGrades });
      } catch (error) {
        console.error("Error adding class:", error);
      }
  }, [grades, selectedGradeId, isAuthReady]);

  const handleEditClass = useCallback(async (classId: number, newName: string) => {
      if (!isAuthReady) return;
      const updatedGrades = grades.map(g => ({
          ...g,
          classes: g.classes.map(c => c.id === classId ? { ...c, name: newName } : c)
      }));
      try {
        await setDoc(doc(db, 'config', 'grades'), { data: updatedGrades });
      } catch (error) {
        console.error("Error editing class:", error);
      }
  }, [grades, isAuthReady]);

  const handleDeleteClass = useCallback(async (classId: number) => {
      if (!isAuthReady) return;
      const updatedGrades = grades.map(g => ({
          ...g,
          classes: g.classes.filter(c => c.id !== classId)
      }));
      try {
        await setDoc(doc(db, 'config', 'grades'), { data: updatedGrades });
      } catch (error) {
        console.error("Error deleting class:", error);
      }
  }, [grades, isAuthReady]);

  const handleImportClass = useCallback(async (gradeId: number, className: string, students: {name: string, gender: Gender}[]) => {
      if (!isAuthReady) return;
      const newStudents = students.map((s, i) => ({ id: Date.now() + i, name: s.name, gender: s.gender }));
      const updatedGrades = grades.map(g => {
          if (g.id === gradeId) {
              return {
                  ...g,
                  classes: [...g.classes, { id: Date.now(), name: className, students: newStudents }]
              };
          }
          return g;
      });
      try {
        await setDoc(doc(db, 'config', 'grades'), { data: updatedGrades });
        setShowImportClass(false);
      } catch (error) {
        console.error("Error importing class:", error);
      }
  }, [grades, isAuthReady]);

  const handleUserSwitchRequest = (userId: number) => {
      const targetUser = users.find(u => u.id === userId);
      if (targetUser?.role === 'admin') {
          setPendingUserId(userId);
          setShowAdminAuth(true);
      } else {
          setCurrentUserId(userId);
      }
  };

  const handleAdminAuthSuccess = () => {
      if (pendingUserId) setCurrentUserId(pendingUserId);
      setShowAdminAuth(false);
      setPendingUserId(null);
  };

  const handleAddUser = async (user: Omit<User, 'id'>) => {
      if (!isAuthReady) return;
      const newUser = { ...user, id: Date.now() };
      const updatedUsers = [...users, newUser];
      try {
        await setDoc(doc(db, 'config', 'users'), { data: updatedUsers });
      } catch (error) {
        console.error("Error adding user:", error);
      }
  };

  const handleEditUser = async (user: User) => {
      if (!isAuthReady) return;
      const updatedUsers = users.map(u => u.id === user.id ? user : u);
      try {
        await setDoc(doc(db, 'config', 'users'), { data: updatedUsers });
      } catch (error) {
        console.error("Error editing user:", error);
      }
  };

  const handleDeleteUser = async (userId: number) => {
      if (userId === currentUserId) {
          alert(t('cannotDeleteCurrentUser'));
          return;
      }
      if (!isAuthReady) return;
      const updatedUsers = users.filter(u => u.id !== userId);
      try {
        await setDoc(doc(db, 'config', 'users'), { data: updatedUsers });
      } catch (error) {
        console.error("Error deleting user:", error);
      }
  };

  const handleAddCustomStatus = async (name: string) => {
      if (!customStatuses.includes(name) && isAuthReady) {
          const updatedStatuses = [...customStatuses, name];
          try {
            await setDoc(doc(db, 'config', 'statuses'), { data: updatedStatuses });
          } catch (error) {
            console.error("Error adding custom status:", error);
          }
      }
      setShowManageStatuses(false);
  };

  const handleDeleteCustomStatus = async (name: string) => {
      if (!isAuthReady) return;
      const updatedStatuses = customStatuses.filter(s => s !== name);
      try {
        await setDoc(doc(db, 'config', 'statuses'), { data: updatedStatuses });
      } catch (error) {
        console.error("Error deleting custom status:", error);
      }
  };

  const handleImportReport = (data: any) => {
      if (!data.date || !data.attendance || !data.submission) {
          alert(t('importError'));
          return;
      }
      setAttendance(prev => {
          const dateRecords = prev[data.date] || {};
          return {
              ...prev,
              [data.date]: {
                  ...dateRecords,
                  ...data.attendance
              }
          };
      });
      if (data.classId) {
          setSubmissions(prev => ({
              ...prev,
              [data.date]: {
                  ...(prev[data.date] || {}),
                  [data.classId]: data.submission
              }
          }));
      }
      alert(t('importSuccess'));
  };

  const handleImportStudentsFromBilimClass = useCallback((newStudents: Student[]) => {
    if (!selectedClass) return;
    
    const updatedGrades = grades.map(g => {
      if (g.id === selectedGradeId) {
        return {
          ...g,
          classes: g.classes.map(c => {
            if (c.id === selectedClassId) {
              // Avoid duplicates by name (simple check for mock)
              const existingNames = new Set(c.students.map(s => s.name));
              const uniqueNewStudents = newStudents.filter(s => !existingNames.has(s.name));
              return { ...c, students: [...c.students, ...uniqueNewStudents] };
            }
            return c;
          })
        };
      }
      return g;
    });
    setGrades(updatedGrades);
  }, [grades, selectedGradeId, selectedClassId, selectedClass, setGrades]);

  const handleBilimClassSyncComplete = () => {
    // Optionally trigger common confirm logic or just update local state
    console.log('BilimClass Sync Complete');
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  const handleLogout = () => {
    setCurrentUserId(0);
  };

  return (
    <div className="min-h-screen flex flex-col bg-green-50 dark:bg-emerald-950 transition-colors duration-300">
      <Header 
        onShowReportingDashboard={() => setShowReportingDashboard(true)}
        onShowManageStudents={() => setShowManageStudents(true)}
        onShowManageClasses={() => setShowManageClasses(true)}
        onShowManageUsers={() => setShowManageUsers(true)}
        onShowManageStatuses={() => setShowManageStatuses(true)}
        onShowBilimClassSync={() => setShowBilimClassSync(true)}
        onShowAIAssistant={() => setShowAIAssistant(true)}
        isUserAdmin={isUserAdmin}
        isUserViewer={isUserViewer}
        currentUser={currentUser}
        onLogout={handleLogout}
      />
      <UserSwitcher users={users} currentUser={currentUser} onUserChange={handleUserSwitchRequest} />
      <main className="flex-grow container mx-auto px-4 py-8 md:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between border border-green-100 dark:border-emerald-900/50">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('grade')}</label>
                    <select
                        value={selectedGradeId}
                        onChange={(e) => setSelectedGradeId(Number(e.target.value))}
                        className="bg-green-50/30 dark:bg-gray-700 border border-green-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 transition shadow-sm"
                    >
                        <option value={0} disabled>{t('grade')}</option>
                        {visibleGrades.map((grade) => (
                            <option key={grade.id} value={grade.id}>{grade.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('class')}</label>
                    <select
                        value={selectedClassId}
                        onChange={(e) => setSelectedClassId(Number(e.target.value))}
                        disabled={!selectedGradeId}
                        className="bg-green-50/30 dark:bg-gray-700 border border-green-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 transition shadow-sm disabled:opacity-50"
                    >
                        <option value={0} disabled>{t('class')}</option>
                        {availableClasses.map((cls) => (
                            <option key={cls.id} value={cls.id}>{cls.name}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">{t('date')}</label>
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="bg-green-50/30 dark:bg-gray-700 border border-green-200 dark:border-gray-600 text-gray-900 dark:text-white rounded-lg p-2.5 focus:ring-2 focus:ring-green-500 transition shadow-sm"
                    />
                </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end">
                {selectedClass && (
                    <button 
                        onClick={() => setShowAIAssistant(true)} 
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-lg hover:from-emerald-600 hover:to-teal-600 shadow-md transition font-black text-sm flex items-center gap-2 animate-pulse"
                        title={t('aiAssistant')}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        {t('aiAssistant')}
                    </button>
                )}
                {isUserAdmin && (
                    <>
                        <button onClick={() => setShowManageUsers(true)} className="px-4 py-2 bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300 rounded-lg hover:bg-purple-200 transition font-medium text-sm flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                            {t('manageUsers')}
                        </button>
                        <button onClick={() => setShowManageClasses(true)} className="px-4 py-2 bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 transition font-medium text-sm flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                            {t('manageClasses')}
                        </button>
                        <button onClick={() => setShowImportClass(true)} className="px-4 py-2 bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 rounded-lg hover:bg-blue-200 transition font-medium text-sm flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            {t('importClass')}
                        </button>
                    </>
                )}
                {!isUserViewer && (
                    <button onClick={() => setShowManageStatuses(true)} className="px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 rounded-lg hover:bg-emerald-200 transition font-medium text-sm flex items-center gap-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
                        {t('manageStatuses')}
                    </button>
                )}
                <button onClick={() => setShowReportingDashboard(true)} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 shadow-md transition font-bold text-sm flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                    {t('reports')}
                </button>
            </div>
        </div>
        {selectedClass ? (
            <div id="class-report-content" className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-green-200 dark:border-emerald-800/50 overflow-hidden animate-fade-in-up">
                <div className="bg-emerald-50/50 dark:bg-emerald-950/40 p-4 border-b border-green-100 dark:border-emerald-900/50 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                            <span className="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 px-3 py-1 rounded-full text-sm">{selectedClass.name}</span>
                            <span className="text-gray-400">|</span>
                            <span>{t('attendanceTaking')}</span>
                        </h2>
                    </div>
                    <div className="flex items-center gap-3">
                        {canManageStudents && (
                            <>
                                <button onClick={() => setShowAddStudent(true)} className="p-2 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-lg transition" title={t('addStudent')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
                                </button>
                                <button onClick={() => setShowImportStudents(true)} className="p-2 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-lg transition" title={t('importStudents')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                </button>
                                <button onClick={() => setShowManageStudents(true)} className="p-2 text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-gray-700 rounded-lg transition" title={t('edit')}>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                </button>
                            </>
                        )}
                        <div className="flex flex-col flex-grow md:flex-grow-0 md:w-64">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter ml-1 mb-0.5">{t('search')}</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder={t('studentNamePlaceholder')}
                                    className="w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-2 focus:ring-emerald-500 transition shadow-sm h-9"
                                />
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter ml-1 mb-0.5">{t('sortBy')}</label>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as SortByType)} className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-sm rounded-lg p-2 focus:ring-2 focus:ring-emerald-500 transition shadow-sm h-9">
                                <option value="name">{t('name')}</option>
                                <option value="gender">{t('gender')}</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto">
                    {filteredStudents.length > 0 ? (
                        <>
                            <div className="px-6 py-3 bg-emerald-50/20 dark:bg-gray-800 border-b border-green-100 dark:border-emerald-900/50 flex items-center justify-between font-semibold text-xs text-emerald-600 dark:text-emerald-400 uppercase tracking-wider sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center mr-2">
                                        <input type="checkbox" checked={filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length} onChange={handleSelectAll} className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 dark:bg-gray-700 cursor-pointer" />
                                    </div>
                                    <span className="w-8 text-center">#</span>
                                    <span>{t('student')}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="mr-24">{t('status')}</span>
                                    <div className="flex items-center gap-2">
                                    <button 
                                        onClick={() => setShowConfirmModal(true)}
                                        disabled={isUserViewer}
                                        className={`flex items-center justify-center gap-2 px-6 py-2 rounded-lg shadow-lg text-white font-black transition-all duration-300 active:scale-95 border-b-4 h-11 min-w-[140px]
                                            ${isUserViewer ? 'bg-gray-400 border-gray-500 cursor-not-allowed opacity-50' : isSubmitted 
                                                ? 'bg-red-600 hover:bg-red-700 border-red-800 ring-2 ring-red-400 ring-offset-2 dark:ring-offset-gray-900' 
                                                : 'bg-emerald-600 hover:bg-emerald-700 border-emerald-800'
                                            }`}
                                    >
                                        {isSubmitted ? (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                {t('submitted')}
                                            </>
                                        ) : (
                                            <>
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
                                                {t('sendReport')}
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
                                {filteredStudents.map((student, index) => (
                                    <StudentRow
                                        key={student.id}
                                        index={index + 1}
                                        student={student}
                                        attendanceDetail={attendance[selectedDate]?.[student.id]}
                                        onStatusChange={handleStatusChange}
                                        availableStatuses={availableStatuses}
                                        onAddNewStatusRequest={() => setShowManageStatuses(true)}
                                        onHistoryClick={setHistoryStudent}
                                        isSelected={selectedStudentIds.has(student.id)}
                                        onToggleSelect={handleToggleStudentSelection}
                                    />
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="p-12 text-center text-gray-500 dark:text-gray-400 italic">
                            {t('noStudentsInClass')}
                        </div>
                    )}
                </div>
            </div>
        ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mb-6 animate-fade-in-scale">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">{t('selectClassToStart')}</h2>
            </div>
        )}
      </main>

      {showReportingDashboard && (
        <ReportingDashboardModal 
            grades={grades} 
            attendance={attendance} 
            submissions={submissions}
            users={users}
            onClose={() => setShowReportingDashboard(false)} 
            currentUser={currentUser}
            availableStatuses={availableStatuses}
            initialDate={selectedDate}
            onImportReport={handleImportReport}
        />
      )}
      {selectedClass && showManageStudents && (
        <ManageStudentsModal students={selectedClass.students} onClose={() => setShowManageStudents(false)} onRemoveStudent={handleRemoveStudent} onEditStudent={handleEditStudent} />
      )}
      {showAddStudent && <AddStudentModal onClose={() => setShowAddStudent(false)} onAddStudent={handleAddStudent} />}
      {showManageClasses && <ManageClassesModal classes={availableClasses} onClose={() => setShowManageClasses(false)} onAddClass={handleAddClass} onEditClass={handleEditClass} onDeleteClass={handleDeleteClass} />}
      {showImportStudents && <ImportStudentsModal onClose={() => setShowImportStudents(false)} onImport={handleImportStudents} />}
      {showImportClass && <ImportClassModal grades={grades} onClose={() => setShowImportClass(false)} onImport={handleImportClass} />}
      {showManageUsers && <ManageUsersModal users={users} grades={grades} onClose={() => setShowManageUsers(false)} onAddUser={handleAddUser} onEditUser={handleEditUser} onDeleteUser={handleDeleteUser} />}
      {showAdminAuth && <AdminAuthModal onClose={() => { setShowAdminAuth(false); setPendingUserId(null); }} onSuccess={handleAdminAuthSuccess} />}
      {historyStudent && <StudentHistoryModal student={historyStudent} attendance={attendance} onClose={() => setHistoryStudent(null)} />}
      {showManageStatuses && <ManageStatusesModal statuses={customStatuses} onClose={() => setShowManageStatuses(false)} onAdd={handleAddCustomStatus} onDelete={handleDeleteCustomStatus} />}
      {showBilimClassSync && <BilimClassSyncModal selectedClass={selectedClass} attendanceData={attendance[selectedDate]} onClose={() => setShowBilimClassSync(false)} onSyncComplete={handleBilimClassSyncComplete} onImportStudents={handleImportStudentsFromBilimClass} />}
      {showAIAssistant && selectedClass && <AIAssistantModal selectedClass={selectedClass} attendanceData={attendance[selectedDate] || {}} selectedDate={selectedDate} onClose={() => setShowAIAssistant(false)} />}
      
      {/* Custom Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in" onClick={() => setShowConfirmModal(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                {isSubmitted ? t('resubmitPrompt') : t('confirmAllPrompt')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {isSubmitted ? t('resubmitTooltip') : t('confirmAllTooltip')}
              </p>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirmModal(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-200 transition">
                  {t('cancel')}
                </button>
                <button onClick={handleConfirmAll} className="flex-1 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-lg transition active:scale-95">
                  {isSubmitted ? t('export') : t('sendReport')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[70] animate-fade-in-up">
          <div className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border-2 border-emerald-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            <span className="font-bold">{t('reportSubmitted')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
