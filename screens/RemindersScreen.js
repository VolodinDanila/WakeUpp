/**
 * Экран напоминаний (RemindersScreen)
 *
 * Отображает список всех напоминаний (встречи, мероприятия)
 * с возможностью добавления, редактирования и удаления
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
import { loadReminders, deleteReminder } from '../utils/storage';

export default function RemindersScreen({ navigation }) {
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);

  /**
   * Загрузка напоминаний при монтировании
   */
  useEffect(() => {
    loadRemindersData();

    // Обновляем список при возвращении на экран
    const unsubscribe = navigation.addListener('focus', () => {
      loadRemindersData();
    });

    return unsubscribe;
  }, [navigation]);

  /**
   * Загрузка напоминаний из хранилища
   */
  const loadRemindersData = async () => {
    setLoading(true);
    try {
      const data = await loadReminders();
      // Сортируем по дате (ближайшие сначала)
      const sorted = data.sort((a, b) => new Date(a.datetime) - new Date(b.datetime));
      setReminders(sorted);
    } catch (error) {
      console.error('Ошибка загрузки напоминаний:', error);
    }
    setLoading(false);
  };

  /**
   * Удаление напоминания
   */
  const handleDelete = (id, title) => {
    Alert.alert(
      'Удалить напоминание?',
      `Вы уверены, что хотите удалить "${title}"?`,
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            const success = await deleteReminder(id);
            if (success) {
              loadRemindersData();
            }
          },
        },
      ]
    );
  };

  /**
   * Форматирование даты и времени
   */
  const formatDateTime = (datetimeString) => {
    const date = new Date(datetimeString);
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const timeStr = date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
    });

    const dateStr = date.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
    });

    // Проверяем сегодня или завтра
    if (date.toDateString() === now.toDateString()) {
      return `Сегодня в ${timeStr}`;
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return `Завтра в ${timeStr}`;
    }

    return `${dateStr} в ${timeStr}`;
  };

  /**
   * Получение иконки для типа напоминания
   */
  const getTypeIcon = (type) => {
    switch (type) {
      case 'meeting':
        return '🤝';
      case 'event':
        return '🎉';
      case 'appointment':
        return '📅';
      default:
        return '📍';
    }
  };

  /**
   * Получение названия типа
   */
  const getTypeName = (type) => {
    switch (type) {
      case 'meeting':
        return 'Встреча';
      case 'event':
        return 'Мероприятие';
      case 'appointment':
        return 'Важное';
      default:
        return 'Напоминание';
    }
  };

  /**
   * Проверка просрочено ли напоминание
   */
  const isPast = (datetimeString) => {
    return new Date(datetimeString) < new Date();
  };

  /**
   * Рендер карточки напоминания
   */
  const renderReminderCard = (reminder) => {
    const past = isPast(reminder.datetime);

    return (
      <View key={reminder.id} style={[styles.card, past && styles.cardPast]}>
        <TouchableOpacity
          style={styles.cardContent}
          onPress={() => navigation.navigate('AddReminder', { reminder })}
        >
          {/* Иконка типа */}
          <View style={styles.iconContainer}>
            <Text style={styles.typeIcon}>{getTypeIcon(reminder.type)}</Text>
          </View>

          {/* Основная информация */}
          <View style={styles.mainInfo}>
            <Text style={[styles.title, past && styles.textPast]}>
              {reminder.title}
            </Text>
            <Text style={[styles.datetime, past && styles.textPast]}>
              ⏰ {formatDateTime(reminder.datetime)}
            </Text>
            {reminder.address && (
              <Text style={[styles.address, past && styles.textPast]} numberOfLines={1}>
                📍 {reminder.address}
              </Text>
            )}
            {reminder.routeDuration && (
              <Text style={[styles.route, past && styles.textPast]}>
                🚌 Время в пути: {reminder.routeDuration} мин
              </Text>
            )}
          </View>

          {/* Кнопка удаления */}
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDelete(reminder.id, reminder.title)}
          >
            <Text style={styles.deleteButtonText}>✕</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Рендер индикатора загрузки
   */
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка напоминаний...</Text>
      </View>
    );
  }

  /**
   * Рендер пустого состояния
   */
  if (reminders.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📅</Text>
          <Text style={styles.emptyTitle}>Нет напоминаний</Text>
          <Text style={styles.emptyText}>
            Добавьте напоминания о встречах и мероприятиях, чтобы приложение рассчитало когда нужно выехать
          </Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddReminder')}
          >
            <Text style={styles.addButtonText}>+ Добавить напоминание</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {reminders.map(reminder => renderReminderCard(reminder))}
      </ScrollView>

      {/* Кнопка добавления */}
      <TouchableOpacity
        style={styles.fabButton}
        onPress={() => navigation.navigate('AddReminder')}
      >
        <Text style={styles.fabButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
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
    marginTop: 100,
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  addButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // Карточка напоминания
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardPast: {
    opacity: 0.6,
    backgroundColor: '#f8f8f8',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'center',
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#E8F4FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  typeIcon: {
    fontSize: 24,
  },
  mainInfo: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  datetime: {
    fontSize: 14,
    color: '#007AFF',
    marginBottom: 4,
  },
  address: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  route: {
    fontSize: 13,
    color: '#666',
  },
  textPast: {
    color: '#999',
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE5E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteButtonText: {
    fontSize: 18,
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  // FAB кнопка
  fabButton: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '300',
  },
});
