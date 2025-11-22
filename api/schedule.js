/**
 * API для работы с расписанием Московского Политехнического
 * Парсинг расписания с сайта rasp.dmami.ru
 *
 * ⚠️ CORS проблема в веб-версии:
 * - В браузере будет ошибка CORS
 * - Решение 1: Запустите прокси: node cors-proxy.js
 * - Решение 2: Используйте на реальном устройстве (npm run android/ios)
 * - Решение 3: Установите расширение CORS Unblock в браузер
 */

// Для веб-версии используем прокси (если запущен)
// Для мобильной версии используем прямой URL
const USE_PROXY = typeof window !== 'undefined' && window.location.hostname === 'localhost';
const PROXY_URL = 'http://localhost:3001';
const DIRECT_URL = 'https://rasp.dmami.ru/site/group';
const BASE_URL = USE_PROXY ? PROXY_URL : DIRECT_URL;

/**
 * Получение расписания группы с сайта университета
 * @param {string} groupNumber - Номер группы (например: "231-324" или "151-331")
 * @returns {Promise<Object>} Объект с расписанием
 */
export const fetchScheduleFromUniversity = async (groupNumber) => {
    if (!groupNumber || !groupNumber.trim()) {
        throw new Error('Не указан номер группы');
    }

    const url = `${BASE_URL}?group=${groupNumber}&session=0`;

    console.log(`📡 Используется: ${USE_PROXY ? 'прокси-сервер' : 'прямое подключение'}`);

    try {
        // Если используем прокси, делаем простой запрос
        if (USE_PROXY) {
            console.log(`🔄 Запрос через прокси: ${url}`);
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Прокси вернул ошибку: ${response.status}. Убедитесь, что прокси запущен (node cors-proxy.js)`);
            }

            const data = await response.json();
            return data;
        }

        // Прямой запрос (для мобильной версии)
        // Первый запрос - получаем cookie
        const firstResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': `https://rasp.dmami.ru/?${groupNumber}`,
            },
        });

        // Получаем cookie из заголовков
        const cookies = firstResponse.headers.get('set-cookie');
        let cookieValue = '';
        if (cookies) {
            cookieValue = cookies.split(';')[0];
        }

        // Пытаемся распарсить первый ответ
        const firstText = await firstResponse.text();
        try {
            const firstData = JSON.parse(firstText);
            if (firstData && typeof firstData === 'object') {
                return firstData;
            }
        } catch {
            // Не JSON, продолжаем со вторым запросом
        }

        // Второй запрос с cookie
        const secondResponse = await fetch(url, {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Referer': url,
                'Cookie': cookieValue,
            },
        });

        const scheduleData = await secondResponse.json();
        return scheduleData;

    } catch (error) {
        console.error('❌ Ошибка получения расписания:', error);

        // Если CORS ошибка, даем подсказку
        if (error.message.includes('Failed to fetch') || error.message.includes('CORS')) {
            throw new Error('CORS ошибка. Запустите прокси-сервер: node cors-proxy.js (см. инструкцию в README)');
        }

        throw new Error('Не удалось загрузить расписание. Проверьте номер группы и интернет-соединение.');
    }
};

// Стандартное расписание звонков для университета
const LESSON_TIMES = {
    1: '09:00-10:30',
    2: '10:40-12:10',
    3: '12:20-13:50',
    4: '14:30-16:00',
    5: '16:10-17:40',
    6: '17:50-19:20',
    7: '19:30-21:00',
};

/**
 * Парсинг расписания в удобный формат для приложения
 * Преобразует данные с сайта в структуру, понятную нашему приложению
 *
 * Структура данных с rasp.dmami.ru:
 * {
 *   "grid": {
 *     "1": {              // день недели (1=понедельник, 2=вторник и т.д.)
 *       "1": [{...}],     // номер пары (1=первая пара 09:00-10:30)
 *       "2": [{...}],     // 2=вторая пара 10:40-12:10
 *       ...
 *     },
 *     "2": {...},
 *     ...
 *   }
 * }
 *
 * @param {Object} rawSchedule - Сырые данные с сайта
 * @returns {Object} Объект с расписанием по дням
 */
export const parseSchedule = (rawSchedule) => {
    if (!rawSchedule || !rawSchedule.grid) {
        console.log('⚠️ Нет данных grid в расписании');
        return {};
    }

    const parsedSchedule = {};

    console.log('🔍 Дни в расписании:', Object.keys(rawSchedule.grid));

    // Проходим по всем дням в расписании
    Object.keys(rawSchedule.grid).forEach(dayKey => {
        const dayData = rawSchedule.grid[dayKey]; // Объект с парами: {"1": [...], "2": [...], ...}

        if (!dayData || typeof dayData !== 'object') {
            parsedSchedule[dayKey] = [];
            return;
        }

        const allLessonsForDay = [];

        // Проходим по всем парам в этом дне
        Object.keys(dayData).forEach(lessonNumber => {
            const lessonsInSlot = dayData[lessonNumber]; // Массив занятий в этой паре

            // Проверяем что это массив с занятиями
            if (!Array.isArray(lessonsInSlot) || lessonsInSlot.length === 0) {
                return; // Пропускаем пустые слоты
            }

            // Обрабатываем каждое занятие в этом слоте
            lessonsInSlot.forEach((lesson, slotIndex) => {
                if (!lesson || typeof lesson !== 'object') {
                    return; // Пропускаем невалидные данные
                }

                // Проверяем актуальность модуля по датам
                if (lesson.df && lesson.dt) {
                    const now = new Date();
                    const dateFrom = new Date(lesson.df);
                    const dateTo = new Date(lesson.dt);

                    // Если модуль уже закончился, пропускаем
                    if (now > dateTo) {
                        return;
                    }

                    // Если модуль еще не начался, также пропускаем
                    if (now < dateFrom) {
                        return;
                    }
                }

                // Извлекаем аудиторию из массива auditories или shortRooms
                let room = 'Аудитория не указана';
                if (lesson.shortRooms && lesson.shortRooms.length > 0) {
                    room = lesson.shortRooms[0];
                } else if (lesson.auditories && lesson.auditories.length > 0) {
                    const auditory = lesson.auditories[0];
                    // Убираем HTML теги из названия аудитории
                    room = auditory.title ? auditory.title.replace(/<[^>]*>/g, '') : 'Аудитория не указана';
                }

                // Получаем время по номеру пары
                const time = LESSON_TIMES[lessonNumber] || '';

                // Извлекаем преподавателя (может быть пустой строкой)
                const teacher = lesson.teacher && lesson.teacher.trim() !== ''
                    ? lesson.teacher
                    : 'Преподаватель не указан';

                const parsedLesson = {
                    id: `${dayKey}-${lessonNumber}-${slotIndex}`,
                    time: time,
                    subject: lesson.sbj || 'Неизвестный предмет',
                    type: lesson.type || 'Занятие',
                    room: room,
                    professor: teacher,
                    lessonNumber: parseInt(lessonNumber, 10), // Для сортировки
                    // Сохраняем даты модуля для справки
                    dateFrom: lesson.df || null,
                    dateTo: lesson.dt || null,
                };

                allLessonsForDay.push(parsedLesson);
            });
        });

        // Сортируем занятия по номеру пары
        allLessonsForDay.sort((a, b) => a.lessonNumber - b.lessonNumber);

        parsedSchedule[dayKey] = allLessonsForDay;

        console.log(`✅ День ${dayKey}: ${allLessonsForDay.length} занятий`);
    });

    return parsedSchedule;
};

/**
 * Получение расписания на конкретный день недели
 * @param {Object} parsedSchedule - Распарсенное расписание
 * @param {number} dayNumber - Номер дня недели (1-6, где 1 = понедельник)
 * @returns {Array} Массив занятий на этот день
 */
export const getScheduleForDay = (parsedSchedule, dayNumber) => {
    if (!parsedSchedule || !parsedSchedule[dayNumber]) {
        return [];
    }
    return parsedSchedule[dayNumber];
};

/**
 * Получение следующего занятия
 * Находит ближайшее занятие относительно текущего времени
 * @param {Object} parsedSchedule - Распарсенное расписание
 * @returns {Object|null} Объект следующего занятия или null
 */
export const getNextClass = (parsedSchedule) => {
    const now = new Date();
    const currentDay = now.getDay(); // 0 = воскресенье, 1 = понедельник и т.д.
    const currentTime = now.getHours() * 60 + now.getMinutes();

    // Преобразуем воскресенье (0) в понедельник (1)
    const normalizedDay = currentDay === 0 ? 7 : currentDay;

    // Ищем занятие сегодня
    const todaySchedule = parsedSchedule[normalizedDay] || [];

    for (const lesson of todaySchedule) {
        const lessonTime = parseTimeString(lesson.time);
        if (lessonTime > currentTime) {
            return {
                ...lesson,
                date: 'Сегодня',
                dayNumber: normalizedDay,
            };
        }
    }

    // Если сегодня ничего не нашли, ищем на завтра и далее
    for (let offset = 1; offset <= 7; offset++) {
        const checkDay = ((normalizedDay - 1 + offset) % 6) + 1; // Циклим по будням (1-6)
        const daySchedule = parsedSchedule[checkDay] || [];

        if (daySchedule.length > 0) {
            return {
                ...daySchedule[0],
                date: offset === 1 ? 'Завтра' : getDayName(checkDay),
                dayNumber: checkDay,
            };
        }
    }

    return null;
};

/**
 * Вспомогательная функция: парсинг строки времени в минуты
 * @param {string} timeStr - Строка времени типа "09:00"
 * @returns {number} Время в минутах с начала дня
 */
const parseTimeString = (timeStr) => {
    if (!timeStr) return 0;

    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return 0;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    return hours * 60 + minutes;
};

/**
 * Вспомогательная функция: получение названия дня недели
 * @param {number} dayNumber - Номер дня (1-6)
 * @returns {string} Название дня
 */
const getDayName = (dayNumber) => {
    const days = {
        1: 'Понедельник',
        2: 'Вторник',
        3: 'Среда',
        4: 'Четверг',
        5: 'Пятница',
        6: 'Суббота',
    };
    return days[dayNumber] || 'Неизвестный день';
};