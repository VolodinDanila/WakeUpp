/**
 * Экран управления пользовательскими занятиями
 * Для занятий типа "Проектная деятельность" и "Физическая культура"
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import {
  loadCustomLessons,
  addCustomLesson,
  deleteCustomLesson,
} from '../utils/storage';

const DAYS = [
  { number: 1, name: 'Понедельник' },
  { number: 2, name: 'Вторник' },
  { number: 3, name: 'Среда' },
  { number: 4, name: 'Четверг' },
  { number: 5, name: 'Пятница' },
  { number: 6, name: 'Суббота' },
];

const LESSON_TIMES = {
  1: '09:00-10:30',
  2: '10:40-12:10',
  3: '12:20-13:50',
  4: '14:30-16:00',
  5: '16:10-17:40',
  6: '17:50-19:20',
  7: '19:30-21:00',
};

export default function CustomLessonsScreen({ navigation }) {
  const [lessons, setLessons] = useState([]);
  const [showForm, setShowForm] = useState(false);

  // Форма
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedLessonNumber, setSelectedLessonNumber] = useState(1);
  const [subject, setSubject] = useState('');
  const [type, setType] = useState('');
  const [room, setRoom] = useState('');

  useEffect(() => {
    loadLessons();
  }, []);

  const loadLessons = async () => {
    const data = await loadCustomLessons();
    setLessons(data);
  };

  const handleAddLesson = async () => {
    if (!subject.trim()) {
      Alert.alert('Ошибка', 'Укажите название предмета');
      return;
    }

    const lesson = {
      dayNumber: selectedDay,
      lessonNumber: selectedLessonNumber,
      time: LESSON_TIMES[selectedLessonNumber],
      subject: subject.trim(),
      type: type.trim() || 'Занятие',
      room: room.trim() || 'Не указана',
    };

    await addCustomLesson(lesson);
    await loadLessons();

    // Очищаем форму
    setSubject('');
    setType('');
    setRoom('');
    setShowForm(false);

    Alert.alert('Успех', 'Занятие добавлено');
  };

  const handleDeleteLesson = async (id) => {
    Alert.alert(
      'Удалить занятие?',
      'Это действие нельзя отменить',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            await deleteCustomLesson(id);
            await loadLessons();
          },
        },
      ]
    );
  };

  const getDayName = (dayNumber) => {
    const day = DAYS.find(d => d.number === dayNumber);
    return day ? day.name : `День ${dayNumber}`;
  };

  // Группируем занятия по дням
  const lessonsByDay = {};
  lessons.forEach(lesson => {
    if (!lessonsByDay[lesson.dayNumber]) {
      lessonsByDay[lesson.dayNumber] = [];
    }
    lessonsByDay[lesson.dayNumber].push(lesson);
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Мои занятия</Text>
        <Text style={styles.subtitle}>
          Добавьте свои занятия (Проектная деятельность, Физкультура и др.)
        </Text>
      </View>

      {/* Список занятий */}
      {Object.keys(lessonsByDay).length > 0 ? (
        Object.keys(lessonsByDay)
          .sort((a, b) => a - b)
          .map(dayNumber => (
            <View key={dayNumber} style={styles.daySection}>
              <Text style={styles.dayTitle}>{getDayName(parseInt(dayNumber))}</Text>
              {lessonsByDay[dayNumber]
                .sort((a, b) => a.lessonNumber - b.lessonNumber)
                .map(lesson => (
                  <View key={lesson.id} style={styles.lessonCard}>
                    <View style={styles.lessonInfo}>
                      <Text style={styles.lessonTime}>{lesson.time}</Text>
                      <Text style={styles.lessonSubject}>{lesson.subject}</Text>
                      <Text style={styles.lessonDetails}>
                        {lesson.type} • {lesson.room}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteLesson(lesson.id)}
                    >
                      <Text style={styles.deleteButtonText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                ))}
            </View>
          ))
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Нет добавленных занятий</Text>
          <Text style={styles.emptyHint}>
            Нажмите кнопку ниже, чтобы добавить первое занятие
          </Text>
        </View>
      )}

      {/* Форма добавления */}
      {showForm ? (
        <View style={styles.form}>
          <Text style={styles.formTitle}>Новое занятие</Text>

          {/* День недели */}
          <Text style={styles.label}>День недели</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.dayPicker}>
            {DAYS.map(day => (
              <TouchableOpacity
                key={day.number}
                style={[
                  styles.dayButton,
                  selectedDay === day.number && styles.dayButtonActive,
                ]}
                onPress={() => setSelectedDay(day.number)}
              >
                <Text
                  style={[
                    styles.dayButtonText,
                    selectedDay === day.number && styles.dayButtonTextActive,
                  ]}
                >
                  {day.name.slice(0, 2)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Номер пары */}
          <Text style={styles.label}>Пара</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.lessonPicker}>
            {Object.keys(LESSON_TIMES).map(num => (
              <TouchableOpacity
                key={num}
                style={[
                  styles.lessonButton,
                  selectedLessonNumber === parseInt(num) && styles.lessonButtonActive,
                ]}
                onPress={() => setSelectedLessonNumber(parseInt(num))}
              >
                <Text
                  style={[
                    styles.lessonButtonText,
                    selectedLessonNumber === parseInt(num) && styles.lessonButtonTextActive,
                  ]}
                >
                  {num}
                </Text>
                <Text style={styles.lessonButtonTime}>{LESSON_TIMES[num]}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Предмет */}
          <Text style={styles.label}>Предмет *</Text>
          <TextInput
            style={styles.input}
            value={subject}
            onChangeText={setSubject}
            placeholder="Проектная деятельность"
            placeholderTextColor="#999"
          />

          {/* Тип */}
          <Text style={styles.label}>Тип занятия</Text>
          <TextInput
            style={styles.input}
            value={type}
            onChangeText={setType}
            placeholder="Практика"
            placeholderTextColor="#999"
          />

          {/* Аудитория */}
          <Text style={styles.label}>Аудитория</Text>
          <TextInput
            style={styles.input}
            value={room}
            onChangeText={setRoom}
            placeholder="пр-123"
            placeholderTextColor="#999"
          />

          {/* Кнопки */}
          <View style={styles.formButtons}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={() => {
                setShowForm(false);
                setSubject('');
                setType('');
                setRoom('');
              }}
            >
              <Text style={styles.cancelButtonText}>Отмена</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleAddLesson}
            >
              <Text style={styles.saveButtonText}>Добавить</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.addButtonText}>+ Добавить занятие</Text>
        </TouchableOpacity>
      )}

      <View style={styles.spacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  daySection: {
    marginTop: 20,
    paddingHorizontal: 15,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 10,
  },
  lessonCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lessonInfo: {
    flex: 1,
  },
  lessonTime: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  lessonSubject: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  lessonDetails: {
    fontSize: 14,
    color: '#666',
  },
  deleteButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#FF3B30',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginBottom: 8,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  form: {
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
  formTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#333',
  },
  dayPicker: {
    marginBottom: 10,
  },
  dayButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
  },
  dayButtonActive: {
    backgroundColor: '#007AFF',
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  lessonPicker: {
    marginBottom: 10,
  },
  lessonButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    marginRight: 8,
    alignItems: 'center',
  },
  lessonButtonActive: {
    backgroundColor: '#007AFF',
  },
  lessonButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  lessonButtonTextActive: {
    color: '#fff',
  },
  lessonButtonTime: {
    fontSize: 10,
    color: '#999',
    marginTop: 2,
  },
  formButtons: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    backgroundColor: '#007AFF',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  addButton: {
    backgroundColor: '#007AFF',
    margin: 15,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  spacer: {
    height: 30,
  },
});
