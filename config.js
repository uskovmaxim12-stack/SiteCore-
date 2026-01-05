// Конфигурация проекта SiteCore
const SiteCoreConfig = {
    // URL вашего Gist с базой данных
    DB_URL: 'https://gist.githubusercontent.com/uskovmaxim12-stack/30dbe17ad2208d9eb8809574ee8ef012/raw/37a0fab472c6512b31fc1ee901e1e0dac2964250/gistfile1.txt',
    
    // Версия базы данных
    VERSION: '2.0',
    
    // Ключи для статусов заказов
    ORDER_STATUSES: {
        NEW: 'new',
        IN_PROGRESS: 'in-progress',
        REVIEW: 'review',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled'
    },
    
    // Валидация
    VALIDATION: {
        MIN_BUDGET: 300,
        MAX_BUDGET: 1000000,
        MIN_DAYS: 3,
        MAX_DAYS: 30,
        MIN_PROMPT: 300,
        MAX_PROMPT: 2500
    },
    
    // Цвета бренда
    COLORS: {
        PRIMARY: '#667eea',
        SECONDARY: '#764ba2',
        SUCCESS: '#10b981',
        WARNING: '#f59e0b',
        DANGER: '#ef4444'
    }
};

// Утилиты для работы с данными
class SiteCoreUtils {
    static formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(amount);
    }
    
    static getStatusText(status) {
        const statuses = {
            'new': 'Новый',
            'in-progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершён',
            'cancelled': 'Отменён'
        };
        return statuses[status] || status;
    }
    
    static getStatusColor(status) {
        const colors = {
            'new': '#dbeafe',
            'in-progress': '#fef3c7',
            'review': '#fce7f3',
            'completed': '#dcfce7',
            'cancelled': '#fee2e2'
        };
        return colors[status] || '#e5e7eb';
    }
    
    static getStatusTextColor(status) {
        const colors = {
            'new': '#1d4ed8',
            'in-progress': '#d97706',
            'review': '#be185d',
            'completed': '#16a34a',
            'cancelled': '#dc2626'
        };
        return colors[status] || '#6b7280';
    }
}
