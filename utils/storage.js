/**
 * Утилиты для работы с локальным хранилищем
 * Используется для сохранения настроек и кэширования данных
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Ключи для хранилища
const KEYS = {
    SETTINGS: 'app_settings',
    SCHEDULE: 'cached_schedule',
    LAST_ROUTE: 'last_route_data',
    REMINDERS: 'app_reminders',
};

/**
 * Сохранение настроек пользователя
 */
export const saveSettings = async (settings) => {
    try {
        await AsyncStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
        console.log('✅ Настройки сохранены');
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения настроек:', error);
        return false;
    }
};

/**
 * Загрузка настроек пользователя
 */
export const loadSettings = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.SETTINGS);
        if (data) {
            console.log('✅ Настройки загружены');
            return JSON.parse(data);
        }
        return null;
    } catch (error) {
        console.error('❌ Ошибка загрузки настроек:', error);
        return null;
    }
};

/**
 * Сохранение кэша расписания
 */
export const saveScheduleCache = async (schedule) => {
    try {
        const cacheData = {
            schedule,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(KEYS.SCHEDULE, JSON.stringify(cacheData));
        console.log('✅ Расписание закэшировано');
        return true;
    } catch (error) {
        console.error('❌ Ошибка кэширования расписания:', error);
        return false;
    }
};

/**
 * Загрузка кэша расписания
 * @param {number} maxAge - Максимальный возраст кэша в миллисекундах
 */
export const loadScheduleCache = async (maxAge = 24 * 60 * 60 * 1000) => {
    try {
        const data = await AsyncStorage.getItem(KEYS.SCHEDULE);
        if (!data) return null;

        const cacheData = JSON.parse(data);
        const age = Date.now() - cacheData.timestamp;

        // Проверяем, не устарел ли кэш
        if (age > maxAge) {
            console.log('⚠️ Кэш расписания устарел');
            return null;
        }

        console.log('✅ Расписание загружено из кэша');
        return cacheData.schedule;
    } catch (error) {
        console.error('❌ Ошибка загрузки кэша расписания:', error);
        return null;
    }
};

/**
 * Сохранение данных последнего маршрута
 */
export const saveRouteData = async (routeData) => {
    try {
        await AsyncStorage.setItem(KEYS.LAST_ROUTE, JSON.stringify(routeData));
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения маршрута:', error);
        return false;
    }
};

/**
 * Загрузка данных последнего маршрута
 */
export const loadRouteData = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.LAST_ROUTE);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('❌ Ошибка загрузки маршрута:', error);
        return null;
    }
};

/**
 * Очистка кеша расписания
 */
export const clearScheduleCache = async () => {
    try {
        await AsyncStorage.removeItem(KEYS.SCHEDULE);
        console.log('✅ Кеш расписания очищен');
        return true;
    } catch (error) {
        console.error('❌ Ошибка очистки кеша расписания:', error);
        return false;
    }
};

/**
 * Очистка всех данных
 */
export const clearAllData = async () => {
    try {
        await AsyncStorage.clear();
        console.log('✅ Все данные очищены');
        return true;
    } catch (error) {
        console.error('❌ Ошибка очистки данных:', error);
        return false;
    }
};

/**
 * Загрузка всех напоминаний
 * @returns {Promise<Array>} Массив напоминаний
 */
export const loadReminders = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.REMINDERS);
        if (data) {
            const reminders = JSON.parse(data);
            console.log(`✅ Загружено напоминаний: ${reminders.length}`);
            return reminders;
        }
        return [];
    } catch (error) {
        console.error('❌ Ошибка загрузки напоминаний:', error);
        return [];
    }
};

/**
 * Сохранение всех напоминаний
 * @param {Array} reminders - Массив напоминаний
 */
export const saveReminders = async (reminders) => {
    try {
        await AsyncStorage.setItem(KEYS.REMINDERS, JSON.stringify(reminders));
        console.log(`✅ Сохранено напоминаний: ${reminders.length}`);
        return true;
    } catch (error) {
        console.error('❌ Ошибка сохранения напоминаний:', error);
        return false;
    }
};

/**
 * Добавление нового напоминания
 * @param {Object} reminder - Данные напоминания
 */
export const addReminder = async (reminder) => {
    try {
        const reminders = await loadReminders();
        const newReminder = {
            ...reminder,
            id: Date.now().toString(),
            createdAt: new Date().toISOString(),
        };
        reminders.push(newReminder);
        await saveReminders(reminders);
        console.log('✅ Напоминание добавлено:', newReminder.title);
        return newReminder;
    } catch (error) {
        console.error('❌ Ошибка добавления напоминания:', error);
        return null;
    }
};

/**
 * Обновление напоминания
 * @param {string} id - ID напоминания
 * @param {Object} updates - Обновленные данные
 */
export const updateReminder = async (id, updates) => {
    try {
        const reminders = await loadReminders();
        const index = reminders.findIndex(r => r.id === id);
        if (index !== -1) {
            reminders[index] = {
                ...reminders[index],
                ...updates,
                updatedAt: new Date().toISOString(),
            };
            await saveReminders(reminders);
            console.log('✅ Напоминание обновлено:', reminders[index].title);
            return reminders[index];
        }
        return null;
    } catch (error) {
        console.error('❌ Ошибка обновления напоминания:', error);
        return null;
    }
};

/**
 * Удаление напоминания
 * @param {string} id - ID напоминания
 */
export const deleteReminder = async (id) => {
    try {
        const reminders = await loadReminders();
        const filtered = reminders.filter(r => r.id !== id);
        await saveReminders(filtered);
        console.log('✅ Напоминание удалено');
        return true;
    } catch (error) {
        console.error('❌ Ошибка удаления напоминания:', error);
        return false;
    }
};