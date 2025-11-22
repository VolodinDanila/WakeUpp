/**
 * Экран настроек (SettingsScreen)
 *
 * Позволяет пользователю настроить:
 * - Время утренней рутины (сколько нужно времени на сборы)
 * - Домашний адрес
 * - Адрес университета
 * - Предпочитаемый способ транспорта
 * - Другие параметры будильника
 *
 * Настройки сохраняются в AsyncStorage и загружаются при запуске
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Switch,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { saveSettings, loadSettings } from '../utils/storage';

export default function SettingsScreen() {
    // Состояния для настроек
    const [morningRoutine, setMorningRoutine] = useState('60'); // Время в минутах
    const [homeAddress, setHomeAddress] = useState('');
    const [groupNumber, setGroupNumber] = useState('');
    const [campusAddresses, setCampusAddresses] = useState([
        { code: 'пр', name: 'Прянишникова', address: '' },
        { code: 'пк', name: 'Павла Корчагина', address: '' },
        { code: 'ав', name: 'Автозаводская', address: '' },
        { code: 'бс', name: 'Большая Семеновская', address: '' },
    ]);
    const [customRouteDuration, setCustomRouteDuration] = useState(''); // Ручной ввод времени (минуты)
    const [transportType, setTransportType] = useState('public'); // public, car, walk
    const [extraTime, setExtraTime] = useState('10'); // Дополнительное время запаса
    const [weatherNotifications, setWeatherNotifications] = useState(true);
    const [trafficNotifications, setTrafficNotifications] = useState(true);

    // Состояние загрузки
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    /**
     * Загрузка настроек при запуске экрана
     */
    useEffect(() => {
        loadSettingsFromStorage();
    }, []);

    /**
     * Загрузка сохраненных настроек из AsyncStorage
     */
    const loadSettingsFromStorage = async () => {
        setLoading(true);
        const savedSettings = await loadSettings();

        if (savedSettings) {
            // Восстанавливаем все сохраненные настройки
            setMorningRoutine(savedSettings.morningRoutine || '60');
            setHomeAddress(savedSettings.homeAddress || '');
            setGroupNumber(savedSettings.groupNumber || '');

            // Поддержка старого формата (universityAddress) и нового (campusAddresses)
            if (savedSettings.campusAddresses && Array.isArray(savedSettings.campusAddresses)) {
                setCampusAddresses(savedSettings.campusAddresses);
            } else if (savedSettings.universityAddress) {
                // Миграция: старый адрес становится корпусом "пр" (по умолчанию)
                const migrated = [
                    { code: 'пр', name: 'Прянишникова', address: savedSettings.universityAddress },
                    { code: 'пк', name: 'Павла Корчагина', address: '' },
                    { code: 'ав', name: 'Автозаводская', address: '' },
                    { code: 'бс', name: 'Большая Семеновская', address: '' },
                ];
                setCampusAddresses(migrated);
            }

            setCustomRouteDuration(savedSettings.customRouteDuration || '');
            setTransportType(savedSettings.transportType || 'public');
            setExtraTime(savedSettings.extraTime || '10');
            setWeatherNotifications(savedSettings.weatherNotifications ?? true);
            setTrafficNotifications(savedSettings.trafficNotifications ?? true);

            console.log('📱 Настройки загружены:', savedSettings);
        } else {
            console.log('📱 Нет сохраненных настроек, используются значения по умолчанию');
        }

        setLoading(false);
    };

    /**
     * Функция сохранения настроек в AsyncStorage
     */
    const handleSaveSettings = async () => {
        // Валидация данных
        if (!homeAddress.trim()) {
            Alert.alert('Ошибка', 'Укажите домашний адрес');
            return;
        }

        // Проверяем что хотя бы один корпус заполнен
        const hasAnyCampus = campusAddresses.some(campus => campus.address.trim());
        if (!hasAnyCampus) {
            Alert.alert('Ошибка', 'Укажите адрес хотя бы одного корпуса университета');
            return;
        }

        if (!morningRoutine || isNaN(morningRoutine) || parseInt(morningRoutine) < 1) {
            Alert.alert('Ошибка', 'Укажите корректное время утренней рутины (минимум 1 минута)');
            return;
        }

        if (!extraTime || isNaN(extraTime) || parseInt(extraTime) < 0) {
            Alert.alert('Ошибка', 'Укажите корректное дополнительное время');
            return;
        }

        // Валидация ручного времени маршрута (если указано)
        if (customRouteDuration && (isNaN(customRouteDuration) || parseInt(customRouteDuration) < 1)) {
            Alert.alert('Ошибка', 'Укажите корректное время маршрута (минимум 1 минута)');
            return;
        }

        setSaving(true);

        // Объект с настройками
        const settings = {
            morningRoutine,
            homeAddress,
            groupNumber,
            campusAddresses,
            customRouteDuration,
            transportType,
            extraTime,
            weatherNotifications,
            trafficNotifications,
            updatedAt: new Date().toISOString(),
        };

        console.log('💾 Сохраняю настройки:', settings);

        // Сохранение в AsyncStorage
        const success = await saveSettings(settings);

        setSaving(false);

        if (success) {
            Alert.alert(
                'Успех! ✅',
                'Настройки сохранены. Теперь приложение сможет рассчитать оптимальное время будильника.',
                [{ text: 'OK' }]
            );
        } else {
            Alert.alert('Ошибка', 'Не удалось сохранить настройки');
        }
    };

    /**
     * Рендер кнопки выбора транспорта
     */
    const renderTransportButton = (type, label, emoji) => (
        <TouchableOpacity
            key={type}
            style={[
                styles.transportButton,
                transportType === type && styles.transportButtonActive,
            ]}
            onPress={() => setTransportType(type)}
        >
            <Text style={styles.transportEmoji}>{emoji}</Text>
            <Text
                style={[
                    styles.transportText,
                    transportType === type && styles.transportTextActive,
                ]}
            >
                {label}
            </Text>
        </TouchableOpacity>
    );

    // Показываем лоадер при загрузке
    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Загрузка настроек...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Секция времени утренней рутины */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⏰ Утренняя рутина</Text>
                <Text style={styles.sectionDescription}>
                    Сколько времени вам нужно на утренние сборы?
                </Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={morningRoutine}
                        onChangeText={setMorningRoutine}
                        placeholder="60"
                        keyboardType="numeric"
                        maxLength={3}
                    />
                    <Text style={styles.inputLabel}>минут</Text>
                </View>
            </View>

            {/* Секция адресов */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>📍 Адреса</Text>

                <Text style={styles.label}>Домашний адрес</Text>
                <TextInput
                    style={styles.textInput}
                    value={homeAddress}
                    onChangeText={setHomeAddress}
                    placeholder="Например: Москва, ул. Ленина, д. 15"
                    placeholderTextColor="#999"
                />

                <Text style={[styles.label, styles.labelMarginTop]}>Корпуса университета</Text>
                <Text style={styles.helperText}>
                    Укажите адреса корпусов, в которых у вас проходят занятия
                </Text>

                {campusAddresses.map((campus, index) => (
                    <View key={campus.code} style={styles.campusInputContainer}>
                        <Text style={styles.campusCode}>{campus.code.toUpperCase()}</Text>
                        <View style={styles.campusTextInputContainer}>
                            <Text style={styles.campusName}>{campus.name}</Text>
                            <TextInput
                                style={styles.campusTextInput}
                                value={campus.address}
                                onChangeText={(text) => {
                                    const updated = [...campusAddresses];
                                    updated[index].address = text;
                                    setCampusAddresses(updated);
                                }}
                                placeholder="Адрес корпуса"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>
                ))}
            </View>
            {/* Секция номера группы */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🎓 Учебная группа</Text>

                <Text style={styles.label}>Номер группы</Text>
                <TextInput
                    style={styles.textInput}
                    value={groupNumber}
                    onChangeText={setGroupNumber}
                    placeholder="Например: 231-324"
                    placeholderTextColor="#999"
                />
                <Text style={styles.helperText}>
                    Введите номер вашей группы для автоматической загрузки расписания
                </Text>
            </View>
            {/* Секция выбора транспорта */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🚗 Способ передвижения</Text>
                <Text style={styles.sectionDescription}>
                    Как вы добираетесь до университета?
                </Text>

                <View style={styles.transportContainer}>
                    {renderTransportButton('public', 'Общественный\nтранспорт', '🚌')}
                    {renderTransportButton('car', 'Личный\nавтомобиль', '🚗')}
                    {renderTransportButton('walk', 'Пешком', '🚶')}
                </View>
            </View>

            {/* Секция ручного ввода времени маршрута */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🗺️ Время в пути</Text>
                <Text style={styles.sectionDescription}>
                    Откройте Яндекс.Карты, посмотрите время маршрута и введите его здесь
                </Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={customRouteDuration}
                        onChangeText={setCustomRouteDuration}
                        placeholder="90"
                        keyboardType="numeric"
                        maxLength={3}
                    />
                    <Text style={styles.inputLabel}>минут</Text>
                </View>
                <Text style={styles.helperText}>
                    💡 Это время будет использоваться для расчета будильника вместо автоматического
                </Text>
            </View>

            {/* Секция дополнительного времени */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>⏱️ Дополнительное время</Text>
                <Text style={styles.sectionDescription}>
                    Запас времени на непредвиденные обстоятельства
                </Text>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={extraTime}
                        onChangeText={setExtraTime}
                        placeholder="10"
                        keyboardType="numeric"
                        maxLength={2}
                    />
                    <Text style={styles.inputLabel}>минут</Text>
                </View>
            </View>

            {/* Секция уведомлений */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔔 Уведомления</Text>

                {/* Переключатель уведомлений о погоде */}
                <View style={styles.switchContainer}>
                    <View style={styles.switchLabelContainer}>
                        <Text style={styles.switchLabel}>Уведомления о погоде</Text>
                        <Text style={styles.switchDescription}>
                            Получать информацию о погоде утром
                        </Text>
                    </View>
                    <Switch
                        value={weatherNotifications}
                        onValueChange={setWeatherNotifications}
                        trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                        thumbColor="#fff"
                    />
                </View>

                {/* Переключатель уведомлений о пробках */}
                <View style={styles.switchContainer}>
                    <View style={styles.switchLabelContainer}>
                        <Text style={styles.switchLabel}>Уведомления о пробках</Text>
                        <Text style={styles.switchDescription}>
                            Предупреждать о пробках на маршруте
                        </Text>
                    </View>
                    <Switch
                        value={trafficNotifications}
                        onValueChange={setTrafficNotifications}
                        trackColor={{ false: '#e0e0e0', true: '#007AFF' }}
                        thumbColor="#fff"
                    />
                </View>
            </View>

            {/* Кнопка сохранения */}
            <TouchableOpacity
                style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                onPress={handleSaveSettings}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="#fff" />
                ) : (
                    <Text style={styles.saveButtonText}>Сохранить настройки</Text>
                )}
            </TouchableOpacity>

            {/* Информационный блок */}
            <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                    💡 Приложение автоматически рассчитает время будильника на основе
                    ваших настроек, расписания и текущей дорожной ситуации.
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
    // Секции
    section: {
        backgroundColor: '#fff',
        marginTop: 15,
        padding: 20,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#e0e0e0',
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: 5,
    },
    sectionDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 15,
    },
    // Поля ввода
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 15,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    input: {
        fontSize: 24,
        fontWeight: '600',
        color: '#007AFF',
        minWidth: 60,
        textAlign: 'center',
    },
    inputLabel: {
        fontSize: 16,
        color: '#666',
        marginLeft: 10,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#333',
        marginBottom: 8,
    },
    labelMarginTop: {
        marginTop: 15,
    },
    textInput: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 15,
        fontSize: 16,
        color: '#333',
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
    // Кнопки транспорта
    transportContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    transportButton: {
        flex: 1,
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 15,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e0e0e0',
    },
    transportButtonActive: {
        backgroundColor: '#E8F4FD',
        borderColor: '#007AFF',
    },
    transportEmoji: {
        fontSize: 30,
        marginBottom: 8,
    },
    transportText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    transportTextActive: {
        color: '#007AFF',
        fontWeight: '600',
    },
    // Переключатели
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    switchLabelContainer: {
        flex: 1,
        marginRight: 15,
    },
    switchLabel: {
        fontSize: 16,
        color: '#333',
        marginBottom: 3,
    },
    switchDescription: {
        fontSize: 13,
        color: '#999',
    },
    // Кнопка сохранения
    saveButton: {
        backgroundColor: '#007AFF',
        margin: 20,
        marginTop: 25,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    saveButtonDisabled: {
        opacity: 0.6,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    // Информационный блок
    infoBox: {
        backgroundColor: '#FFF9E6',
        margin: 20,
        marginTop: 0,
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#FFE88C',
        marginBottom: 30,
    },
    infoText: {
        fontSize: 14,
        color: '#8B7500',
        lineHeight: 20,
    },
    helperText: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
        fontStyle: 'italic',
    },
    // Стили для корпусов
    campusInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 12,
    },
    campusCode: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#007AFF',
        width: 40,
        textAlign: 'center',
    },
    campusTextInputContainer: {
        flex: 1,
        marginLeft: 10,
    },
    campusName: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    campusTextInput: {
        fontSize: 14,
        color: '#333',
        padding: 8,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#e0e0e0',
    },
});