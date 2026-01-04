// SiteCore Database - Версия 3.0 (Исправлено все)
class SiteCoreDB {
    constructor() {
        this.dbName = 'sitecore_master_db';
        this.usersKey = 'sitecore_users';
        this.syncKeyPrefix = 'sitecore_sync_';
        this.init();
    }

    async init() {
        // Инициализация базы
        if (!localStorage.getItem(this.dbName)) {
            this.data = {
                users: {},
                orders: {},
                messages: {},
                counters: {
                    orders: 0,
                    messages: 0
                },
                sync: {}
            };
            this.initializeDefaultExecutors();
            this.save();
        } else {
            this.data = JSON.parse(localStorage.getItem(this.dbName));
        }

        // Автоматическая синхронизация
        this.startAutoSync();
    }

    // Инициализация исполнителей по умолчанию
    initializeDefaultExecutors() {
        this.data.users = {
            // Исполнитель Александр
            'exec_789653': {
                id: 'exec_789653',
                name: 'Александр',
                type: 'executor',
                avatar: 'А',
                password: '789653',
                syncKey: this.generateSyncKey(),
                stats: {
                    completed: 0,
                    inProgress: 0,
                    totalEarned: 0
                },
                createdAt: new Date().toISOString()
            },
            // Исполнитель Максим
            'exec_140612': {
                id: 'exec_140612',
                name: 'Максим',
                type: 'executor',
                avatar: 'М',
                password: '140612',
                syncKey: this.generateSyncKey(),
                stats: {
                    completed: 0,
                    inProgress: 0,
                    totalEarned: 0
                },
                createdAt: new Date().toISOString()
            }
        };
    }

    // Генерация ключа синхронизации
    generateSyncKey() {
        return 'sync_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }

    // ========== АВТОРИЗАЦИЯ ==========
    authUser(identifier, password) {
        try {
            // Ищем пользователя среди исполнителей
            for (const userId in this.data.users) {
                const user = this.data.users[userId];
                
                if (user.type === 'executor') {
                    // Для исполнителей проверяем только пароль
                    if (user.password === password) {
                        return user;
                    }
                } else if (user.type === 'client') {
                    // Для клиентов проверяем email и пароль
                    if (user.email === identifier && user.password === password) {
                        return user;
                    }
                }
            }
            
            return null;
        } catch (error) {
            console.error('Ошибка авторизации:', error);
            return null;
        }
    }

    // ========== КЛИЕНТЫ ==========
    registerClient(email, password, name, phone, telegram) {
        try {
            // Проверка существующего email
            for (const userId in this.data.users) {
                const user = this.data.users[userId];
                if (user.email === email && user.type === 'client') {
                    throw new Error('Клиент с таким email уже существует');
                }
            }

            const clientId = 'client_' + Date.now();
            const client = {
                id: clientId,
                email,
                password,
                name,
                phone,
                telegram,
                type: 'client',
                avatar: name.charAt(0).toUpperCase(),
                syncKey: this.generateSyncKey(),
                createdAt: new Date().toISOString(),
                stats: {
                    ordersCount: 0,
                    totalSpent: 0,
                    activeOrders: 0
                }
            };

            this.data.users[clientId] = client;
            this.save();
            this.scheduleSync(client.syncKey);
            return client;
        } catch (error) {
            throw new Error(error.message || 'Ошибка регистрации клиента');
        }
    }

    // ========== ЗАКАЗЫ ==========
    createOrder(clientId, projectName, projectType, budget, deadline, prompt) {
        try {
            // Проверка промта
            if (prompt.length < 300 || prompt.length > 2500) {
                throw new Error('Промт должен содержать от 300 до 2500 символов');
            }

            const client = this.data.users[clientId];
            if (!client) throw new Error('Клиент не найден');

            const orderId = 'order_' + Date.now();
            const order = {
                id: orderId,
                clientId,
                clientName: client.name,
                clientEmail: client.email,
                clientPhone: client.phone,
                clientTelegram: client.telegram,
                projectName,
                projectType,
                budget: parseInt(budget),
                deadline: parseInt(deadline),
                prompt,
                status: 'new',
                assignedTo: null,
                assignedDate: null,
                createdDate: new Date().toISOString(),
                updatedDate: new Date().toISOString(),
                messages: []
            };

            this.data.orders[orderId] = order;
            this.data.counters.orders++;
            
            // Обновляем статистику клиента
            client.stats.ordersCount++;
            client.stats.activeOrders++;
            client.stats.totalSpent += order.budget;

            this.save();
            
            // Синхронизация для всех связанных пользователей
            this.scheduleSync(client.syncKey);
            return order;
        } catch (error) {
            throw new Error(error.message || 'Ошибка создания заказа');
        }
    }

    getOrdersForClient(clientId) {
        const orders = [];
        for (const orderId in this.data.orders) {
            if (this.data.orders[orderId].clientId === clientId) {
                orders.push(this.data.orders[orderId]);
            }
        }
        return orders.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
    }

    getAvailableOrders() {
        const orders = [];
        for (const orderId in this.data.orders) {
            const order = this.data.orders[orderId];
            if (order.status === 'new' && !order.assignedTo) {
                orders.push(order);
            }
        }
        return orders.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
    }

    getOrdersForExecutor(executorId) {
        const orders = [];
        for (const orderId in this.data.orders) {
            if (this.data.orders[orderId].assignedTo === executorId) {
                orders.push(this.data.orders[orderId]);
            }
        }
        return orders.sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
    }

    getOrderById(orderId) {
        return this.data.orders[orderId] || null;
    }

    updateOrderStatus(orderId, status, executorId = null) {
        try {
            const order = this.getOrderById(orderId);
            if (!order) throw new Error('Заказ не найден');

            const oldStatus = order.status;
            order.status = status;
            order.updatedDate = new Date().toISOString();

            if (executorId && !order.assignedTo) {
                order.assignedTo = executorId;
                order.assignedDate = new Date().toISOString();
                
                const executor = this.data.users[executorId];
                if (executor) {
                    executor.stats.inProgress = (executor.stats.inProgress || 0) + 1;
                }
            }

            // Если заказ завершен
            if (status === 'completed') {
                const executor = order.assignedTo ? this.data.users[order.assignedTo] : null;
                if (executor) {
                    executor.stats.completed = (executor.stats.completed || 0) + 1;
                    executor.stats.inProgress = Math.max(0, (executor.stats.inProgress || 0) - 1);
                    executor.stats.totalEarned = (executor.stats.totalEarned || 0) + order.budget;
                }
                
                const client = this.data.users[order.clientId];
                if (client) {
                    client.stats.activeOrders = Math.max(0, (client.stats.activeOrders || 0) - 1);
                }
            }

            // Добавляем системное сообщение
            this.addSystemMessage(orderId, `Статус изменён с "${this.getStatusText(oldStatus)}" на "${this.getStatusText(status)}"`);

            this.save();
            
            // Синхронизация
            if (order.assignedTo) {
                const executor = this.data.users[order.assignedTo];
                if (executor) this.scheduleSync(executor.syncKey);
            }
            const client = this.data.users[order.clientId];
            if (client) this.scheduleSync(client.syncKey);
            
            return order;
        } catch (error) {
            throw new Error(error.message || 'Ошибка обновления статуса');
        }
    }

    rejectOrder(orderId, executorId, reason = '') {
        try {
            const order = this.getOrderById(orderId);
            if (!order) throw new Error('Заказ не найден');

            order.status = 'rejected';
            order.rejectedBy = executorId;
            order.rejectedReason = reason;
            order.rejectedDate = new Date().toISOString();
            order.updatedDate = new Date().toISOString();

            // Добавляем системное сообщение
            const executor = this.data.users[executorId];
            this.addSystemMessage(orderId, `Заказ отклонён исполнителем ${executor?.name || 'исполнителем'}${reason ? '. Причина: ' + reason : ''}`);

            this.save();
            
            // Синхронизация
            const client = this.data.users[order.clientId];
            if (client) this.scheduleSync(client.syncKey);
            if (executor) this.scheduleSync(executor.syncKey);
            
            return order;
        } catch (error) {
            throw new Error(error.message || 'Ошибка отклонения заказа');
        }
    }

    deleteOrder(orderId, userId) {
        try {
            const order = this.getOrderById(orderId);
            if (!order) throw new Error('Заказ не найден');

            // Проверяем права на удаление
            const user = this.data.users[userId];
            if (!user) throw new Error('Пользователь не найден');
            
            // Только исполнитель, назначенный на заказ, может его удалить (если заказ новый)
            if (user.type === 'executor' && order.assignedTo === userId && order.status === 'new') {
                delete this.data.orders[orderId];
                
                // Обновляем статистику клиента
                const client = this.data.users[order.clientId];
                if (client) {
                    client.stats.ordersCount = Math.max(0, (client.stats.ordersCount || 0) - 1);
                    client.stats.activeOrders = Math.max(0, (client.stats.activeOrders || 0) - 1);
                    client.stats.totalSpent = Math.max(0, (client.stats.totalSpent || 0) - order.budget);
                }
                
                this.save();
                
                // Синхронизация
                if (client) this.scheduleSync(client.syncKey);
                this.scheduleSync(user.syncKey);
                
                return true;
            } else {
                throw new Error('У вас нет прав для удаления этого заказа');
            }
        } catch (error) {
            throw new Error(error.message || 'Ошибка удаления заказа');
        }
    }

    // ========== СООБЩЕНИЯ ==========
    addMessage(orderId, senderId, senderType, text) {
        try {
            const order = this.getOrderById(orderId);
            if (!order) throw new Error('Заказ не найден');

            const messageId = 'msg_' + Date.now();
            const message = {
                id: messageId,
                orderId,
                senderId,
                senderType,
                text,
                timestamp: new Date().toISOString(),
                read: false
            };

            if (!order.messages) order.messages = [];
            order.messages.push(message);
            order.updatedDate = new Date().toISOString();
            this.data.counters.messages++;

            this.save();
            
            // Синхронизация
            const sender = this.data.users[senderId];
            const client = this.data.users[order.clientId];
            const executor = order.assignedTo ? this.data.users[order.assignedTo] : null;
            
            if (sender) this.scheduleSync(sender.syncKey);
            if (client) this.scheduleSync(client.syncKey);
            if (executor) this.scheduleSync(executor.syncKey);
            
            return message;
        } catch (error) {
            throw new Error(error.message || 'Ошибка отправки сообщения');
        }
    }

    addSystemMessage(orderId, text) {
        try {
            const order = this.getOrderById(orderId);
            if (!order) return;

            const messageId = 'sys_' + Date.now();
            const message = {
                id: messageId,
                orderId,
                senderId: 'system',
                senderType: 'system',
                text,
                timestamp: new Date().toISOString(),
                read: false
            };

            if (!order.messages) order.messages = [];
            order.messages.push(message);
            order.updatedDate = new Date().toISOString();
            
            this.save();
        } catch (error) {
            console.error('Ошибка системного сообщения:', error);
        }
    }

    getMessages(orderId) {
        const order = this.getOrderById(orderId);
        return order ? (order.messages || []) : [];
    }

    markMessagesAsRead(orderId, userId) {
        try {
            const order = this.getOrderById(orderId);
            if (!order || !order.messages) return;

            order.messages.forEach(msg => {
                if (msg.senderId !== userId && !msg.read) {
                    msg.read = true;
                }
            });

            this.save();
        } catch (error) {
            console.error('Ошибка отметки сообщений:', error);
        }
    }

    // ========== СИНХРОНИЗАЦИЯ ==========
    startAutoSync() {
        // Синхронизация каждые 30 секунд
        setInterval(() => {
            this.performSync();
        }, 30000);
    }

    scheduleSync(syncKey) {
        if (!this.data.sync) this.data.sync = {};
        this.data.sync[syncKey] = {
            lastUpdate: new Date().toISOString(),
            needsSync: true
        };
        this.save();
    }

    async performSync() {
        try {
            const syncData = this.data.sync || {};
            const syncKeys = Object.keys(syncData);
            
            if (syncKeys.length === 0) return;

            // Здесь будет логика синхронизации с удаленным сервером
            // Пока сохраняем только локально
            console.log('Синхронизация выполнена для ключей:', syncKeys);
            
            // Помечаем как синхронизированные
            syncKeys.forEach(key => {
                if (syncData[key]) {
                    syncData[key].needsSync = false;
                    syncData[key].lastSynced = new Date().toISOString();
                }
            });
            
            this.data.sync = syncData;
            this.save();
        } catch (error) {
            console.error('Ошибка синхронизации:', error);
        }
    }

    // ========== ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ ==========
    save() {
        localStorage.setItem(this.dbName, JSON.stringify(this.data));
    }

    getStatusText(status) {
        const statuses = {
            'new': 'Новый',
            'in_progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершён',
            'rejected': 'Отклонён'
        };
        return statuses[status] || status;
    }

    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(amount);
    }

    getAllUsers() {
        return this.data.users;
    }

    getUserById(userId) {
        return this.data.users[userId] || null;
    }

    // Получение статистики
    getStats() {
        let totalOrders = 0;
        let completedOrders = 0;
        let totalBudget = 0;
        let activeClients = 0;
        let activeExecutors = 0;

        for (const orderId in this.data.orders) {
            totalOrders++;
            if (this.data.orders[orderId].status === 'completed') {
                completedOrders++;
            }
            totalBudget += this.data.orders[orderId].budget || 0;
        }

        for (const userId in this.data.users) {
            const user = this.data.users[userId];
            if (user.type === 'client' && user.stats.activeOrders > 0) {
                activeClients++;
            }
            if (user.type === 'executor' && user.stats.inProgress > 0) {
                activeExecutors++;
            }
        }

        return {
            totalOrders,
            completedOrders,
            totalBudget,
            activeClients,
            activeExecutors,
            totalUsers: Object.keys(this.data.users).length
        };
    }

    // Экспорт и импорт для синхронизации между устройствами
    exportUserData(userId) {
        const user = this.getUserById(userId);
        if (!user) return null;

        const userData = {
            user: user,
            orders: this.data.orders,
            messages: this.data.messages,
            syncKey: user.syncKey,
            timestamp: new Date().toISOString()
        };

        return JSON.stringify(userData);
    }

    importUserData(dataString) {
        try {
            const data = JSON.parse(dataString);
            
            // Обновляем данные пользователя
            if (data.user && data.user.syncKey) {
                this.data.users[data.user.id] = data.user;
                
                // Обновляем заказы
                if (data.orders) {
                    for (const orderId in data.orders) {
                        this.data.orders[orderId] = data.orders[orderId];
                    }
                }
                
                // Обновляем сообщения
                if (data.messages) {
                    for (const messageId in data.messages) {
                        this.data.messages[messageId] = data.messages[messageId];
                    }
                }
                
                this.save();
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('Ошибка импорта данных:', error);
            return false;
        }
    }
}

// Создаем глобальный экземпляр базы данных
window.SiteCoreDB = new SiteCoreDB();
