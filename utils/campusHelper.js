/**
 * Утилиты для работы с корпусами университета
 */

/**
 * Извлечение кода корпуса из названия аудитории
 * @param {string} room - Название аудитории (например: "пр-123", "пк-401")
 * @returns {string|null} - Код корпуса ("пр", "пк", "ав", "бс") или null
 */
export const extractCampusCode = (room) => {
    if (!room || typeof room !== 'string') {
        return null;
    }

    // Убираем HTML теги если есть
    const cleanRoom = room.replace(/<[^>]*>/g, '').trim().toLowerCase();

    // Ищем префикс до дефиса
    const match = cleanRoom.match(/^(пр|пк|ав|бс)-/);

    if (match) {
        return match[1]; // Возвращаем код корпуса
    }

    return null;
};

/**
 * Определение корпуса для ближайшей пары
 * @param {Array} schedule - Массив пар на день
 * @param {Date} currentTime - Текущее время
 * @returns {string|null} - Код корпуса или null если не найдено
 */
export const getNextCampus = (schedule, currentTime = new Date()) => {
    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
        return null;
    }

    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const currentTimeInMinutes = currentHour * 60 + currentMinute;

    // Ищем ближайшую пару (еще не началась или идет сейчас)
    for (const lesson of schedule) {
        if (!lesson.time || !lesson.room) {
            continue;
        }

        // Парсим время начала пары (например: "08:30 - 10:00")
        const timeMatch = lesson.time.match(/(\d{1,2}):(\d{2})/);
        if (!timeMatch) {
            continue;
        }

        const lessonHour = parseInt(timeMatch[1], 10);
        const lessonMinute = parseInt(timeMatch[2], 10);
        const lessonTimeInMinutes = lessonHour * 60 + lessonMinute;

        // Если пара еще не прошла (начало + 90 минут > текущее время)
        if (lessonTimeInMinutes + 90 >= currentTimeInMinutes) {
            const campusCode = extractCampusCode(lesson.room);
            if (campusCode) {
                console.log(`📍 Определен корпус для ближайшей пары: ${campusCode} (аудитория: ${lesson.room}, время: ${lesson.time})`);
                return campusCode;
            }
        }
    }

    // Если не нашли подходящую пару, берем код из первой пары
    for (const lesson of schedule) {
        if (lesson.room) {
            const campusCode = extractCampusCode(lesson.room);
            if (campusCode) {
                console.log(`📍 Используем корпус первой пары дня: ${campusCode} (аудитория: ${lesson.room})`);
                return campusCode;
            }
        }
    }

    return null;
};

/**
 * Получение адреса корпуса по коду
 * @param {string} campusCode - Код корпуса ("пр", "пк", "ав", "бс")
 * @param {Array} campusAddresses - Массив адресов корпусов из настроек
 * @returns {string|null} - Адрес корпуса или null
 */
export const getCampusAddress = (campusCode, campusAddresses) => {
    if (!campusCode || !campusAddresses || !Array.isArray(campusAddresses)) {
        return null;
    }

    const campus = campusAddresses.find(c => c.code === campusCode);

    if (campus && campus.address && campus.address.trim()) {
        console.log(`📍 Найден адрес для корпуса "${campusCode}": ${campus.address}`);
        return campus.address;
    }

    console.log(`⚠️ Адрес для корпуса "${campusCode}" не найден в настройках`);
    return null;
};
