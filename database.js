// database.js - База данных с автоматической синхронизацией

class SiteCoreDB {
    constructor() {
        this.dbName = 'sitecore_db';
        this.syncKey = 'sitecore_sync';
        this.init();
    }

    async init() {
        // Проверяем наличие данных в localStorage
        if (localStorage.getItem(this.dbName)) {
            this.data = JSON.parse(localStorage.getItem(this.dbName));
        } else {
            // Инициализируем с двумя разработчиками
            this.data = {
                clients: [],
                executors: [
                    {
                        id: 'executor_1',
                        name: 'Александр',
                        password: '789653',
                        avatar: 'А',
                        syncKey: this.generateSyncKey(),
                        stats: {
                            completed: 0,
                            inProgress: 0,
                            totalEarned: 0
                        },
                        createdAt: new Date().toISOString()
                    },
                    {
                        id: 'executor_2',
                        name: 'Максим',
                        password: '140612',
                        avatar: 'М',
                        syncKey: this.generateSyncKey(),
                        stats: {
                            completed: 0,
                            inProgress: 0,
                            totalEarned: 0
                        },
                        createdAt: new Date().toISOString()
                    }
                ],
                orders: [],
                messages: {},
                lastUpdate: new Date().toISOString()
            };
            this.save();
        }

        // Автоматическая синхронизация при старте
        await this.autoSync();
        
        // Периодическая синхронизация каждые 30 секунд
        setInterval(() => this.autoSync(), 30000);
    }

    // Генерация уникального ключа синхронизации
    generateSyncKey() {
        return 'sync_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
    }

    // Сохранение данных
    save() {
        this.data.lastUpdate = new Date().toISOString();
        localStorage.setItem(this.dbName, JSON.stringify(this.data));
        
        // Сохраняем для синхронизации
        this.saveForSync();
    }

    // Сохранение для синхронизации
    saveForSync() {
        // Для каждого пользователя сохраняем его данные
        const syncData = {
            timestamp: new Date().toISOString(),
            data: this.data
        };
        
        // Сохраняем в нескольких местах для надежности
        localStorage.setItem(this.syncKey, JSON.stringify(syncData));
        sessionStorage.setItem(this.syncKey, JSON.stringify(syncData));
    }

    // Автоматическая синхронизация
    async autoSync() {
        try {
            // Проверяем, есть ли более новые данные в других вкладках/устройствах
            const savedSync = localStorage.getItem(this.syncKey);
            if (savedSync) {
                const remoteData = JSON.parse(savedSync);
                
                // Если удаленные данные новее, объединяем
                if (new Date(remoteData.timestamp) > new Date(this.data.lastUpdate)) {
                    this.data = this.mergeData(this.data, remoteData.data);
                    this.save();
                }
            }
        } catch (error) {
            console.log('Ошибка синхронизации:', error);
        }
    }

    // Слияние данных
    mergeData(local, remote) {
        const result = { ...remote };
        
        // Сохраняем разработчиков
        result.executors = remote.executors;
        
        // Сливаем клиентов
        if (local.clients) {
            local.clients.forEach(localClient => {
                const remoteClient = result.clients.find(c => c.id === localClient.id);
                if (!remoteClient) {
                    result.clients.push(localClient);
                } else {
                    // Обновляем только если локальные данные новее
                    if (new Date(localClient.updatedAt || localClient.createdAt) > 
                        new Date(remoteClient.updatedAt || remoteClient.createdAt)) {
                        Object.assign(remoteClient, localClient);
                    }
                }
            });
        }

        // Сливаем заказы
        if (local.orders) {
            local.orders.forEach(localOrder => {
                const remoteOrder = result.orders.find(o => o.id === localOrder.id);
                if (!remoteOrder) {
                    result.orders.push(localOrder);
                } else {
                    // Берем самую свежую версию
                    if (new Date(localOrder.updatedDate) > new Date(remoteOrder.updatedDate)) {
                        Object.assign(remoteOrder, localOrder);
                    }
                }
            });
        }

        // Сливаем сообщения
        Object.keys(local.messages || {}).forEach(orderId => {
            if (!result.messages[orderId]) {
                result.messages[orderId] = [];
            }
            
            const localMsgs = local.messages[orderId] || [];
            const remoteMsgs = result.messages[orderId] || [];
            
            // Объединяем сообщения
            localMsgs.forEach(localMsg => {
                if (!remoteMsgs.find(m => m.id === localMsg.id)) {
                    result.messages[orderId].push(localMsg);
                }
            });
        });

        return result;
    }

    // ========== КЛИЕНТЫ ==========
    registerClient(email, password, name, phone, telegram) {
        // Проверка email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            throw new Error('Некорректный email');
        }

        // Проверка пароля
        if (password.length < 6) {
            throw new Error('Пароль должен быть не менее 6 символов');
        }

        // Проверка телефона
        const phoneRegex = /^[\+]?[0-9\s\-\(\)]+$/;
        if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
            throw new Error('Некорректный номер телефона');
        }

        const existingClient = this.data.clients.find(c => c.email === email);
        if (existingClient) {
            throw new Error('Клиент с таким email уже существует');
        }

        const client = {
            id: 'client_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            email,
            password,
            name,
            phone,
            telegram,
            avatar: name.charAt(0).toUpperCase(),
            syncKey: this.generateSyncKey(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            stats: {
                ordersCount: 0,
                totalSpent: 0,
                activeOrders: 0
            }
        };

        this.data.clients.push(client);
        this.save();
        return client;
    }

    authClient(email, password) {
        const client = this.data.clients.find(c => c.email === email && c.password === password);
        return client || null;
    }

    // ========== ИСПОЛНИТЕЛИ ==========
    authExecutor(password) {
        return this.data.executors.find(e => e.password === password);
    }

    getExecutorById(id) {
        return this.data.executors.find(e => e.id === id);
    }

    // ========== ЗАКАЗЫ ==========
    createOrder(clientId, projectName, projectType, budget, deadline, prompt) {
        // Проверка данных
        if (!projectName || projectName.length < 3) {
            throw new Error('Название проекта должно быть не менее 3 символов');
        }

        if (!['static', 'dynamic'].includes(projectType)) {
            throw new Error('Неверный тип проекта');
        }

        budget = parseInt(budget);
        if (isNaN(budget) || budget < 10000) {
            throw new Error('Бюджет должен быть не менее 10,000 рублей');
        }

        deadline = parseInt(deadline);
        if (isNaN(deadline) || deadline < 1 || deadline > 365) {
            throw new Error('Срок должен быть от 1 до 365 дней');
        }

        // Проверка промта
        if (prompt.length < 300) {
            throw new Error('Промт должен содержать минимум 300 символов');
        }
        if (prompt.length > 2500) {
            throw new Error('Промт не должен превышать 2500 символов');
        }

        const client = this.data.clients.find(c => c.id === clientId);
        if (!client) throw new Error('Клиент не найден');

        const order = {
            id: 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            clientId,
            clientName: client.name,
            clientEmail: client.email,
            clientPhone: client.phone,
            clientTelegram: client.telegram,
            projectName,
            projectType,
            budget,
            deadline,
            prompt,
            status: 'new',
            assignedTo: null,
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
            messages: []
        };

        this.data.orders.push(order);
        
        // Обновляем статистику клиента
        client.stats.ordersCount++;
        client.stats.activeOrders++;
        client.stats.totalSpent += order.budget;
        client.updatedAt = new Date().toISOString();

        this.save();
        return order;
    }

    getOrdersForClient(clientId) {
        return this.data.orders
            .filter(order => order.clientId === clientId)
            .sort((a, b) => new Date(b.updatedDate) - new Date(a.updatedDate));
    }

    getAvailableOrders() {
        return this.data.orders
            .filter(order => order.status === 'new' && !order.assignedTo)
            .sort((a, b) => new Date(b.createdDate) - new Date(a.createdDate));
    }

    getOrdersForExecutor(executorId) {
        return this.data.orders
            .filter(order => order.assignedTo === executorId)
            .sort((a, b) => new Date(b.updatedDate) - new Date(a.updatedDate));
    }

    getOrderById(orderId) {
        return this.data.orders.find(order => order.id === orderId);
    }

    updateOrderStatus(orderId, status, executorId = null) {
        const order = this.getOrderById(orderId);
        if (!order) throw new Error('Заказ не найден');

        const oldStatus = order.status;
        order.status = status;
        order.updatedDate = new Date().toISOString();
        
        if (executorId && !order.assignedTo) {
            order.assignedTo = executorId;
            order.assignedDate = new Date().toISOString();
            
            // Обновляем статистику исполнителя
            const executor = this.getExecutorById(executorId);
            if (executor) {
                executor.stats.inProgress++;
                // Сохраняем изменения в исполнителе
                executor.updatedAt = new Date().toISOString();
            }
        }

        // Добавляем системное сообщение
        if (!order.messages) order.messages = [];
        
        const statusTexts = {
            'new': 'Новый',
            'in_progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершен',
            'rejected': 'Отклонен'
        };

        order.messages.push({
            id: 'msg_' + Date.now(),
            text: `Статус изменен с "${statusTexts[oldStatus]}" на "${statusTexts[status]}"`,
            sender: 'system',
            timestamp: new Date().toISOString()
        });

        this.save();
        return order;
    }

    rejectOrder(orderId, executorId, reason = '') {
        const order = this.getOrderById(orderId);
        if (!order) throw new Error('Заказ не найден');

        order.status = 'rejected';
        order.rejectedBy = executorId;
        order.rejectedDate = new Date().toISOString();
        order.updatedDate = new Date().toISOString();
        order.rejectionReason = reason;

        // Добавляем системное сообщение
        if (!order.messages) order.messages = [];
        
        const executor = this.getExecutorById(executorId);
        const executorName = executor ? executor.name : 'Исполнитель';
        
        order.messages.push({
            id: 'msg_' + Date.now(),
            text: `Заказ отклонен ${executorName}${reason ? ': ' + reason : ''}`,
            sender: 'system',
            timestamp: new Date().toISOString()
        });

        this.save();
        return order;
    }

    deleteOrder(orderId, executorId) {
        const orderIndex = this.data.orders.findIndex(order => order.id === orderId);
        if (orderIndex === -1) throw new Error('Заказ не найден');

        const order = this.data.orders[orderIndex];
        
        // Проверяем права на удаление
        if (order.status !== 'new' || order.assignedTo) {
            throw new Error('Можно удалять только новые, непринятые заказы');
        }

        // Обновляем статистику клиента
        const client = this.data.clients.find(c => c.id === order.clientId);
        if (client) {
            client.stats.ordersCount--;
            client.stats.activeOrders--;
            client.stats.totalSpent -= order.budget;
            client.updatedAt = new Date().toISOString();
        }

        // Удаляем заказ
        this.data.orders.splice(orderIndex, 1);
        this.save();
        
        return true;
    }

    // ========== СООБЩЕНИЯ ==========
    addMessage(orderId, senderId, senderType, text) {
        const order = this.getOrderById(orderId);
        if (!order) throw new Error('Заказ не найден');

        const message = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
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

        this.save();
        return message;
    }

    getMessages(orderId) {
        const order = this.getOrderById(orderId);
        return order ? (order.messages || []) : [];
    }

    // ========== СТАТИСТИКА ==========
    getClientStats(clientId) {
        const client = this.data.clients.find(c => c.id === clientId);
        return client ? client.stats : null;
    }

    getExecutorStats(executorId) {
        const executor = this.getExecutorById(executorId);
        return executor ? executor.stats : null;
    }

    getGlobalStats() {
        const totalOrders = this.data.orders.length;
        const completedOrders = this.data.orders.filter(o => o.status === 'completed').length;
        const totalBudget = this.data.orders.reduce((sum, order) => sum + order.budget, 0);
        const activeOrders = this.data.orders.filter(o => ['new', 'in_progress', 'review'].includes(o.status)).length;

        return {
            totalOrders,
            completedOrders,
            totalBudget,
            activeOrders,
            totalClients: this.data.clients.length,
            totalExecutors: this.data.executors.length
        };
    }
}

// Создаем глобальный экземпляр
window.SiteCoreDB = new SiteCoreDB();
