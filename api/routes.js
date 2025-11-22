/**
 * API для построения маршрутов
 * Поддерживает Яндекс.Карты API
 *
 * Для использования:
 * 1. Получите API ключ на https://developer.tech.yandex.ru/
 * 2. Выберите "JavaScript API и HTTP Геокодер"
 * 3. Добавьте ключ в настройки
 */

const YANDEX_API_KEY = '5e15c7e1-aac6-455d-a0b0-37d9e76231b9'; // Замените на реальный ключ
const GEOCODER_URL = 'https://geocode-maps.yandex.ru/1.x/';

/**
 * Геокодирование - преобразование адреса в координаты
 * @param {string} address - Адрес для геокодирования
 * @returns {Promise<Object>} Координаты { lat, lon }
 */
export const geocodeAddress = async (address) => {
    if (!address || !address.trim()) {
        throw new Error('Не указан адрес');
    }

    const url = `${GEOCODER_URL}?apikey=${YANDEX_API_KEY}&geocode=${encodeURIComponent(address)}&format=json`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const geoObject = data.response.GeoObjectCollection.featureMember[0];
        if (!geoObject) {
            throw new Error('Адрес не найден');
        }

        const coords = geoObject.GeoObject.Point.pos.split(' ');
        return {
            lon: parseFloat(coords[0]),
            lat: parseFloat(coords[1]),
            fullAddress: geoObject.GeoObject.metaDataProperty.GeocoderMetaData.text,
        };
    } catch (error) {
        console.error('Ошибка геокодирования:', error);
        throw error;
    }
};

/**
 * Построение маршрута между двумя точками
 * @param {Object} from - Начальная точка { lat, lon } или адрес
 * @param {Object} to - Конечная точка { lat, lon } или адрес
 * @param {string} mode - Тип транспорта: 'auto', 'transit', 'pedestrian'
 * @returns {Promise<Object>} Данные о маршруте
 */
export const buildRoute = async (from, to, mode = 'transit') => {
    try {
        // Если переданы адреса, геокодируем их
        let fromCoords = from;
        let toCoords = to;

        if (typeof from === 'string') {
            const geocoded = await geocodeAddress(from);
            fromCoords = { lat: geocoded.lat, lon: geocoded.lon };
        }

        if (typeof to === 'string') {
            const geocoded = await geocodeAddress(to);
            toCoords = { lat: geocoded.lat, lon: geocoded.lon };
        }

        // Для маршрутов общественного транспорта используем Yandex Router API
        // Примечание: для полноценной работы нужен API ключ
        const routeData = await calculateRoute(fromCoords, toCoords, mode);

        return routeData;
    } catch (error) {
        console.error('Ошибка построения маршрута:', error);
        throw new Error('Не удалось построить маршрут');
    }
};

/**
 * Расчет маршрута (упрощенная версия)
 * @param {Object} from - Координаты начала
 * @param {Object} to - Координаты конца
 * @param {string} mode - Режим транспорта
 * @returns {Promise<Object>} Данные маршрута
 */
const calculateRoute = async (from, to, mode) => {
    // Примечание: это упрощенная версия
    // Для реальной работы нужно использовать Yandex Router API или Directions API

    // Рассчитываем примерное расстояние по прямой (формула Haversine)
    const distance = calculateDistance(from.lat, from.lon, to.lat, to.lon);

    // Примерная скорость в зависимости от типа транспорта (км/ч)
    const speeds = {
        auto: 40,        // Автомобиль с учетом пробок
        transit: 25,     // Общественный транспорт
        pedestrian: 5,   // Пешком
    };

    const speed = speeds[mode] || speeds.transit;
    const duration = Math.round((distance / speed) * 60); // В минутах

    return {
        distance: distance.toFixed(1),
        duration: duration,
        mode: mode,
        departureTime: null,
        arrivalTime: null,
        steps: generateMockSteps(mode, distance, duration),
    };
};

/**
 * Расчет расстояния между двумя точками (формула Haversine)
 * @param {number} lat1 - Широта точки 1
 * @param {number} lon1 - Долгота точки 1
 * @param {number} lat2 - Широта точки 2
 * @param {number} lon2 - Долгота точки 2
 * @returns {number} Расстояние в километрах
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Радиус Земли в км
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

const toRad = (degrees) => {
    return degrees * (Math.PI / 180);
};

/**
 * Генерация примерных шагов маршрута для демонстрации
 */
const generateMockSteps = (mode, distance, duration) => {
    if (mode === 'pedestrian') {
        return [{
            id: '1',
            type: 'walk',
            description: 'Пешком до пункта назначения',
            duration: duration,
            distance: distance,
        }];
    }

    if (mode === 'auto') {
        return [{
            id: '1',
            type: 'car',
            description: 'Поездка на автомобиле',
            duration: duration,
            distance: distance,
        }];
    }

    // Для общественного транспорта создаем составной маршрут
    const walkTime = Math.round(duration * 0.2);
    const transitTime = duration - walkTime * 2;
    const walkDist = distance * 0.1;
    const transitDist = distance * 0.8;

    return [
        {
            id: '1',
            type: 'walk',
            description: 'Пешком до остановки',
            duration: walkTime,
            distance: walkDist.toFixed(1),
        },
        {
            id: '2',
            type: 'bus',
            description: 'Общественный транспорт',
            duration: transitTime,
            distance: transitDist.toFixed(1),
            routeNumber: '15',
        },
        {
            id: '3',
            type: 'walk',
            description: 'Пешком до пункта назначения',
            duration: walkTime,
            distance: walkDist.toFixed(1),
        },
    ];
};

/**
 * Получение информации о пробках (упрощенная версия)
 * @returns {Promise<Object>} Информация о трафике
 */
export const getTrafficInfo = async () => {
    // Для реальной работы нужен Yandex Traffic API
    // Пока возвращаем случайные данные для демонстрации

    const hour = new Date().getHours();

    // Определяем уровень пробок по времени суток
    let level = 'low';
    let additionalTime = 0;

    if (hour >= 7 && hour <= 10 || hour >= 17 && hour <= 20) {
        // Часы пик
        level = 'high';
        additionalTime = 10;
    } else if (hour >= 11 && hour <= 16) {
        // Дневное время
        level = 'medium';
        additionalTime = 5;
    }

    return {
        level: level,
        description: level === 'low' ? 'Дороги свободны' :
                     level === 'medium' ? 'Средний уровень загруженности' :
                     'Высокий уровень загруженности',
        additionalTime: additionalTime,
    };
};

/**
 * Расчет времени выезда на основе времени прибытия
 * @param {Date} arrivalTime - Время прибытия
 * @param {number} routeDuration - Длительность маршрута в минутах
 * @param {number} preparationTime - Время на сборы
 * @param {number} bufferTime - Буферное время
 * @returns {Date} Время выезда
 */
export const calculateDepartureTime = (arrivalTime, routeDuration, preparationTime = 0, bufferTime = 0) => {
    const totalMinutes = routeDuration + preparationTime + bufferTime;
    const departureTime = new Date(arrivalTime.getTime() - totalMinutes * 60000);
    return departureTime;
};

/**
 * MOCK данные для тестирования
 */
export const getMockRouteData = () => {
    return {
        distance: 12.5,
        duration: 35,
        mode: 'transit',
        departureTime: '08:25',
        arrivalTime: '09:00',
        steps: [
            {
                id: '1',
                type: 'walk',
                description: 'Пешком до остановки "Центральная"',
                duration: 5,
                distance: 0.4,
            },
            {
                id: '2',
                type: 'bus',
                description: 'Автобус №15 до остановки "Университет"',
                duration: 25,
                distance: 11.8,
                routeNumber: '15',
            },
            {
                id: '3',
                type: 'walk',
                description: 'Пешком до главного корпуса',
                duration: 5,
                distance: 0.3,
            },
        ],
        trafficInfo: {
            level: 'medium',
            description: 'Средний уровень загруженности',
            additionalTime: 5,
        },
    };
};

/**
 * Проверка, настроен ли API ключ
 */
export const isRoutesApiConfigured = () => {
    return YANDEX_API_KEY && YANDEX_API_KEY !== '5e15c7e1-aac6-455d-a0b0-37d9e76231b9';
};
