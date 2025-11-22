/**
 * Экран маршрута (RouteScreen)
 * 
 * Отображает:
 * - Маршрут от дома до университета
 * - Время в пути
 * - Информацию о пробках
 * - Рекомендации по времени выезда
 * 
 * TODO: Интеграция с API Яндекс.Карт для построения маршрута
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
  Linking,
} from 'react-native';
import { loadSettings, saveRouteData, loadRouteData as loadCachedRoute } from '../utils/storage';
import {
  buildRoute,
  getTrafficInfo,
  getMockRouteData,
} from '../api/routes';

export default function RouteScreen() {
  // Состояния компонента
  const [loading, setLoading] = useState(true);
  const [routeData, setRouteData] = useState(null);
  const [trafficLevel, setTrafficLevel] = useState('medium'); // low, medium, high

  /**
   * Загрузка данных о маршруте при монтировании компонента
   */
  useEffect(() => {
    initializeRoute();
  }, []);

  /**
   * Инициализация маршрута
   */
  const initializeRoute = async () => {
    setLoading(true);
    try {
      // Загружаем настройки
      const settings = await loadSettings();

      if (!settings || !settings.homeAddress || !settings.universityAddress) {
        setLoading(false);
        return;
      }

      // Пробуем загрузить кэшированный маршрут
      const cached = await loadCachedRoute();
      if (cached) {
        setRouteData(cached);
        setTrafficLevel(cached.trafficInfo?.level || 'medium');
      }

      // Строим маршрут
      await loadRouteData(settings);

    } catch (error) {
      console.error('Ошибка инициализации маршрута:', error);
      setLoading(false);
    }
  };

  /**
   * Функция загрузки данных о маршруте
   */
  const loadRouteData = async (settingsData) => {
    setLoading(true);
    try {
      const settings = settingsData || await loadSettings();

      if (!settings || !settings.homeAddress || !settings.universityAddress) {
        setRouteData(null);
        setLoading(false);
        return;
      }

      let routeResult;

      // Пытаемся построить реальный маршрут
      try {
        const mode = settings.transportType === 'car' ? 'auto' :
                     settings.transportType === 'walk' ? 'pedestrian' : 'transit';

        console.log(`🗺️ Строю маршрут: ${settings.homeAddress} → ${settings.universityAddress}`);
        routeResult = await buildRoute(
          settings.homeAddress,
          settings.universityAddress,
          mode
        );
        console.log('✅ Маршрут успешно построен');
      } catch (apiError) {
        // Если API не работает, используем mock данные
        console.log('⚠️ Используются mock данные маршрута:', apiError.message);
        routeResult = getMockRouteData();
      }

      // Получаем информацию о пробках
      const traffic = await getTrafficInfo();
      routeResult.trafficInfo = traffic;

      // Расчет времени выезда и прибытия
      const now = new Date();
      const arrival = new Date(now.getTime() + routeResult.duration * 60000);
      const departure = now;

      routeResult.departureTime = formatTime(departure);
      routeResult.arrivalTime = formatTime(arrival);

      // Добавляем адреса для отображения
      routeResult.fromAddress = settings.homeAddress;
      routeResult.toAddress = settings.universityAddress;

      console.log('📊 Итоговые данные маршрута:');
      console.log('   Адреса:', {
        from: routeResult.fromAddress,
        to: routeResult.toAddress
      });
      console.log('   Время:', {
        departure: routeResult.departureTime,
        arrival: routeResult.arrivalTime,
        duration: routeResult.duration + ' мин'
      });
      console.log('   Расстояние:', routeResult.distance + ' км');
      console.log('   Режим:', routeResult.mode);
      console.log('   Пробки:', traffic);
      if (routeResult.mapUrl) {
        console.log('   Ссылка на карты:', routeResult.mapUrl);
      }

      setRouteData(routeResult);
      setTrafficLevel(traffic.level);

      // Сохраняем в кэш
      await saveRouteData(routeResult);

      setLoading(false);
    } catch (error) {
      console.error('❌ Критическая ошибка загрузки маршрута:', error);
      setLoading(false);
      Alert.alert(
        'Ошибка',
        'Не удалось построить маршрут. Проверьте адреса в настройках.',
        [
          { text: 'Отмена', style: 'cancel' },
          { text: 'Повторить', onPress: () => loadRouteData() }
        ]
      );
    }
  };

  /**
   * Форматирование времени
   */
  const formatTime = (date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  /**
   * Получение цвета индикатора пробок
   */
  const getTrafficColor = () => {
    switch (trafficLevel) {
      case 'low': return '#34C759';    // зеленый
      case 'medium': return '#FF9500'; // оранжевый
      case 'high': return '#FF3B30';   // красный
      default: return '#999';
    }
  };

  /**
   * Получение текста для уровня пробок
   */
  const getTrafficText = () => {
    switch (trafficLevel) {
      case 'low': return 'Дороги свободны';
      case 'medium': return 'Средний уровень загруженности';
      case 'high': return 'Высокий уровень загруженности';
      default: return 'Нет данных';
    }
  };

  /**
   * Получение иконки для типа транспорта
   */
  const getTransportIcon = (type) => {
    switch (type) {
      case 'walk': return '🚶';
      case 'bus': return '🚌';
      case 'metro': return '🚇';
      case 'car': return '🚗';
      default: return '📍';
    }
  };

  /**
   * Рендер шага маршрута
   */
  const renderRouteStep = (step, index) => (
    <View key={step.id} style={styles.stepContainer}>
      {/* Иконка транспорта */}
      <View style={styles.stepIconContainer}>
        <Text style={styles.stepIcon}>{getTransportIcon(step.type)}</Text>
        {index < routeData.steps.length - 1 && (
          <View style={styles.stepLine} />
        )}
      </View>

      {/* Информация о шаге */}
      <View style={styles.stepInfo}>
        <Text style={styles.stepDescription}>{step.description}</Text>
        <View style={styles.stepDetails}>
          <Text style={styles.stepDetailText}>
            {step.duration} мин • {step.distance} км
          </Text>
          {step.routeNumber && (
            <View style={styles.routeBadge}>
              <Text style={styles.routeBadgeText}>№{step.routeNumber}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  /**
   * Рендер индикатора загрузки
   */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Построение маршрута...</Text>
      </View>
    );
  }

  /**
   * Рендер состояния отсутствия данных
   */
  if (!routeData) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          📍 Настройте адреса в разделе "Настройки" для построения маршрута
        </Text>
        <TouchableOpacity 
          style={styles.retryButton}
          onPress={loadRouteData}
        >
          <Text style={styles.retryButtonText}>Повторить</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Адреса маршрута */}
      {routeData && (
        <View style={styles.addressCard}>
          <Text style={styles.addressTitle}>Маршрут</Text>
          <View style={styles.addressItem}>
            <Text style={styles.addressIcon}>🏠</Text>
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressLabel}>Откуда:</Text>
              <Text style={styles.addressText}>{routeData.fromAddress || 'Домашний адрес'}</Text>
            </View>
          </View>
          <View style={styles.addressArrow}>
            <Text style={styles.arrowText}>↓</Text>
          </View>
          <View style={styles.addressItem}>
            <Text style={styles.addressIcon}>🎓</Text>
            <View style={styles.addressTextContainer}>
              <Text style={styles.addressLabel}>Куда:</Text>
              <Text style={styles.addressText}>{routeData.toAddress || 'Университет'}</Text>
            </View>
          </View>
        </View>
      )}

      {/* Основная информация о маршруте */}
      <View style={styles.summaryCard}>
        <View style={styles.timeContainer}>
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Выезд</Text>
            <Text style={styles.timeValue}>{routeData.departureTime}</Text>
          </View>
          
          <View style={styles.arrowContainer}>
            <Text style={styles.arrow}>→</Text>
          </View>
          
          <View style={styles.timeBlock}>
            <Text style={styles.timeLabel}>Прибытие</Text>
            <Text style={styles.timeValue}>{routeData.arrivalTime}</Text>
          </View>
        </View>

        <View style={styles.summaryDetails}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Время в пути</Text>
            <Text style={styles.summaryValue}>{routeData.duration} мин</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Расстояние</Text>
            <Text style={styles.summaryValue}>{routeData.distance} км</Text>
          </View>
        </View>
      </View>

      {/* Информация о пробках */}
      <View style={styles.trafficCard}>
        <View style={styles.trafficHeader}>
          <Text style={styles.trafficTitle}>Дорожная ситуация</Text>
          <View 
            style={[
              styles.trafficIndicator, 
              { backgroundColor: getTrafficColor() }
            ]} 
          />
        </View>
        <Text style={styles.trafficText}>{getTrafficText()}</Text>
        {routeData.trafficInfo.additionalTime > 0 && (
          <Text style={styles.trafficWarning}>
            ⚠️ Добавьте {routeData.trafficInfo.additionalTime} мин. к времени в пути
          </Text>
        )}
      </View>

      {/* Детальный маршрут */}
      <View style={styles.routeCard}>
        <Text style={styles.routeTitle}>Маршрут</Text>
        <View style={styles.stepsContainer}>
          {routeData.steps.map((step, index) => renderRouteStep(step, index))}
        </View>
      </View>

      {/* Кнопка открытия в Яндекс.Картах */}
      {routeData.mapUrl && (
        <TouchableOpacity
          style={styles.mapButton}
          onPress={() => {
            console.log('🗺️ Открываю маршрут в Яндекс.Картах:', routeData.mapUrl);
            Linking.openURL(routeData.mapUrl);
          }}
        >
          <Text style={styles.mapButtonText}>🗺️ Открыть маршрут в Яндекс.Картах</Text>
        </TouchableOpacity>
      )}

      {/* Кнопка обновления маршрута */}
      <TouchableOpacity
        style={styles.updateButton}
        onPress={() => loadRouteData()}
      >
        <Text style={styles.updateButtonText}>🔄 Обновить маршрут</Text>
      </TouchableOpacity>

      {/* Информационный блок */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          💡 Маршрут рассчитан по прямой. Для точного маршрута откройте Яндекс.Карты
        </Text>
      </View>
    </ScrollView>
  );
}

// Стили компонента
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  // Карточка адресов
  addressCard: {
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
  addressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  addressItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  addressIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  addressTextContainer: {
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: '#999',
    marginBottom: 3,
  },
  addressText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  addressArrow: {
    alignItems: 'center',
    marginVertical: 5,
  },
  arrowText: {
    fontSize: 20,
    color: '#007AFF',
  },
  // Индикатор загрузки
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  // Пустое состояние
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#f5f5f5',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
  },
  retryButton: {
    marginTop: 20,
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Карточка сводки
  summaryCard: {
    backgroundColor: '#fff',
    margin: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginBottom: 20,
  },
  timeBlock: {
    alignItems: 'center',
  },
  timeLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  timeValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  arrowContainer: {
    paddingHorizontal: 15,
  },
  arrow: {
    fontSize: 24,
    color: '#999',
  },
  summaryDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 5,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: '#e0e0e0',
  },
  // Карточка пробок
  trafficCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  trafficHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  trafficTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  trafficIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  trafficText: {
    fontSize: 15,
    color: '#666',
  },
  trafficWarning: {
    fontSize: 14,
    color: '#FF9500',
    marginTop: 10,
    padding: 10,
    backgroundColor: '#FFF9E6',
    borderRadius: 8,
  },
  // Карточка маршрута
  routeCard: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  routeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  stepsContainer: {
    paddingLeft: 5,
  },
  // Шаги маршрута
  stepContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stepIconContainer: {
    alignItems: 'center',
    marginRight: 15,
  },
  stepIcon: {
    fontSize: 24,
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#e0e0e0',
    marginTop: 5,
  },
  stepInfo: {
    flex: 1,
  },
  stepDescription: {
    fontSize: 15,
    color: '#333',
    marginBottom: 5,
  },
  stepDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDetailText: {
    fontSize: 13,
    color: '#999',
  },
  routeBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 10,
  },
  routeBadgeText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  // Кнопка открытия карт
  mapButton: {
    backgroundColor: '#007AFF',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mapButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Кнопка обновления
  updateButton: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginBottom: 15,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  updateButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  // Информационный блок
  infoBox: {
    backgroundColor: '#E8F4FD',
    marginHorizontal: 15,
    marginBottom: 30,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#B8DAFF',
  },
  infoText: {
    fontSize: 14,
    color: '#004085',
    lineHeight: 20,
  },
});
