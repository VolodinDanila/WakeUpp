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