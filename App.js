/**
 * Главный файл приложения StudentAlarm
 * 
 * Это приложение помогает студентам просыпаться вовремя,
 * учитывая их утреннюю рутину, расписание занятий и время в пути
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StyleSheet } from 'react-native';

// Импорт экранов приложения
import HomeScreen from './screens/HomeScreen';
import ScheduleScreen from './screens/ScheduleScreen';
import SettingsScreen from './screens/SettingsScreen';
import TodayScreen from './screens/TodayScreen';
import RemindersScreen from './screens/RemindersScreen';
import AddReminderScreen from './screens/AddReminderScreen';
import CustomLessonsScreen from './screens/CustomLessonsScreen';

// Создание навигаторов
const Tab = createBottomTabNavigator();
const RemindersStack = createStackNavigator();
const SettingsStack = createStackNavigator();

/**
 * Стек навигации для напоминаний
 * Содержит список напоминаний и форму добавления/редактирования
 */
function RemindersStackScreen() {
  return (
    <RemindersStack.Navigator>
      <RemindersStack.Screen
        name="RemindersList"
        component={RemindersScreen}
        options={{
          title: 'Напоминания',
          headerStyle: styles.header,
          headerTintColor: '#fff',
        }}
      />
      <RemindersStack.Screen
        name="AddReminder"
        component={AddReminderScreen}
        options={{
          title: 'Напоминание',
          headerStyle: styles.header,
          headerTintColor: '#fff',
        }}
      />
    </RemindersStack.Navigator>
  );
}

/**
 * Стек навигации для настроек
 * Содержит основные настройки и управление пользовательскими занятиями
 */
function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="SettingsMain"
        component={SettingsScreen}
        options={{
          title: 'Настройки',
          headerStyle: styles.header,
          headerTintColor: '#fff',
        }}
      />
      <SettingsStack.Screen
        name="CustomLessons"
        component={CustomLessonsScreen}
        options={{
          title: 'Мои занятия',
          headerStyle: styles.header,
          headerTintColor: '#fff',
        }}
      />
    </SettingsStack.Navigator>
  );
}

/**
 * Главный компонент приложения
 * Настраивает навигацию между основными экранами
 */
export default function App() {
  return (
    <NavigationContainer>
      {/* Навигация с вкладками внизу экрана */}
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#007AFF', // Цвет активной вкладки
          tabBarInactiveTintColor: 'gray',   // Цвет неактивной вкладки
          tabBarStyle: styles.tabBar,
          headerStyle: styles.header,
          headerTintColor: '#fff',
        }}
      >
        {/* Главный экран - отображение следующего будильника и сводки */}
        <Tab.Screen 
          name="Главная" 
          component={HomeScreen}
          options={{
            tabBarLabel: 'Главная',
            // tabBarIcon можно добавить позже с иконками
          }}
        />
        
        {/* Экран "Сегодня" - занятия и напоминания на день */}
        <Tab.Screen
          name="Сегодня"
          component={TodayScreen}
          options={{
            tabBarLabel: 'Сегодня',
          }}
        />

        {/* Экран расписания занятий */}
        <Tab.Screen
          name="Расписание"
          component={ScheduleScreen}
          options={{
            tabBarLabel: 'Расписание',
          }}
        />

        {/* Экран напоминаний (встречи, мероприятия) */}
        <Tab.Screen
          name="Напоминания"
          component={RemindersStackScreen}
          options={{
            tabBarLabel: 'Напоминания',
            headerShown: false, // Заголовок показывает внутренний стек
          }}
        />
        
        {/* Экран настроек (время рутины, адрес и т.д.) */}
        <Tab.Screen
          name="Настройки"
          component={SettingsStackScreen}
          options={{
            tabBarLabel: 'Настройки',
            headerShown: false, // Заголовок показывает внутренний стек
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

// Стили для навигации
const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    height: 60,
    paddingBottom: 8,
    paddingTop: 8,
  },
  header: {
    backgroundColor: '#007AFF',
  },
});
