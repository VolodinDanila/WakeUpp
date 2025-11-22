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

/**
 * Парсинг расписания в удобный формат для приложения
 * Преобразует данные с сайта в структуру, понятную нашему приложению
 * @param {Object} rawSchedule - Сырые данные с сайта
 * @returns {Array} Массив с расписанием по дням
 */
export const parseSchedule = (rawSchedule) => {
    if (!rawSchedule || !rawSchedule.grid) {
        console.log('⚠️ Нет данных grid в расписании');
        return {};
    }

    const parsedSchedule = {};

    console.log('🔍 Структура данных grid:', Object.keys(rawSchedule.grid));

    // Проходим по всем дням в расписании
    Object.keys(rawSchedule.grid).forEach(dayKey => {
        const dayData = rawSchedule.grid[dayKey];

        // Проверяем что dayData существует
        if (!dayData) {
            parsedSchedule[dayKey] = [];
            return;
        }

        // Если это не массив, а строка или другой тип - пропускаем
        if (typeof dayData === 'string' || !dayData) {
            console.log(`⚠️ День ${dayKey}: неожиданный тип данных -`, typeof dayData);
            parsedSchedule[dayKey] = [];
            return;
        }

        // Если это пустой массив или объект
        if (Array.isArray(dayData) && dayData.length === 0) {
            parsedSchedule[dayKey] = [];
            return;
        }

        // Если это не массив, возможно это объект с занятиями
        const lessonsArray = Array.isArray(dayData) ? dayData : Object.values(dayData);

        // Парсим занятия для этого дня
        parsedSchedule[dayKey] = lessonsArray
            .filter(lesson => lesson && typeof lesson === 'object') // Фильтруем невалидные данные
            .map((lesson, index) => {
                // Извлекаем информацию о занятии
                const subject = lesson.sbj || lesson.subject || 'Неизвестный предмет';
                const type = lesson.type || 'Занятие';
                const teacher = lesson.teacher || lesson.prepod || 'Преподаватель не указан';
                const room = lesson.aud || lesson.auditoria || 'Аудитория не указана';
                const time = lesson.time || lesson.time_start || '';

                return {
                    id: `${dayKey}-${index}`,
                    time: time,
                    subject: subject,
                    type: type,
                    room: room,
                    professor: teacher,
                };
            });

        console.log(`✅ День ${dayKey}: ${parsedSchedule[dayKey].length} занятий`);
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