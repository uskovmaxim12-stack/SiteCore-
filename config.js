// Конфигурация приложения
const AppConfig = {
    // Используем PocketBase как бесплатную облачную базу
    API_URL: 'https://sitecore.pockethost.io',
    // Для разработки можно использовать localStorage как fallback
    USE_LOCAL_STORAGE: true,
    
    // Разработчики
    DEVELOPERS: {
        "789563": {
            id: "dev_1",
            name: "Александр",
            avatar: "А",
            role: "Full-Stack Developer"
        },
        "140612": {
            id: "dev_2", 
            name: "Максим",
            avatar: "М",
            role: "Frontend Developer"
        }
    },
    
    // Настройки компании
    COMPANY: {
        name: "SiteCore",
        email: "sitecoreof@list.ru",
        phone: "+7 (999) 123-45-67",
        telegram: "@sitecore_support",
        address: "г. Москва, ул. Примерная, д. 1"
    }
};

// Функция для работы с базой данных
class Database {
    constructor() {
        this.isOnline = navigator.onLine;
        this.initEventListeners();
    }
    
    initEventListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            console.log('Сеть восстановлена');
            this.syncLocalData();
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            console.log('Работаем офлайн');
        });
    }
    
    // Получить все данные пользователя
    async getUserData(userId) {
        if (this.isOnline && AppConfig.API_URL) {
            try {
                const response = await fetch(`${AppConfig.API_URL}/api/collections/users/records?filter=user_id="${userId}"`);
                if (response.ok) {
                    const data = await response.json();
                    return data.items[0] || null;
                }
            } catch (error) {
                console.log('Используем локальные данные');
            }
        }
        
        // Fallback на localStorage
        const localData = localStorage.getItem(`sitecore_user_${userId}`);
        return localData ? JSON.parse(localData) : null;
    }
    
    // Сохранить данные пользователя
    async saveUserData(userId, data) {
        const userKey = `sitecore_user_${userId}`;
        
        // Сохраняем локально
        localStorage.setItem(userKey, JSON.stringify(data));
        
        if (this.isOnline && AppConfig.API_URL) {
            try {
                const existing = await this.getUserData(userId);
                
                if (existing) {
                    // Обновляем существующую запись
                    await fetch(`${AppConfig.API_URL}/api/collections/users/records/${existing.id}`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });
                } else {
                    // Создаем новую запись
                    await fetch(`${AppConfig.API_URL}/api/collections/users/records`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: userId, ...data })
                    });
                }
                
                console.log('Данные синхронизированы с облаком');
            } catch (error) {
                console.log('Ошибка синхронизации, данные сохранены локально');
            }
        }
        
        return true;
    }
    
    // Синхронизировать локальные данные
    async syncLocalData() {
        if (!this.isOnline) return;
        
        // Здесь можно добавить синхронизацию всех локальных данных
        console.log('Начата синхронизация данных');
    }
}

// Создаем глобальный экземпляр базы данных
const DatabaseService = new Database();
