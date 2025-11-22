/**
 * Утилита для расчета времени будильника
 *
 * Алгоритм:
 * Время будильника = Время начала занятия - Время в пути - Утренняя рутина - Запас времени
 */

/**
 * Парсинг строки времени в объект Date
 * @param {string} timeStr - Строка времени (например, "09:00" или "09:00 - 10:30")
 * @param {Date} baseDate - Базовая дата (по умолчанию - сегодня)
 * @returns {Date} Объект Date
 */
export const parseTimeString = (timeStr, baseDate = new Date()) => {
    if (!timeStr) return null;

    // Извлекаем первое время из строки (если есть диапазон)
    const match = timeStr.match(/(\d{1,2}):(\d{2})/);
    if (!match) return null;

    const hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);

    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);

    return date;
};

/**
 * Форматирование времени в строку HH:MM
 * @param {Date} date - Объект Date
 * @returns {string} Отформатированное время
 */
export const formatTime = (date) => {
    if (!date || !(date instanceof Date)) return '';

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
};

/**
 * Получение названия дня недели относительно сегодня
 * @param {Date} date - Дата
 * @returns {string} Название дня
 */
export const getRelativeDayName = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const targetDate = new Date(date);
    targetDate.setHours(0, 0, 0, 0);

    const diffTime = targetDate - today;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Сегодня';
    if (diffDays === 1) return 'Завтра';
    if (diffDays === -1) return 'Вчера';

    const days = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
    return days[targetDate.getDay()];
};

/**
 * Расчет времени будильника на основе следующего занятия
 * @param {Object} nextClass - Объект следующего занятия
 * @param {Object} settings - Настройки пользователя
 * @param {Object} routeData - Данные о маршруте
 * @returns {Object} Данные о будильнике
 */
export const calculateAlarm = (nextClass, settings, routeData) => {
    if (!nextClass || !nextClass.time) {
        return null;
    }

    // Парсим время начала занятия
    const classStartTime = parseTimeString(nextClass.time);
    if (!classStartTime) {
        return null;
    }

    // Получаем параметры из настроек
    const morningRoutine = parseInt(settings?.morningRoutine || '60', 10);
    const extraTime = parseInt(settings?.extraTime || '10', 10);

    // Получаем время в пути
    const travelTime = routeData?.duration || 30; // По умолчанию 30 минут
    const trafficExtra = routeData?.trafficInfo?.additionalTime || 0;

    // Итоговое время в пути с учетом пробок
    const totalTravelTime = travelTime + trafficExtra;

    // Рассчитываем время будильника
    // Вычитаем все времена из времени начала занятия
    const totalMinutesBeforeClass = morningRoutine + totalTravelTime + extraTime;

    const alarmTime = new Date(classStartTime.getTime() - totalMinutesBeforeClass * 60000);

    // Определяем дату будильника
    let alarmDate = new Date(alarmTime);

    // Если будильник получился раньше текущего времени, значит занятие сегодня
    // и будильник должен был уже прозвенеть
    const now = new Date();
    if (alarmTime < now) {
        // Проверяем, не на следующий день ли занятие
        if (nextClass.date !== 'Сегодня') {
            // Находим правильную дату
            const daysForward = getDaysForward(nextClass.dayNumber);
            alarmDate = new Date(now);
            alarmDate.setDate(alarmDate.getDate() + daysForward);
            alarmDate.setHours(alarmTime.getHours(), alarmTime.getMinutes(), 0, 0);
        }
    }

    return {
        time: formatTime(alarmDate),
        date: getRelativeDayName(alarmDate),
        fullDate: alarmDate,
        classTime: nextClass.time.split(' ')[0], // Только время начала
        className: nextClass.subject,
        classType: nextClass.type,
        breakdown: {
            morningRoutine,
            travelTime: totalTravelTime,
            extraTime,
            total: totalMinutesBeforeClass,
        },
    };
};

/**
 * Получение количества дней до указанного дня недели
 * @param {number} targetDayNumber - Номер дня недели (1-6, где 1 = понедельник)
 * @returns {number} Количество дней
 */
const getDaysForward = (targetDayNumber) => {
    const today = new Date().getDay(); // 0 = воскресенье
    const normalizedToday = today === 0 ? 7 : today;

    let daysForward = targetDayNumber - normalizedToday;
    if (daysForward <= 0) {
        daysForward += 7;
    }

    return daysForward;
};

/**
 * Расчет всех будильников на неделю
 * @param {Object} schedule - Полное расписание
 * @param {Object} settings - Настройки
 * @param {Object} routeData - Данные о маршруте
 * @returns {Array} Массив будильников
 */
export const calculateWeeklyAlarms = (schedule, settings, routeData) => {
    const alarms = [];

    if (!schedule) return alarms;

    // Проходим по всем дням недели
    for (let day = 1; day <= 6; day++) {
        const daySchedule = schedule[day];
        if (!daySchedule || daySchedule.length === 0) continue;

        // Берем первое занятие дня
        const firstClass = daySchedule[0];

        // Рассчитываем будильник для этого дня
        const alarm = calculateAlarm(
            { ...firstClass, dayNumber: day, date: getDayNameByNumber(day) },
            settings,
            routeData
        );

        if (alarm) {
            alarms.push({
                ...alarm,
                dayNumber: day,
                dayName: getDayNameByNumber(day),
            });
        }
    }

    return alarms;
};

/**
 * Получение названия дня по номеру
 * @param {number} dayNumber - Номер дня (1-6)
 * @returns {string} Название дня
 */
const getDayNameByNumber = (dayNumber) => {
    const days = {
        1: 'Понедельник',
        2: 'Вторник',
        3: 'Среда',
        4: 'Четверг',
        5: 'Пятница',
        6: 'Суббота',
    };
    return days[dayNumber] || '';
};

/**
 * Проверка, нужно ли будить пользователя завтра
 * @param {Object} nextClass - Следующее занятие
 * @param {Date} alarmTime - Время будильника
 * @returns {boolean} true если будильник на завтра
 */
export const isAlarmTomorrow = (nextClass, alarmTime) => {
    if (!alarmTime) return false;

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const alarmDate = new Date(alarmTime);
    alarmDate.setHours(0, 0, 0, 0);

    return alarmDate.getTime() === tomorrow.getTime();
};

/**
 * Расчет времени, оставшегося до будильника
 * @param {Date} alarmTime - Время будильника
 * @returns {Object} Объект с часами и минутами
 */
export const getTimeUntilAlarm = (alarmTime) => {
    if (!alarmTime) return null;

    const now = new Date();
    const diff = alarmTime - now;

    if (diff < 0) return null;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return {
        hours,
        minutes,
        totalMinutes: Math.floor(diff / (1000 * 60)),
        formatted: `${hours}ч ${minutes}мин`,
    };
};
