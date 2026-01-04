// Система авторизации SiteCore
const auth = {
    // Текущий пользователь
    currentUser: null,
    
    // Инициализация
    init() {
        // Восстанавливаем сессию из localStorage
        const savedUser = localStorage.getItem('sitecore_current_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
            } catch (e) {
                console.error('Ошибка восстановления сессии:', e);
                localStorage.removeItem('sitecore_current_user');
            }
        }
        
        // Проверяем время сессии (24 часа)
        const sessionTime = localStorage.getItem('sitecore_session_time');
        if (sessionTime && Date.now() - parseInt(sessionTime) > 24 * 60 * 60 * 1000) {
            this.logout();
        }
    },
    
    // Вход в систему
    login(identifier, password, userType) {
        const db = SiteCoreDB.getDB();
        if (!db) return false;
        
        // Поиск пользователя
        let user = null;
        
        if (userType === 'executor') {
            // Поиск разработчика по username
            user = Object.values(db.users).find(u => 
                u.type === 'executor' && 
                u.username === identifier && 
                u.password === password
            );
        } else {
            // Поиск клиента по email
            user = Object.values(db.users).find(u => 
                u.type === 'client' && 
                u.email === identifier && 
                u.password === password
            );
        }
        
        if (user) {
            // Сохраняем пользователя (без пароля)
            const { password: _, ...userWithoutPassword } = user;
            this.currentUser = userWithoutPassword;
            
            // Сохраняем в localStorage
            localStorage.setItem('sitecore_current_user', JSON.stringify(userWithoutPassword));
            localStorage.setItem('sitecore_session_time', Date.now().toString());
            
            return true;
        }
        
        return false;
    },
    
    // Регистрация клиента
    registerClient(userData) {
        const db = SiteCoreDB.getDB();
        if (!db) return false;
        
        // Проверяем, нет ли пользователя с таким email
        const existingUser = Object.values(db.users).find(u => 
            u.type === 'client' && u.email === userData.email
        );
        
        if (existingUser) {
            return false;
        }
        
        // Создаем клиента
        const clientId = SiteCoreDB.users.create({
            type: 'client',
            name: userData.name,
            email: userData.email,
            phone: userData.phone,
            telegram: userData.telegram,
            password: userData.password,
            status: 'active',
            avatar: userData.name.split(' ').map(n => n[0]).join('').toUpperCase(),
            createdAt: new Date().toISOString()
        });
        
        return !!clientId;
    },
    
    // Получение текущего пользователя
    getUser() {
        return this.currentUser;
    },
    
    // Проверка авторизации
    isAuthenticated() {
        return !!this.currentUser;
    },
    
    // Проверка роли
    hasRole(role) {
        if (!this.currentUser) return false;
        
        if (role === 'client') {
            return this.currentUser.type === 'client';
        } else if (role === 'executor') {
            return this.currentUser.type === 'executor';
        }
        
        return false;
    },
    
    // Выход из системы
    logout() {
        this.currentUser = null;
        localStorage.removeItem('sitecore_current_user');
        localStorage.removeItem('sitecore_session_time');
        
        // Редирект на страницу входа
        if (window.location.pathname !== '/index.html' && 
            !window.location.pathname.endsWith('/')) {
            window.location.href = 'index.html';
        }
    },
    
    // Обновление профиля
    updateProfile(updates) {
        if (!this.currentUser) return false;
        
        const success = SiteCoreDB.users.update(this.currentUser.id, updates);
        
        if (success) {
            // Обновляем текущего пользователя
            Object.assign(this.currentUser, updates);
            localStorage.setItem('sitecore_current_user', JSON.stringify(this.currentUser));
        }
        
        return success;
    }
};

// Инициализация авторизации
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        auth.init();
    });
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = auth;
} else {
    window.auth = auth;
}
