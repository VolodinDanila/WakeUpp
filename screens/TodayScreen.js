/**
 * Экран "Сегодня"
 * Показывает расписание занятий и напоминания на сегодняшний день
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  RefreshControl,
} from 'react-native';
import { loadSettings } from '../utils/storage';
import { loadReminders } from '../utils/storage';
import { getScheduleForToday } from '../api/schedule';
import { extractCampusCode, getCampusAddress } from '../utils/campusHelper';

export default function TodayScreen() {
  const [schedule, setSchedule] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Загружаем настройки
      const settingsData = await loadSettings();
      setSettings(settingsData);

      // Загружаем расписание на сегодня
      if (settingsData.groupNumber) {
        const todaySchedule = await getScheduleForToday(settingsData.groupNumber);
        setSchedule(todaySchedule);
      }

      // Загружаем напоминания и фильтруем на сегодня
      const allReminders = await loadReminders();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayReminders = allReminders.filter((reminder) => {
        const reminderDate = new Date(reminder.datetime);
        return reminderDate >= today && reminderDate < tomorrow;
      });

      setReminders(todayReminders.sort((a, b) => new Date(a.datetime) - new Date(b.datetime)));
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openRoute = (address) => {
    if (!settings || !settings.homeAddress) {
      alert('Сначала укажите домашний адрес в настройках');
      return;
    }

    const url = `https://yandex.ru/maps/?rtext=${encodeURIComponent(
      settings.homeAddress
    )}~${encodeURIComponent(address)}&rtt=mt`;

    Linking.openURL(url);
  };

  const getTypeIcon = (type) => {
    const icons = {
      meeting: '🤝',
      event: '🎉',
      appointment: '⚡',
    };
    return icons[type] || '📌';
  };

  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    // Убираем HTML теги если есть
    return timeStr.replace(/<[^>]*>/g, '').trim();
  };

  const formatReminderTime = (datetime) => {
    const date = new Date(datetime);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Загрузка...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Заголовок даты */}
      <View style={styles.dateHeader}>
        <Text style={styles.dateText}>
          {new Date().toLocaleDateString('ru-RU', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      {/* Расписание занятий */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📚 Занятия</Text>
        {schedule.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Занятий сегодня нет</Text>
          </View>
        ) : (
          schedule.map((lesson, index) => {
            const campusCode = extractCampusCode(lesson.room || '');
            const campusAddress = campusCode && settings?.campusAddresses
              ? getCampusAddress(campusCode, settings.campusAddresses)
              : null;

            return (
              <View key={index} style={styles.lessonCard}>
                <View style={styles.lessonHeader}>
                  <Text style={styles.lessonTime}>{formatTime(lesson.time)}</Text>
                  {campusCode && (
                    <View style={styles.campusBadge}>
                      <Text style={styles.campusText}>{campusCode.toUpperCase()}</Text>
                    </View>
                  )}
                </View>
                <Text style={styles.lessonTitle}>{lesson.subject}</Text>
                <Text style={styles.lessonRoom}>📍 {lesson.room}</Text>
                <Text style={styles.lessonType}>{lesson.type}</Text>

                {campusAddress && (
                  <TouchableOpacity
                    style={styles.routeButton}
                    onPress={() => openRoute(campusAddress)}
                  >
                    <Text style={styles.routeButtonText}>🗺️ Маршрут</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}
      </View>

      {/* Напоминания */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔔 Напоминания</Text>
        {reminders.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>Напоминаний сегодня нет</Text>
          </View>
        ) : (
          reminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderCard}>
              <View style={styles.reminderHeader}>
                <Text style={styles.reminderIcon}>{getTypeIcon(reminder.type)}</Text>
                <Text style={styles.reminderTime}>{formatReminderTime(reminder.datetime)}</Text>
              </View>
              <Text style={styles.reminderTitle}>{reminder.title}</Text>
              <Text style={styles.reminderAddress}>📍 {reminder.address}</Text>
              {reminder.routeDuration > 0 && (
                <Text style={styles.reminderRoute}>🚌 {reminder.routeDuration} мин</Text>
              )}
              <TouchableOpacity
                style={styles.routeButton}
                onPress={() => openRoute(reminder.address)}
              >
                <Text style={styles.routeButtonText}>🗺️ Маршрут</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centered: {
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
  dateHeader: {
    backgroundColor: '#007AFF',
    padding: 20,
    alignItems: 'center',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    textTransform: 'capitalize',
  },
  section: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  emptyCard: {
    backgroundColor: '#fff',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
  },
  lessonCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lessonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  campusBadge: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  campusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  lessonTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  lessonRoom: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  lessonType: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
  routeButton: {
    backgroundColor: '#34C759',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  routeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  reminderCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reminderHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  reminderIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  reminderTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  reminderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 6,
  },
  reminderAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  reminderRoute: {
    fontSize: 14,
    color: '#999',
    marginBottom: 12,
  },
});
