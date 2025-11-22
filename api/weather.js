/**
 * API для получения данных о погоде
 * Поддерживает OpenWeatherMap API (бесплатный)
 *
 * Для использования:
 * 1. Зарегистрируйтесь на https://openweathermap.org/api
 * 2. Получите API ключ
 * 3. Добавьте ключ в настройки или в .env файл
 */

// Для тестирования используется демо-ключ
// В продакшене замените на свой ключ из настроек
const API_KEY = 'YOUR_API_KEY_HERE'; // Замените на реальный ключ
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

/**
 * Получение текущей погоды по координатам
 * @param {number} lat - Широта
 * @param {number} lon - Долгота
 * @returns {Promise<Object>} Данные о погоде
 */
export const fetchWeatherByCoordinates = async (lat, lon) => {
    if (!lat || !lon) {
        throw new Error('Не указаны координаты');
    }

    const url = `${BASE_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return parseWeatherData(data);
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        throw new Error('Не удалось загрузить данные о погоде');
    }
};

/**
 * Получение текущей погоды по названию города
 * @param {string} city - Название города
 * @returns {Promise<Object>} Данные о погоде
 */
export const fetchWeatherByCity = async (city) => {
    if (!city || !city.trim()) {
        throw new Error('Не указан город');
    }

    const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric&lang=ru`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            if (response.status === 404) {
                throw new Error('Город не найден');
            }
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return parseWeatherData(data);
    } catch (error) {
        console.error('Ошибка получения погоды:', error);
        throw error;
    }
};

/**
 * Получение прогноза погоды на несколько дней
 * @param {number} lat - Широта
 * @param {number} lon - Долгота
 * @param {number} days - Количество дней (по умолчанию 5)
 * @returns {Promise<Object>} Прогноз погоды
 */
export const fetchWeatherForecast = async (lat, lon, days = 5) => {
    if (!lat || !lon) {
        throw new Error('Не указаны координаты');
    }

    const url = `${BASE_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric&lang=ru&cnt=${days * 8}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return parseForecastData(data);
    } catch (error) {
        console.error('Ошибка получения прогноза:', error);
        throw new Error('Не удалось загрузить прогноз погоды');
    }
};

/**
 * Парсинг данных о текущей погоде в удобный формат
 * @param {Object} data - Сырые данные от API
 * @returns {Object} Обработанные данные
 */
const parseWeatherData = (data) => {
    return {
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        condition: data.weather[0].description,
        conditionCode: data.weather[0].id,
        humidity: data.main.humidity,
        pressure: data.main.pressure,
        windSpeed: data.wind.speed,
        cloudiness: data.clouds.all,
        rain: data.rain ? data.rain['1h'] || data.rain['3h'] || 0 : 0,
        snow: data.snow ? data.snow['1h'] || data.snow['3h'] || 0 : 0,
        sunrise: new Date(data.sys.sunrise * 1000),
        sunset: new Date(data.sys.sunset * 1000),
        cityName: data.name,
    };
};

/**
 * Парсинг прогноза погоды
 * @param {Object} data - Сырые данные от API
 * @returns {Array} Массив прогнозов
 */
const parseForecastData = (data) => {
    return data.list.map(item => ({
        time: new Date(item.dt * 1000),
        temperature: Math.round(item.main.temp),
        condition: item.weather[0].description,
        conditionCode: item.weather[0].id,
        precipitation: (item.rain ? item.rain['3h'] || 0 : 0) + (item.snow ? item.snow['3h'] || 0 : 0),
        humidity: item.main.humidity,
        windSpeed: item.wind.speed,
    }));
};

/**
 * Получение рекомендаций на основе погоды
 * @param {Object} weather - Данные о погоде
 * @returns {Array<string>} Массив рекомендаций
 */
export const getWeatherRecommendations = (weather) => {
    const recommendations = [];

    // Температура
    if (weather.temperature < 0) {
        recommendations.push('Оденьтесь очень тепло - мороз');
    } else if (weather.temperature < 10) {
        recommendations.push(`Оденьтесь теплее - ${weather.temperature > 0 ? '+' : ''}${weather.temperature}°C`);
    } else if (weather.temperature > 25) {
        recommendations.push('Легкая одежда - будет жарко');
    }

    // Осадки
    if (weather.rain > 0 || weather.conditionCode >= 500 && weather.conditionCode < 600) {
        recommendations.push('Возьмите зонт - ожидается дождь');
    }

    if (weather.snow > 0 || weather.conditionCode >= 600 && weather.conditionCode < 700) {
        recommendations.push('Будьте осторожны - снег на дорогах');
    }

    // Ветер
    if (weather.windSpeed > 10) {
        recommendations.push('Сильный ветер - оденьтесь теплее');
    }

    // Влажность
    if (weather.humidity > 80) {
        recommendations.push('Высокая влажность - возможна духота');
    }

    // Если нет особых рекомендаций
    if (recommendations.length === 0) {
        recommendations.push('Хорошая погода для прогулки');
    }

    return recommendations;
};

/**
 * MOCK данные для тестирования без API ключа
 * Используйте эту функцию для разработки
 */
export const getMockWeatherData = () => {
    return {
        temperature: 15,
        feelsLike: 13,
        condition: 'Облачно с прояснениями',
        conditionCode: 802,
        humidity: 65,
        pressure: 1013,
        windSpeed: 5,
        cloudiness: 40,
        rain: 0,
        snow: 0,
        sunrise: new Date(),
        sunset: new Date(),
        cityName: 'Москва',
    };
};

/**
 * Проверка, настроен ли API ключ
 */
export const isWeatherApiConfigured = () => {
    return API_KEY && API_KEY !== 'YOUR_API_KEY_HERE';
};
