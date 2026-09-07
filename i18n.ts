
import React, { createContext, useContext, useState, useMemo, useCallback } from 'react';

export type Locale = 'ru' | 'kk';

export const STATUS_KEYS = {
  PRESENT: 'PRESENT',
  LATE: 'LATE',
  ABSENT_ILLNESS: 'ABSENT_ILLNESS',
  ABSENT_VALID: 'ABSENT_VALID',
  ABSENT_UNEXCUSED: 'ABSENT_UNEXCUSED',
  // New statuses
  ABSENT_ORDER: 'ABSENT_ORDER',
  ABSENT_PARENTAL: 'ABSENT_PARENTAL',
  ABSENT_COMPETITION: 'ABSENT_COMPETITION',
};

type Translations = { [key: string]: { [key in Locale]: string } | { [key: string]: { [key in Locale]: string } } };

const translations: Translations = {
  // AI Assistant
  aiAssistant: { ru: 'ИИ Ассистент', kk: 'ИИ Ассистент' },
  aiAnalyze: { ru: 'Анализировать данные', kk: 'Мәліметтерді талдау' },
  aiDraftMessage: { ru: 'Составить сообщение родителям', kk: 'Ата-анаға хабарлама дайындау' },
  aiSummary: { ru: 'Краткий вывод ИИ', kk: 'ИИ қысқаша қорытындысы' },
  aiThinking: { ru: 'ИИ думает...', kk: 'ИИ ойлануда...' },
  aiInsightsTitle: { ru: 'Анализ посещаемости от ИИ', kk: 'ИИ-ден қатысу талдауы' },
  aiPromptInstruction: { 
    ru: 'Ты - помощник учителя. Проанализируй данные о посещаемости класса и дай краткие советы или заметь тренды.', 
    kk: 'Сен - мұғалімнің көмекшісісің. Сыныптың қатысу мәліметтерін талдап, қысқаша кеңестер бер немесе трендтерді анықта.' 
  },

  // BilimClass Integration
  bilimClassSync: { ru: 'Синхронизация с BilimClass', kk: 'BilimClass-пен синхрондау' },
  bilimClassConnect: { ru: 'Подключить BilimClass', kk: 'BilimClass-қа қосылу' },
  bilimClassLogin: { ru: 'Логин BilimClass', kk: 'BilimClass логині' },
  bilimClassPassword: { ru: 'Пароль', kk: 'Құпия сөз' },
  bilimClassSyncNow: { ru: 'Синхронизировать сейчас', kk: 'Қазір синхрондау' },
  bilimClassImportStudents: { ru: 'Загрузить учеников из BilimClass', kk: 'BilimClass-тан оқушыларды жүктеу' },
  bilimClassStatusConnected: { ru: 'Подключено к BilimClass.kz', kk: 'BilimClass.kz жүйесіне қосылған' },
  bilimClassStatusDisconnected: { ru: 'Нет связи with BilimClass', kk: 'BilimClass байланысы жоқ' },
  bilimClassSyncSuccess: { ru: 'Данные успешно переданы в BilimClass.kz!', kk: 'Мәліметтер BilimClass.kz жүйесіне сәтті жіберілді!' },
  bilimClassSyncError: { ru: 'Ошибка синхронизации. Проверьте соединение.', kk: 'Синхрондау қатесі. Байланысты тексеріңіз.' },

  // Status Labels
  status_PRESENT: { ru: 'Присутствует', kk: 'Қатысады' },
  status_LATE: { ru: 'Опоздал', kk: 'Кешікті' },
  status_ABSENT_ILLNESS: { ru: 'Отсутствует (Болезнь)', kk: 'Жоқ (Ауырды)' },
  status_ABSENT_VALID: { ru: 'Отсутствует (Уваж. причина)', kk: 'Жоқ (Себепті)' },
  status_ABSENT_UNEXCUSED: { ru: 'Отсутствует (Без причины)', kk: 'Жоқ (Себепсіз)' },
  status_ABSENT_ORDER: { ru: 'По приказу', kk: 'Бұйрық бойынша' },
  status_ABSENT_PARENTAL: { ru: 'По заявлению', kk: 'Ата-ана өтініші' },
  status_ABSENT_COMPETITION: { ru: 'На соревнованиях', kk: 'Жарыстарда' },

  // Short labels for reports
  absentOrderShort: { ru: 'Приказ', kk: 'Бұйрық' },
  absentParentalShort: { ru: 'Заявление', kk: 'Өтініш' },
  absentCompetitionShort: { ru: 'Соревн.', kk: 'Жарыс' },
  absentIllnessShort: { ru: 'Болезнь', kk: 'Ауырды' },
  absentValidShort: { ru: 'Уваж.', kk: 'Себепті' },
  absentUnexcusedShort: { ru: 'Б/п', kk: 'Себепсіз' },
  present: { ru: 'Присутствует', kk: 'Қатысады' },
  late: { ru: 'Опоздал', kk: 'Кешікті' },
  other: { ru: 'Другое', kk: 'Басқа' },

  search: { ru: 'Поиск', kk: 'Іздеу' },
  // Header
  attendanceJournal: { ru: 'Журнал посещаемости iBaqyla', kk: 'iBaqyla сабаққа қатысу журналы' },
  // App
  attendanceTaking: { ru: 'Отметка посещаемости', kk: 'Сабаққа қатысуды белгілеу' },
  attendanceTakingDescription: { ru: 'Выберите параллель, класс, дату and отметьте статус каждого ученика.', kk: 'Параллельді, сыныпты, күнді таңдап, әр оқушының статусын белгілеңіз.' },
  date: { ru: 'Дата', kk: 'Күні' },
  grade: { ru: 'Параллель', kk: 'Параллель' },
  class: { ru: 'Класс', kk: 'Сынып' },
  classTeacher: { ru: 'Классный руководитель', kk: 'Сынып жетекшісі' },
  noTeacherAssigned: { ru: 'Не назначен', kk: 'Тағайындалмаған' },
  student: { ru: 'Ученик', kk: 'Оқушы' },
  note: { ru: 'Примечание', kk: 'Ескертпе' },
  status: { ru: 'Статус', kk: 'Статусы' },
  sortBy: { ru: 'Сортировка', kk: 'Сұрыптау' },
  name: { ru: 'Имя', kk: 'Аты' },
  gender: { ru: 'Пол', kk: 'Жынысы' },
  submitted: { ru: 'ОТПРАВЛЕНО', kk: 'ЖІБЕРІЛДІ' },
  sendReport: { ru: 'ОТПРАВИТЬ', kk: 'ЖІБЕРУ' },
  notSubmitted: { ru: 'Не отправлено', kk: 'Жіберілмеді' },
  
  // Controls
  importStudents: { ru: 'Импорт списка', kk: 'Тізімді импорттау' },
  importClass: { ru: 'Импорт класса', kk: 'Сыныпты импорттау' },
  addStudent: { ru: 'Добавить', kk: 'Қосу' },
  manageClasses: { ru: 'Управление классами', kk: 'Сыныптарды басқару' },
  exportClassList: { ru: 'Экспорт списка', kk: 'Тізімді экспорттау' },
  classListFileName: { ru: 'Список_класса', kk: 'Сынып_тізімі' },
  edit: { ru: 'Ред.', kk: 'Өңдеу' },
  confirmAllTooltip: { ru: 'Сохранить и отправить отчет', kk: 'Сақтау және есепті жіберу' },
  resubmitTooltip: { ru: 'Отчет отправлен.', kk: 'Есеп жіберілді.' },
  confirmAllPrompt: { ru: 'Отправить отчет?', kk: 'Есепті жіберу керек пе?' },
  resubmitPrompt: { ru: 'Отправить отчет снова?', kk: 'Есепті қайта жіберу керек пе?' },
  reports: { ru: 'Отчеты', kk: 'Есептер' },
  selectClassToStart: { ru: 'Выберите класс, чтобы начать', kk: 'Бастау үшін сыныпты таңдаңыз' },
  noClassesAssigned: { ru: 'Вам не назначены классы', kk: 'Сізге сыныптар тағайындалмаған' },
  noStudentsInClass: { ru: 'В этом классе пока нет учеников.', kk: 'Бұл сыныпта әзірге оқушылар жоқ.' },
  youCanAddStudents: { ru: 'Вы можете добавить их вручную или импортировать список.', kk: 'Сіз оларды қолмен қоса аласыз немесе тізімді импорттай аласыз.' },
  
  // Bulk Actions
  selected: { ru: 'Выбрано', kk: 'Таңдалды' },
  applyToSelected: { ru: 'Применить к выбранным', kk: 'Таңдалғандарға қолдану' },
  selectAll: { ru: 'Выбрать всех', kk: 'Барлығын таңдау' },
  deselectAll: { ru: 'Снять выделение', kk: 'Таңдауды алып тастау' },

  // Student Row
  history: { ru: 'История', kk: 'Тарихы' },
  addNewStatusOption: { ru: '+ Настроить статусы', kk: '+ Статустарды баптау' },
  
  // Modals generic
  cancel: { ru: 'Отмена', kk: 'Болдырмау' },
  add: { ru: 'Добавить', kk: 'Қосу' },
  save: { ru: 'Сохранить', kk: 'Сақтау' },
  done: { ru: 'Готово', kk: 'Дайын' },
  close: { ru: 'Закрыть', kk: 'Жабу' },
  deleteClassConfirmation: { ru: 'Вы уверены, что хотите удалить "{className}"? Это действие нельзя отменить.', kk: 'Сіз "{className}" жойғыңыз келетініне сенімдісіз бе? Бұл әрекетті қайтару мүмкін емес.' },
  
  // Add Student
  studentFullName: { ru: 'ФИО Ученика', kk: 'Оқушының аты-жөні' },
  studentNamePlaceholder: { ru: 'Введите имя', kk: 'Атын енгізіңіз' },
  genderMale: { ru: 'Мужской', kk: 'Ер жынысы' },
  genderFemale: { ru: 'Женский', kk: 'Әйел жынысы' },
  genderMaleShort: { ru: 'М', kk: 'Е' },
  genderFemaleShort: { ru: 'Ж', kk: 'Ә' },
  
  // Manage Users
  manageUsers: { ru: 'Управление пользователями', kk: 'Пайдаланушыларды басқару' },
  newUserFullName: { ru: 'ФИО пользователя', kk: 'Пайдаланушының аты-жөні' },
  role: { ru: 'Роль', kk: 'Рөлі' },
  roleTeacher: { ru: 'Учитель', kk: 'Мұғалім' },
  roleAdmin: { ru: 'Администратор', kk: 'Әкімші' },
  roleViewer: { ru: 'Наблюдатель (Только отчеты)', kk: 'Бақылаушы (Тек есептер)' },
  currentUser: { ru: 'Текущий пользователь', kk: 'Ағымдағы пайдаланушы' },
  switchUser: { ru: 'Сменить пользователя', kk: 'Пайдаланушыны ауыстыру' },
  cannotDeleteCurrentUser: { ru: 'Нельзя удалить текущего пользователя', kk: 'Ағымдағы пайдаланушыны жою мүмкін емес' },
  editing: { ru: 'Редактирование', kk: 'Өңдеу' },
  fullName: { ru: 'ФИО', kk: 'Аты-жөні' },
  assignedClasses: { ru: 'Назначенные классы', kk: 'Тағайындалған сыныптар' },
  adminAuthTitle: { ru: 'Вход администратора', kk: 'Әкімшіге кіру' },
  enterAdminCode: { ru: 'Введите код доступа (0000)', kk: 'Кіру кодын енгізіңіз (0000)' },
  wrongCode: { ru: 'Неверный код', kk: 'Қате код' },
  login: { ru: 'Войти', kk: 'Кіру' },

  // Manage Classes / Import
  newClassNamePlaceholder: { ru: 'Название (например, 5 Б)', kk: 'Атауы (мысалы, 5 Б)' },
  noClassesInGrade: { ru: 'В этой параллели нет классов.', kk: 'Бұл параллельде сыныптар жоқ.' },
  importTitle: { ru: 'Импорт учеников', kk: 'Оқушыларды импорттау' },
  importInstructions: { ru: 'Вставьте список имен, каждое с новой строки.', kk: 'Есімдер тізімін әрқайсысын жаңа жолдан бастап қойыңыз.' },
  pasteNamesHere: { ru: 'Иванов Иван\nПетров Петр...', kk: 'Иванов Иван\nПетров Петр...' },
  count: { ru: 'строк', kk: 'жол' },
  import: { ru: 'Импортировать', kk: 'Импорттау' },
  importClassTitle: { ru: 'Создать класс и импортировать', kk: 'Сынып құру және импорттау' },
  className: { ru: 'Название класса', kk: 'Сынып атауы' },
  classNamePlaceholder: { ru: '5 Б', kk: '5 Б' },
  pasteStudentList: { ru: 'Список учеников', kk: 'Оқушылар тізімі' },
  createAndImport: { ru: 'Создать и импортировать', kk: 'Құру және импорттау' },
  importExcel: { ru: 'Импорт из Excel', kk: 'Excel-ден импорттау' },
  selectExcelFile: { ru: 'Выберите Excel файл', kk: 'Excel файлын таңдаңыз' },
  excelImportError: { ru: 'Ошибка при чтении Excel файла', kk: 'Excel файлын оқу кезінде қате' },
  excelTemplateInfo: { ru: 'Файл должен содержать список имен в первой колонке.', kk: 'Файлдың бірінші бағанында есімдер тізімі болуы керек.' },
  
  // Add Status
  addNewStatusTitle: { ru: 'Добавить новый статус', kk: 'Жаңа статус қосу' },
  statusName: { ru: 'Название статуса', kk: 'Статус атауы' },
  statusNamePlaceholder: { ru: 'Например: У врача', kk: 'Мысалы: Дәрігерде' },
  
  // Manage Statuses
  manageStatuses: { ru: 'Настроить статусы', kk: 'Статустарды баптау' },
  deleteStatusConfirm: { ru: 'Удалить статус "{status}"?', kk: '"{status}" статусын жою керек пе?' },
  noCustomStatuses: { ru: 'Нет пользовательских статусов', kk: 'Пайдаланушы статустары жоқ' },

  // Reporting
  attendanceReports: { ru: 'Отчеты посещаемости', kk: 'Қатысу есептері' },
  tabStats: { ru: 'Статистика', kk: 'Статистика' },
  tabActivity: { ru: 'Активность учителей', kk: 'Мұғалімдер белсенділігі' },
  reportType: { ru: 'Тип отчета', kk: 'Есеп түрі' },
  day: { ru: 'День', kk: 'Күн' },
  week: { ru: 'Неделя', kk: 'Апта' },
  month: { ru: 'Месяц', kk: 'Ай' },
  custom: { ru: 'Период', kk: 'Кезең' },
  startDate: { ru: 'С', kk: 'Бастап' },
  endDate: { ru: 'По', kk: 'Дейін' },
  allGrades: { ru: 'Все параллели', kk: 'Барлық параллельдер' },
  allClasses: { ru: 'Все классы', kk: 'Барлық сыныптар' },
  attendanceReportTitle: { ru: 'Отчет по посещаемости', kk: 'Қатысу бойынша есеп' },
  reportDate: { ru: 'Дата отчета', kk: 'Есеп күні' },
  totalRecords: { ru: 'Всего записей', kk: 'Барлық жазбалар' },
  statsCount: { ru: 'Кол-во', kk: 'Саны' },
  percentage: { ru: '%', kk: '%' },
  summarySheet: { ru: 'Сводка', kk: 'Жиынтық' },
  detailedReportSheet: { ru: 'Детали', kk: 'Толығырақ' },
  reportFileName: { ru: 'Отчет_Посещаемости', kk: 'Қатысу_Есебі' },
  export: { ru: 'Экспорт', kk: 'Экспорт' },
  exportToExcel: { ru: 'Скачать Excel', kk: 'Excel жүктеп алу' },
  exportToCsv: { ru: 'Скачать CSV', kk: 'CSV жүктеп алу' },
  exportToPdf: { ru: 'Скачать PDF', kk: 'PDF жүктеп алу' },
  exportErrorXlsxNotFound: { ru: 'Ошибка: Библиотека XLSX не найдена', kk: 'Қате: XLSX кітапханасы табылмады' },
  exportErrorLibsNotFound: { ru: 'Ошибка: Библиотеки PDF не найдены', kk: 'Қате: PDF кітапханалары табылмады' },
  pdfCreationError: { ru: 'Ошибка при создании PDF', kk: 'PDF жасау кезіндегі қате' },
  list: { ru: 'Список', kk: 'Тізім' },
  listFilter: { ru: 'Фильтр списка', kk: 'Тізім сүзгісі' },
  absentAll: { ru: 'Только отсутствующие', kk: 'Тек жоқтар' },
  all: { ru: 'Все', kk: 'Барлығы' },
  noStudentsMatchFilter: { ru: 'Нет записей, соответствующих фильтру', kk: 'Сүзгіге сәйкес жазбалар жоқ' },
  visualization: { ru: 'Визуализация', kk: 'Визуализация' },
  
  // Teacher Activity Report
  teacherActivityTitle: { ru: 'Отчет активности учителей', kk: 'Мұғалімдер белсенділігі есебі' },
  submissionTime: { ru: 'Время отправки', kk: 'Жіберу уақыты' },
  period: { ru: 'Период', kk: 'Кезең' },
  studentCount: { ru: 'Количество учеников', kk: 'Оқушылар саны' },
  category: { ru: 'Категория', kk: 'Санат' },
  
  // File Sync
  importReport: { ru: '📥 Загрузить отчет учителя', kk: '📥 Мұғалім есебін жүктеу' },
  reportDownloaded: { ru: 'Отчет скачан!', kk: 'Есеп жүктелді!' },
  reportSubmitted: { ru: 'Отчет успешно отправлен!', kk: 'Есеп сәтті жіберілді!' },
  importSuccess: { ru: 'Отчет успешно загружен и объединен!', kk: 'Есеп сәтті жүктелді және біріктірілді!' },
  importError: { ru: 'Ошибка при загрузке файла.', kk: 'Файлды жүктеу кезінде қате.' },
  
  // History Modal
  noAttendanceRecords: { ru: 'Нет записей о посещаемости', kk: 'Қатысу жазбалары жоқ' },
};

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: { [key: string]: string | number }) => string;
  statusKeys: typeof STATUS_KEYS;
  getStatusLabel: (key: string) => string;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export const LocaleProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('ru');

  const t = useCallback((key: string, params?: { [key: string]: string | number }): string => {
    const translation = translations[key];
    if (!translation) return key;
    
    let text = (translation as any)[locale] || key;
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        text = text.replace(`{${paramKey}}`, String(paramValue));
      });
    }
    
    return text;
  }, [locale]);

  const getStatusLabel = useCallback((key: string): string => {
    // Check if it's a known key in translations first
    const translationKey = `status_${key}`;
    if (translations[translationKey]) {
        return (translations[translationKey] as any)[locale];
    }
    // If not standard, return key (for custom statuses)
    return key;
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    setLocale,
    t,
    statusKeys: STATUS_KEYS,
    getStatusLabel
  }), [locale, t, getStatusLabel]);

  return React.createElement(
    LocaleContext.Provider,
    { value },
    children
  );
};

export const useLocale = () => {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
};
