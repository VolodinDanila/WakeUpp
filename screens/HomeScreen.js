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
} from 'react-native';

export default function HomeScreen() {
  // Состояния для хранения данных
  const [nextAlarm, setNextAlarm] = useState(null);      // Следующий будильник
  const [weather, setWeather] = useState(null);          // Данные о погоде
  const [recommendations, setRecommendations] = useState([]); // Рекомендации
  const [loading, setLoading] = useState(true);          // Индикатор загрузки

  /**
   * Эффект для загрузки данных при запуске экрана
   * Здесь будут запросы к API для получения погоды и расписания
   */
  useEffect(() => {
    loadData();
  }, []);

  /**
   * Функция загрузки данных
   * TODO: Добавить реальные API запросы
   */
  const loadData = async () => {
    try {
      // Симуляция загрузки данных
      // В будущем здесь будут реальные API запросы
      setTimeout(() => {
        // Тестовые данные
        setNextAlarm({
          time: '07:30',
          date: 'Завтра',
          classTime: '09:00',
          className: 'Математический анализ',
        });

        setWeather({
          temperature: 15,
          condition: 'Облачно',
          precipitation: 20, // вероятность осадков в %
        });

        setRecommendations([
          'Возьмите зонт - возможен дождь',
          'Оденьтесь теплее - +15°C',
          'Выезжайте на 5 минут раньше - пробки',
        ]);

        setLoading(false);
      }, 1000);
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
      setLoading(false);
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
          </View>
        ) : (
          <Text style={styles.noDataText}>Нет запланированных будильников</Text>
        )}
      </View>

      {/* Карточка погоды */}
      <View style={styles.weatherCard}>
        <Text style={styles.sectionTitle}>Погода на утро</Text>
        
        {weather ? (
          <View style={styles.weatherInfo}>
            <Text style={styles.temperature}>{weather.temperature}°C</Text>
            <Text style={styles.condition}>{weather.condition}</Text>
            <Text style={styles.precipitation}>
              Вероятность осадков: {weather.precipitation}%
            </Text>
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
