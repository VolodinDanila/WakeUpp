/**
 * API для построения маршрутов
 * Использует:
 * - Яндекс.Геокодер (адрес → координаты) - нужен API ключ
 * - OSRM API (маршруты для авто и пешком) - бесплатный
 * - Ссылки на Яндекс.Карты для просмотра маршрутов
 *
 * Для использования:
 * 1. Получите API ключ Яндекса на https://developer.tech.yandex.ru/
 * 2. Добавьте ключ в настройки приложения
 */

// ВАЖНО: Замените на свой API ключ от Яндекс.Карт (только для геокодирования)
// Получите ключ на https://developer.tech.yandex.ru/
const YANDEX_API_KEY = 'YOUR_YANDEX_API_KEY';
const GEOCODER_URL = 'https://geocode-maps.yandex.ru/1.x/';

// OSRM (Open Source Routing Machine) - бесплатный API для маршрутов
const OSRM_URL = 'https://router.project-osrm.org';

/**
 * Геокодирование - преобразование адреса в координаты
 * @param {string} address - Адрес для геокодирования
 * @returns {Promise<Object>} Координаты { lat, lon }
 */
export const geocodeAddress = async (address) => {
    if (!address || !address.trim()) {
        throw new Error('Не указан адрес');
    }

    // Проверяем API ключ
    if (!YANDEX_API_KEY || YANDEX_API_KEY === 'YOUR_YANDEX_API_KEY') {
        console.log('⚠️ API ключ Яндекс.Карт не настроен');
        throw new Error('API ключ не настроен');
    }

    const url = `${GEOCODER_URL}?apikey=${YANDEX_API_KEY}&geocode=${encodeURIComponent(address)}&format=json`;

    try {
        console.log(`🗺️ Геокодирую адрес: ${address}`);
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 403) {
                throw new Error('Неверный API ключ Яндекс.Карт');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        const geoObject = data.response.GeoObjectCollection.featureMember[0];
        if (!geoObject) {
            throw new Error('Адрес не найден');
        }

        const coords = geoObject.GeoObject.Point.pos.split(' ');
        console.log('✅ Адрес успешно геокодирован');
        return {
            lon: parseFloat(coords[0]),
            lat: parseFloat(coords[1]),
            fullAddress: geoObject.GeoObject.metaDataProperty.GeocoderMetaData.text,
        };
    } catch (error) {
        console.error('❌ Ошибка геокодирования:', error.message);
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
        console.log('🗺️ ============ ПОСТРОЕНИЕ МАРШРУТА ============');
        console.log(`📍 Откуда: ${typeof from === 'string' ? from : JSON.stringify(from)}`);
        console.log(`📍 Куда: ${typeof to === 'string' ? to : JSON.stringify(to)}`);
        console.log(`🚌 Режим транспорта: ${mode}`);

        // Если переданы адреса, геокодируем их
        let fromCoords = from;
        let toCoords = to;
        let fromAddress = typeof from === 'string' ? from : 'Начальная точка';
        let toAddress = typeof to === 'string' ? to : 'Конечная точка';

        if (typeof from === 'string') {
            console.log(`🔍 Геокодирую начальный адрес: ${from}`);
            const geocoded = await geocodeAddress(from);
            fromCoords = { lat: geocoded.lat, lon: geocoded.lon };
            fromAddress = geocoded.fullAddress || from;
            console.log(`✅ Начальные координаты: lat=${geocoded.lat}, lon=${geocoded.lon}`);
            console.log(`📝 Полный адрес: ${fromAddress}`);
        }

        if (typeof to === 'string') {
            console.log(`🔍 Геокодирую конечный адрес: ${to}`);
            const geocoded = await geocodeAddress(to);
            toCoords = { lat: geocoded.lat, lon: geocoded.lon };
            toAddress = geocoded.fullAddress || to;
            console.log(`✅ Конечные координаты: lat=${geocoded.lat}, lon=${geocoded.lon}`);
            console.log(`📝 Полный адрес: ${toAddress}`);
        }

        // Генерируем ссылку на Яндекс.Карты
        const mapUrl = generateYandexMapUrl(fromCoords, toCoords, mode);
        console.log('🔗 Ссылка на маршрут в Яндекс.Картах:');
        console.log(mapUrl);

        // Для маршрутов общественного транспорта используем Yandex Router API
        // Примечание: для полноценной работы нужен API ключ
        console.log('📊 Рассчитываю параметры маршрута...');
        const routeData = await calculateRoute(fromCoords, toCoords, mode);

        // Добавляем ссылку на карты
        routeData.mapUrl = mapUrl;
        routeData.fromAddress = fromAddress;
        routeData.toAddress = toAddress;

        console.log('✅ Маршрут построен:');
        console.log(`   Расстояние: ${routeData.distance} км`);
        console.log(`   Время в пути: ${routeData.duration} мин`);
        console.log(`   Шагов: ${routeData.steps.length}`);
        console.log('🗺️ =========================================');

        return routeData;
    } catch (error) {
        console.error('❌ Ошибка построения маршрута:', error);
        console.error('   Тип ошибки:', error.name);
        console.error('   Сообщение:', error.message);
        console.error('🗺️ =========================================');
        throw new Error('Не удалось построить маршрут');
    }
};

/**
 * Генерация ссылки на маршрут в Яндекс.Картах
 * @param {Object} from - Координаты начала { lat, lon }
 * @param {Object} to - Координаты конца { lat, lon }
 * @param {string} mode - Режим транспорта
 * @returns {string} URL на Яндекс.Карты
 */
const generateYandexMapUrl = (from, to, mode) => {
    // Формат URL: https://yandex.ru/maps/?rtext=lat1,lon1~lat2,lon2&rtt=mode
    // rtt: auto (авто), mt (общественный транспорт), pd (пешком)
    const modeMap = {
        auto: 'auto',
        transit: 'mt',
        pedestrian: 'pd',
    };

    const rtt = modeMap[mode] || 'mt';
    const url = `https://yandex.ru/maps/?rtext=${from.lat},${from.lon}~${to.lat},${to.lon}&rtt=${rtt}`;

    return url;
};

/**
 * Расчет маршрута через OSRM API (бесплатный)
 * Для общественного транспорта показываем только ссылку на Яндекс.Карты
 * @param {Object} from - Координаты начала
 * @param {Object} to - Координаты конца
 * @param {string} mode - Режим транспорта
 * @returns {Promise<Object>} Данные маршрута
 */
const calculateRoute = async (from, to, mode) => {
    // Для общественного транспорта OSRM не подходит
    if (mode === 'transit') {
        console.log('   ⚠️ Для общественного транспорта используется только ссылка на Яндекс.Карты');
        // Приблизительный расчет для UI (не точный!)
        const distance = calculateDistance(from.lat, from.lon, to.lat, to.lon);
        const duration = Math.round(distance / 0.5); // ~30 км/ч средняя скорость

        return {
            distance: distance.toFixed(1),
            duration: duration,
            mode: mode,
            departureTime: null,
            arrivalTime: null,
            steps: generateSimpleSteps(mode, distance.toFixed(1), duration),
            isRealRoute: false,
            apiSource: 'Приблизительный расчет (откройте Яндекс.Карты для точного маршрута)',
            alternatives: [{
                id: '0',
                distance: distance.toFixed(1),
                duration: duration,
                mode: mode,
                steps: generateSimpleSteps(mode, distance.toFixed(1), duration),
                routeType: 'fastest',
                routeTypeName: 'Откройте в Яндекс.Картах',
            }],
        };
    }

    console.log('   🚀 Запрашиваю маршрут от OSRM API (бесплатный)...');
    const routeData = await fetchOSRMRoute(from, to, mode);
    console.log(`   ✅ Получен маршрут: ${routeData.duration} мин, ${routeData.distance} км`);

    return routeData;
};

/**
 * Запрос к OSRM API для получения маршрута
 * Поддерживает: driving (авто), foot (пешком)
 *
 * @param {Object} from - Координаты начала { lat, lon }
 * @param {Object} to - Координаты конца { lat, lon }
 * @param {string} mode - Режим: 'auto', 'pedestrian'
 * @returns {Promise<Object>} Данные маршрута от OSRM
 */
const fetchOSRMRoute = async (from, to, mode) => {
    // Маппинг режимов для OSRM API
    const profileMap = {
        auto: 'driving',
        pedestrian: 'foot',
    };
    const profile = profileMap[mode] || 'foot';

    // OSRM использует формат: lon,lat (не lat,lon!)
    const coordinates = `${from.lon},${from.lat};${to.lon},${to.lat}`;

    // Запрашиваем маршрут без альтернатив (упрощенная версия)
    const url = `${OSRM_URL}/route/v1/${profile}/${coordinates}?overview=false`;

    console.log(`   🔗 Запрос к OSRM: ${profile} (${mode})`);

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`OSRM API ошибка: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        throw new Error(`OSRM не смог построить маршрут: ${data.code || 'нет маршрутов'}`);
    }

    const route = data.routes[0];
    const distance = (route.distance / 1000).toFixed(1); // метры → км
    const duration = Math.round(route.duration / 60); // секунды → минуты

    console.log(`   ✅ Маршрут от OSRM: ${distance} км, ${duration} мин`);

    // Генерируем простые шаги для отображения
    const steps = generateSimpleSteps(mode, distance, duration);

    return {
        distance: distance,
        duration: duration,
        mode: mode,
        departureTime: null,
        arrivalTime: null,
        steps: steps,
        isRealRoute: true,
        apiSource: 'OSRM',
        alternatives: [{
            id: '0',
            distance: distance,
            duration: duration,
            mode: mode,
            steps: steps,
            routeType: 'fastest',
            routeTypeName: 'Рекомендуемый маршрут',
        }],
    };
};

/**
 * Генерация простых шагов маршрута для отображения
 * Используется когда у нас есть только время и расстояние
 * @param {string} mode - Режим транспорта
 * @param {string} distance - Расстояние в км
 * @param {number} duration - Время в минутах
 * @returns {Array} Массив шагов маршрута
 */
const generateSimpleSteps = (mode, distance, duration) => {
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
    const walkDist = (parseFloat(distance) * 0.1).toFixed(1);
    const transitDist = (parseFloat(distance) * 0.8).toFixed(1);

    return [
        {
            id: '1',
            type: 'walk',
            description: 'Пешком до остановки',
            duration: walkTime,
            distance: walkDist,
        },
        {
            id: '2',
            type: 'bus',
            description: 'Общественный транспорт',
            duration: transitTime,
            distance: transitDist,
            routeNumber: null,
        },
        {
            id: '3',
            type: 'walk',
            description: 'Пешком до пункта назначения',
            duration: walkTime,
            distance: walkDist,
        },
    ];
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
 * (Удалено - теперь проверяем при запросе)
 */
