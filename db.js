// Система базы данных SiteCore
const SiteCoreDB = {
    // Инициализация базы данных
    init() {
        // Проверяем, существует ли база данных
        if (!localStorage.getItem('sitecore_db_initialized')) {
            this.initializeDatabase();
        }
        
        // Слушаем изменения в localStorage для синхронизации между вкладками
        window.addEventListener('storage', this.handleStorageChange.bind(this));
    },
    
    // Инициализация базы данных с тестовыми данными
    initializeDatabase() {
        const db = {
            version: '1.0',
            lastUpdated: new Date().toISOString(),
            users: {},
            orders: {},
            messages: {},
            activities: {},
            settings: {
                companyName: 'SiteCore',
                minPromptLength: 300,
                maxPromptLength: 2500
            }
        };
        
        // Создаем предустановленных разработчиков
        const developers = {
            'alexander': {
                id: 'dev_001',
                username: 'Александр',
                name: 'Александр Иванов',
                type: 'executor',
                password: '789653', // В реальном приложении нужно хэширование
                email: 'alexander@sitecore.ru',
                avatar: 'АИ',
                status: 'active',
                role: 'senior',
                skills: ['HTML/CSS', 'JavaScript', 'React', 'Node.js'],
                createdAt: new Date().toISOString()
            },
            'maxim': {
                id: 'dev_002',
                username: 'Максим',
                name: 'Максим Петров',
                type: 'executor',
                password: '140612', // В реальном приложении нужно хэширование
                email: 'maxim@sitecore.ru',
                avatar: 'МП',
                status: 'active',
                role: 'middle',
                skills: ['PHP', 'WordPress', 'Vue.js', 'MySQL'],
                createdAt: new Date().toISOString()
            }
        };
        
        db.users = developers;
        
        // Сохраняем базу данных
        localStorage.setItem('sitecore_db', JSON.stringify(db));
        localStorage.setItem('sitecore_db_initialized', 'true');
        
        console.log('SiteCore DB initialized');
    },
    
    // Получение текущей базы данных
    getDB() {
        const dbStr = localStorage.getItem('sitecore_db');
        return dbStr ? JSON.parse(dbStr) : null;
    },
    
    // Обновление базы данных
    updateDB(db) {
        db.lastUpdated = new Date().toISOString();
        localStorage.setItem('sitecore_db', JSON.stringify(db));
        
        // Триггерим событие обновления для синхронизации между вкладками
        localStorage.setItem('sitecore_db_updated', Date.now().toString());
    },
    
    // Обработка изменений в localStorage
    handleStorageChange(event) {
        if (event.key === 'sitecore_db_updated') {
            // Можно обновить интерфейс при изменении данных в другой вкладке
            if (typeof window.onDBUpdate === 'function') {
                window.onDBUpdate();
            }
        }
    },
    
    // Пользователи
    users: {
        // Создание нового пользователя
        create(userData) {
            const db = SiteCoreDB.getDB();
            if (!db) return null;
            
            const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            db.users[userId] = {
                id: userId,
                ...userData,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            SiteCoreDB.updateDB(db);
            return userId;
        },
        
        // Получение пользователя по ID
        get(userId) {
            const db = SiteCoreDB.getDB();
            return db?.users[userId] || null;
        },
        
        // Поиск пользователя по email или username
        find(query) {
            const db = SiteCoreDB.getDB();
            if (!db) return null;
            
            return Object.values(db.users).find(user => {
                return user.email === query || user.username === query;
            });
        },
        
        // Обновление пользователя
        update(userId, updates) {
            const db = SiteCoreDB.getDB();
            if (!db?.users[userId]) return false;
            
            db.users[userId] = {
                ...db.users[userId],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            SiteCoreDB.updateDB(db);
            return true;
        }
    },
    
    // Заказы
    orders: {
        // Создание нового заказа
        create(orderData) {
            const db = SiteCoreDB.getDB();
            if (!db) return null;
            
            // Проверка длины промта
            const minLength = db.settings.minPromptLength || 300;
            const maxLength = db.settings.maxPromptLength || 2500;
            
            if (orderData.prompt.length < minLength) {
                throw new Error(`Промт должен быть не менее ${minLength} символов`);
            }
            
            if (orderData.prompt.length > maxLength) {
                throw new Error(`Промт должен быть не более ${maxLength} символов`);
            }
            
            const orderId = `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            db.orders[orderId] = {
                id: orderId,
                ...orderData,
                status: 'new',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                messages: [],
                activities: []
            };
            
            // Добавляем активность
            db.orders[orderId].activities.push({
                type: 'created',
                userId: orderData.clientId,
                timestamp: new Date().toISOString(),
                description: 'Заказ создан'
            });
            
            SiteCoreDB.updateDB(db);
            return orderId;
        },
        
        // Получение заказа по ID
        get(orderId) {
            const db = SiteCoreDB.getDB();
            return db?.orders[orderId] || null;
        },
        
        // Получение всех заказов
        getAll(filters = {}) {
            const db = SiteCoreDB.getDB();
            if (!db) return [];
            
            let orders = Object.values(db.orders);
            
            // Применяем фильтры
            if (filters.status) {
                orders = orders.filter(order => order.status === filters.status);
            }
            
            if (filters.clientId) {
                orders = orders.filter(order => order.clientId === filters.clientId);
            }
            
            if (filters.executorId) {
                orders = orders.filter(order => order.executorId === filters.executorId);
            }
            
            if (filters.type) {
                orders = orders.filter(order => order.type === filters.type);
            }
            
            // Сортировка по дате создания (новые первыми)
            orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
            
            return orders;
        },
        
        // Обновление заказа
        update(orderId, updates) {
            const db = SiteCoreDB.getDB();
            if (!db?.orders[orderId]) return false;
            
            const oldOrder = db.orders[orderId];
            
            db.orders[orderId] = {
                ...oldOrder,
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            // Если изменился статус, добавляем активность
            if (updates.status && updates.status !== oldOrder.status) {
                const statusNames = {
                    'new': 'Новый',
                    'in_progress': 'В работе',
                    'review': 'На проверке',
                    'completed': 'Завершен',
                    'rejected': 'Отклонен'
                };
                
                db.orders[orderId].activities.push({
                    type: 'status_changed',
                    userId: updates.updatedBy || 'system',
                    timestamp: new Date().toISOString(),
                    description: `Статус изменен на "${statusNames[updates.status] || updates.status}"`
                });
            }
            
            SiteCoreDB.updateDB(db);
            return true;
        },
        
        // Удаление заказа
        delete(orderId, userId) {
            const db = SiteCoreDB.getDB();
            if (!db?.orders[orderId]) return false;
            
            // Проверяем права на удаление
            const order = db.orders[orderId];
            if (order.clientId !== userId && order.executorId !== userId) {
                return false;
            }
            
            delete db.orders[orderId];
            SiteCoreDB.updateDB(db);
            return true;
        },
        
        // Назначение исполнителя
        assignExecutor(orderId, executorId) {
            const db = SiteCoreDB.getDB();
            if (!db?.orders[orderId]) return false;
            
            const order = db.orders[orderId];
            
            db.orders[orderId] = {
                ...order,
                executorId,
                status: 'in_progress',
                assignedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                updatedBy: executorId
            };
            
            // Добавляем активность
            const executor = db.users[executorId];
            db.orders[orderId].activities.push({
                type: 'assigned',
                userId: executorId,
                timestamp: new Date().toISOString(),
                description: `Исполнитель назначен: ${executor?.name || executorId}`
            });
            
            SiteCoreDB.updateDB(db);
            return true;
        }
    },
    
    // Сообщения
    messages: {
        // Отправка сообщения
        send(orderId, messageData) {
            const db = SiteCoreDB.getDB();
            if (!db?.orders[orderId]) return null;
            
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const message = {
                id: messageId,
                ...messageData,
                timestamp: new Date().toISOString(),
                read: false
            };
            
            // Добавляем сообщение в заказ
            db.orders[orderId].messages.push(message);
            
            // Обновляем время последнего сообщения в заказе
            db.orders[orderId].lastMessageAt = message.timestamp;
            db.orders[orderId].updatedAt = message.timestamp;
            
            // Добавляем активность
            db.orders[orderId].activities.push({
                type: 'message_sent',
                userId: messageData.senderId,
                timestamp: message.timestamp,
                description: 'Отправлено сообщение'
            });
            
            SiteCoreDB.updateDB(db);
            return messageId;
        },
        
        // Получение сообщений заказа
        getByOrder(orderId) {
            const db = SiteCoreDB.getDB();
            const order = db?.orders[orderId];
            
            if (!order || !order.messages) return [];
            
            // Сортируем сообщения по времени (старые первыми)
            return order.messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        },
        
        // Отметка сообщений как прочитанных
        markAsRead(orderId, userId) {
            const db = SiteCoreDB.getDB();
            const order = db?.orders[orderId];
            
            if (!order || !order.messages) return false;
            
            order.messages.forEach(msg => {
                if (msg.senderId !== userId && !msg.read) {
                    msg.read = true;
                    msg.readAt = new Date().toISOString();
                }
            });
            
            SiteCoreDB.updateDB(db);
            return true;
        }
    },
    
    // Аналитика
    analytics: {
        // Получение статистики по заказам
        getOrderStats(userId, userType) {
            const db = SiteCoreDB.getDB();
            if (!db) return null;
            
            const allOrders = Object.values(db.orders);
            let userOrders;
            
            if (userType === 'client') {
                userOrders = allOrders.filter(order => order.clientId === userId);
            } else if (userType === 'executor') {
                userOrders = allOrders.filter(order => order.executorId === userId);
            } else {
                userOrders = allOrders;
            }
            
            const stats = {
                total: userOrders.length,
                new: userOrders.filter(o => o.status === 'new').length,
                in_progress: userOrders.filter(o => o.status === 'in_progress').length,
                review: userOrders.filter(o => o.status === 'review').length,
                completed: userOrders.filter(o => o.status === 'completed').length,
                rejected: userOrders.filter(o => o.status === 'rejected').length,
                totalBudget: userOrders.reduce((sum, order) => sum + (order.budget || 0), 0),
                byType: {}
            };
            
            // Статистика по типам сайтов
            userOrders.forEach(order => {
                if (!stats.byType[order.type]) {
                    stats.byType[order.type] = 0;
                }
                stats.byType[order.type]++;
            });
            
            return stats;
        },
        
        // Получение последних активностей
        getRecentActivities(limit = 10) {
            const db = SiteCoreDB.getDB();
            if (!db) return [];
            
            const allActivities = [];
            
            // Собираем все активности из всех заказов
            Object.values(db.orders).forEach(order => {
                if (order.activities) {
                    order.activities.forEach(activity => {
                        allActivities.push({
                            ...activity,
                            orderId: order.id,
                            orderName: order.name
                        });
                    });
                }
            });
            
            // Сортируем по времени (новые первыми)
            allActivities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            
            return allActivities.slice(0, limit);
        }
    }
};

// Инициализация базы данных при загрузке
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        SiteCoreDB.init();
    });
}

// Экспорт для использования в других файлах
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SiteCoreDB;
} else {
    window.SiteCoreDB = SiteCoreDB;
}
