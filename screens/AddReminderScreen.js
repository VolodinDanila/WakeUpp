/**
 * Экран добавления/редактирования напоминания
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { addReminder, updateReminder, loadSettings } from '../utils/storage';

export default function AddReminderScreen({ route, navigation }) {
  const editingReminder = route?.params?.reminder;
  const isEditing = !!editingReminder;

  const [title, setTitle] = useState('');
  const [address, setAddress] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [routeDuration, setRouteDuration] = useState('');
  const [selectedType, setSelectedType] = useState('meeting');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingReminder) {
      setTitle(editingReminder.title);
      setAddress(editingReminder.address || '');
      setRouteDuration(editingReminder.routeDuration?.toString() || '');
      setSelectedType(editingReminder.type || 'meeting');

      // Парсим дату и время
      const dt = new Date(editingReminder.datetime);
      setDate(dt.toISOString().split('T')[0]); // YYYY-MM-DD
      setTime(dt.toTimeString().substring(0, 5)); // HH:MM
    } else {
      // Устанавливаем дефолтную дату (завтра) и время (09:00)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDate(tomorrow.toISOString().split('T')[0]);
      setTime('09:00');
    }
  }, [editingReminder]);

  const handleOpenMaps = async () => {
    if (!address.trim()) {
      Alert.alert('Ошибка', 'Укажите адрес');
      return;
    }

    try {
      const settings = await loadSettings();
      if (!settings || !settings.homeAddress) {
        Alert.alert('Ошибка', 'Укажите домашний адрес в настройках');
        return;
      }

      // Формируем URL для Яндекс.Карт
      const url = `https://yandex.ru/maps/?rtext=${encodeURIComponent(settings.homeAddress)}~${encodeURIComponent(address)}&rtt=mt`;
      console.log('🗺️ Открываю маршрут в Яндекс.Картах');
      Linking.openURL(url);
    } catch (error) {
      Alert.alert('Ошибка', 'Не удалось открыть карты');
    }
  };

  const handleSave = async () => {
    // Валидация
    if (!title.trim()) {
      Alert.alert('Ошибка', 'Укажите название');
      return;
    }

    if (!address.trim()) {
      Alert.alert('Ошибка', 'Укажите адрес');
      return;
    }

    if (!date || !time) {
      Alert.alert('Ошибка', 'Укажите дату и время');
      return;
    }

    if (routeDuration && (isNaN(routeDuration) || parseInt(routeDuration) < 1)) {
      Alert.alert('Ошибка', 'Укажите корректное время маршрута');
      return;
    }

    setSaving(true);

    try {
      // Собираем datetime
      const datetime = new Date(`${date}T${time}:00`).toISOString();

      const reminderData = {
        title: title.trim(),
        address: address.trim(),
        datetime,
        type: selectedType,
        routeDuration: routeDuration ? parseInt(routeDuration) : null,
      };

      let success;
      if (isEditing) {
        success = await updateReminder(editingReminder.id, reminderData);
      } else {
        success = await addReminder(reminderData);
      }

      setSaving(false);

      if (success) {
        Alert.alert(
          'Успех!',
          isEditing ? 'Напоминание обновлено' : 'Напоминание добавлено',
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert('Ошибка', 'Не удалось сохранить напоминание');
      }
    } catch (error) {
      console.error('Ошибка сохранения напоминания:', error);
      setSaving(false);
      Alert.alert('Ошибка', 'Произошла ошибка при сохранении');
    }
  };

  const renderTypeButton = (type, label, emoji) => (
    <TouchableOpacity
      key={type}
      style={[
        styles.typeButton,
        selectedType === type && styles.typeButtonActive,
      ]}
      onPress={() => setSelectedType(type)}
    >
      <Text style={styles.typeEmoji}>{emoji}</Text>
      <Text
        style={[
          styles.typeText,
          selectedType === type && styles.typeTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {isEditing ? 'Редактирование напоминания' : 'Новое напоминание'}
        </Text>

        <Text style={styles.label}>Название</Text>
        <TextInput
          style={styles.textInput}
          value={title}
          onChangeText={setTitle}
          placeholder="Встреча, мероприятие..."
          placeholderTextColor="#999"
        />

        <Text style={[styles.label, styles.labelMarginTop]}>Адрес</Text>
        <TextInput
          style={styles.textInput}
          value={address}
          onChangeText={setAddress}
          placeholder="Куда нужно приехать"
          placeholderTextColor="#999"
          multiline
        />

        <Text style={[styles.label, styles.labelMarginTop]}>Дата (ГГГГ-ММ-ДД)</Text>
        <TextInput
          style={styles.textInput}
          value={date}
          onChangeText={setDate}
          placeholder="2025-01-15"
          placeholderTextColor="#999"
        />

        <Text style={[styles.label, styles.labelMarginTop]}>Время (ЧЧ:ММ)</Text>
        <TextInput
          style={styles.textInput}
          value={time}
          onChangeText={setTime}
          placeholder="09:00"
          placeholderTextColor="#999"
        />

        <Text style={[styles.label, styles.labelMarginTop]}>Тип</Text>
        <View style={styles.typeContainer}>
          {renderTypeButton('meeting', 'Встреча', '🤝')}
          {renderTypeButton('event', 'Мероприятие', '🎉')}
          {renderTypeButton('appointment', 'Важное', '📅')}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🗺️ Маршрут</Text>
        <Text style={styles.helperText}>
          Откройте Яндекс.Карты, посмотрите время маршрута и введите его ниже
        </Text>

        <TouchableOpacity style={styles.mapsButton} onPress={handleOpenMaps}>
          <Text style={styles.mapsButtonText}>
            🗺️ Открыть маршрут в Яндекс.Картах
          </Text>
        </TouchableOpacity>

        <Text style={[styles.label, styles.labelMarginTop]}>Время в пути (минуты)</Text>
        <TextInput
          style={styles.textInput}
          value={routeDuration}
          onChangeText={setRouteDuration}
          placeholder="60"
          keyboardType="numeric"
          placeholderTextColor="#999"
        />
      </View>

      <TouchableOpacity
        style={[styles.saveButton, saving && styles.saveButtonDisabled]}
        onPress={handleSave}
        disabled={saving}
      >
        <Text style={styles.saveButtonText}>
          {saving ? 'Сохранение...' : isEditing ? 'Сохранить изменения' : 'Добавить напоминание'}
        </Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 8,
  },
  labelMarginTop: {
    marginTop: 15,
  },
  textInput: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  helperText: {
    fontSize: 13,
    color: '#999',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  typeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  typeButton: {
    flex: 1,
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e0e0e0',
  },
  typeButtonActive: {
    backgroundColor: '#E8F4FD',
    borderColor: '#007AFF',
  },
  typeEmoji: {
    fontSize: 24,
    marginBottom: 6,
  },
  typeText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  typeTextActive: {
    color: '#007AFF',
    fontWeight: '600',
  },
  mapsButton: {
    backgroundColor: '#007AFF',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  mapsButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#34C759',
    marginHorizontal: 15,
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '600',
  },
});
