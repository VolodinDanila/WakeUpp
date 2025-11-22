/**
 * Главный экран приложения (HomeScreen)
 * 
 * Отображает:
 * - Следующий запланированный будильник
 * - Погоду на утро
 * - Рекомендации (что взять с собой, как одеться)
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { loadSettings, loadScheduleCache, loadRouteData } from '../utils/storage';
import {
  fetchWeatherByCity,
  getMockWeatherData,
  getWeatherRecommendations,
} from '../api/weather';
import { getNextClass } from '../api/schedule';
import { calculateAlarm, getTimeUntilAlarm } from '../utils/alarmCalculator';

export default function HomeScreen() {
  // Состояния для хранения данных
  const [nextAlarm, setNextAlarm] = useState(null);      // Следующий будильник
  const [weather, setWeather] = useState(null);          // Данные о погоде
  const [recommendations, setRecommendations] = useState([]); // Рекомендации
  const [loading, setLoading] = useState(true);          // Индикатор загрузки

  /**
   * Загрузка данных при запуске экрана
   */
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Обновление данных каждую минуту
   */
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 60000); // Каждую минуту

    return () => clearInterval(interval);
  }, []);

  /**
   * Функция загрузки данных
   */
  const loadData = async () => {
    setLoading(true);
    try {
      // Загружаем настройки
      const settings = await loadSettings();

      // Загружаем погоду
      await loadWeatherData(settings);

      // Загружаем и рассчитываем будильник
      await loadAlarmData(settings);

      setLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setLoading(false);
    }
  };

  /**
   * Загрузка и расчет будильника
   */
  const loadAlarmData = async (settings) => {
    try {
      // Загружаем расписание из кэша
      const schedule = await loadScheduleCache();
      if (!schedule) {
        console.log('Нет расписания в кэше');
        setNextAlarm(null);
        return;
      }

      // Получаем следующее занятие
      const nextClassData = getNextClass(schedule);
      if (!nextClassData) {
        console.log('Нет следующего занятия');
        setNextAlarm(null);
        return;
      }

      // Загружаем данные о маршруте
      const route = await loadRouteData();

      // Рассчитываем будильник
      const alarm = calculateAlarm(nextClassData, settings, route);

      if (alarm) {
        setNextAlarm(alarm);

        // Обновляем рекомендации с учетом времени до будильника
        const timeUntil = getTimeUntilAlarm(alarm.fullDate);
        if (timeUntil && settings?.weatherNotifications) {
          setRecommendations(prev => {
            const newRecs = [...prev];
            if (timeUntil.hours < 12) {
              newRecs.unshift(`Будильник через ${timeUntil.formatted}`);
            }
            return newRecs;
          });
        }
      } else {
        setNextAlarm(null);
      }
    } catch (error) {
      console.error('Ошибка расчета будильника:', error);
      setNextAlarm(null);
    }
  };

  /**
   * Загрузка данных о погоде
   */
  const loadWeatherData = async (settings) => {
    try {
      let weatherData;

      // Пытаемся загрузить реальную погоду
      if (settings?.universityAddress) {
        try {
          // Извлекаем город из адреса (первое слово обычно город)
          const city = settings.universityAddress.split(',')[0].trim();
          console.log(`🌤️ Загружаю погоду для: ${city}`);
          weatherData = await fetchWeatherByCity(city);
        } catch (apiError) {
          // Если API не работает, используем mock данные
          console.log('⚠️ Используются mock данные погоды');
          weatherData = getMockWeatherData();
        }
      } else {
        // Нет адреса - используем mock данные
        console.log('ℹ️ Адрес не указан, используются mock данные');
        weatherData = getMockWeatherData();
      }

      setWeather(weatherData);

      // Генерируем рекомендации на основе погоды
      const weatherRecs = getWeatherRecommendations(weatherData);
      setRecommendations(weatherRecs);

    } catch (error) {
      console.error('❌ Критическая ошибка загрузки погоды:', error);
      // В случае ошибки используем mock данные
      const mockWeather = getMockWeatherData();
      setWeather(mockWeather);
      setRecommendations(getWeatherRecommendations(mockWeather));
    }
  };

  /**
   * Рендер индикатора загрузки
   */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка данных...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Карточка следующего будильника */}
      <View style={styles.alarmCard}>
        <Text style={styles.sectionTitle}>Следующий будильник</Text>
        
        {nextAlarm ? (
          <View style={styles.alarmInfo}>
            <Text style={styles.alarmTime}>{nextAlarm.time}</Text>
            <Text style={styles.alarmDate}>{nextAlarm.date}</Text>

            <View style={styles.divider} />

            <Text style={styles.classInfo}>
              Занятие в {nextAlarm.classTime}
            </Text>
            <Text style={styles.className}>{nextAlarm.className}</Text>

            {nextAlarm.breakdown && (
              <View style={styles.breakdownContainer}>
                <Text style={styles.breakdownTitle}>Расчет времени:</Text>
                <Text style={styles.breakdownItem}>
                  Утренняя рутина: {nextAlarm.breakdown.morningRoutine} мин
                </Text>
                <Text style={styles.breakdownItem}>
                  Время в пути: {nextAlarm.breakdown.travelTime} мин
                </Text>
                <Text style={styles.breakdownItem}>
                  Запас времени: {nextAlarm.breakdown.extraTime} мин
                </Text>
              </View>
            )}
          </View>
        ) : (
          <Text style={styles.noDataText}>
            Нет запланированных занятий.{'\n'}
            Добавьте расписание в настройках.
          </Text>
        )}
      </View>

      {/* Карточка погоды */}
      <View style={styles.weatherCard}>
        <Text style={styles.sectionTitle}>Погода на утро</Text>
        
        {weather ? (
          <View style={styles.weatherInfo}>
            <Text style={styles.temperature}>{weather.temperature}°C</Text>
            <Text style={styles.condition}>{weather.condition}</Text>
            <View style={styles.weatherDetails}>
              <Text style={styles.weatherDetailItem}>
                Ощущается как {weather.feelsLike}°C
              </Text>
              <Text style={styles.weatherDetailItem}>
                Влажность: {weather.humidity}%
              </Text>
              <Text style={styles.weatherDetailItem}>
                Ветер: {weather.windSpeed} м/с
              </Text>
            </View>
          </View>
        ) : (
          <Text style={styles.noDataText}>Нет данных о погоде</Text>
        )}
      </View>

      {/* Карточка рекомендаций */}
      <View style={styles.recommendationsCard}>
        <Text style={styles.sectionTitle}>Рекомендации</Text>
        
        {recommendations.length > 0 ? (
          <View style={styles.recommendationsList}>
            {recommendations.map((recommendation, index) => (
              <View key={index} style={styles.recommendationItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.recommendationText}>{recommendation}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.noDataText}>Нет рекомендаций</Text>
        )}
      </View>

      {/* Кнопка обновления данных */}
      <TouchableOpacity 
        style={styles.refreshButton}
        onPress={loadData}
      >
        <Text style={styles.refreshButtonText}>Обновить данные</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// Стили компонента
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  // Стили для карточек
  alarmCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 10,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  weatherCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginBottom: 10,
    marginTop: 5,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recommendationsCard: {
    backgroundColor: '#fff',
    margin: 15,
    marginTop: 5,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  // Стили будильника
  alarmInfo: {
    alignItems: 'center',
  },
  alarmTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  alarmDate: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: '#e0e0e0',
    marginVertical: 15,
  },
  classInfo: {
    fontSize: 14,
    color: '#666',
  },
  className: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
    marginTop: 5,
  },
  breakdownContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    width: '100%',
  },
  breakdownTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  breakdownItem: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  // Стили погоды
  weatherInfo: {
    alignItems: 'center',
  },
  temperature: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#FF9500',
  },
  condition: {
    fontSize: 18,
    color: '#666',
    marginTop: 5,
  },
  precipitation: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  weatherDetails: {
    marginTop: 12,
    alignItems: 'center',
  },
  weatherDetailItem: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  // Стили рекомендаций
  recommendationsList: {
    marginTop: 5,
  },
  recommendationItem: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  bullet: {
    fontSize: 18,
    color: '#007AFF',
    marginRight: 10,
    marginTop: -2,
  },
  recommendationText: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    lineHeight: 22,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  // Кнопка обновления
  refreshButton: {
    backgroundColor: '#007AFF',
    margin: 15,
    marginTop: 5,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
