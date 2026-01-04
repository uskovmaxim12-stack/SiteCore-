// database.js - База данных для синхронизации через GitHub Gist
class SiteCoreDB {
    constructor() {
        this.gistId = null;
        this.githubToken = null;
        this.dbName = 'sitecore_db';
        this.init();
    }

    async init() {
        // Проверяем наличие сохраненных данных
        if (localStorage.getItem(this.dbName)) {
            this.data = JSON.parse(localStorage.getItem(this.dbName));
        } else {
            // Инициализируем пустую базу
            this.data = {
                clients: [],
                executors: [
                    {
                        id: 'executor_1',
                        name: 'Александр',
                        password: '789653',
                        avatar: 'А',
                        stats: {
                            completed: 0,
                            inProgress: 0,
                            totalEarned: 0
                        }
                    },
                    {
                        id: 'executor_2',
                        name: 'Максим',
                        password: '140612',
                        avatar: 'М',
                        stats: {
                            completed: 0,
                            inProgress: 0,
                            totalEarned: 0
                        }
                    }
                ],
                orders: [],
                messages: {},
                lastOrderId: 0,
                lastClientId: 0
            };
            this.save();
        }

        // Пробуем загрузить с GitHub
        await this.loadFromGist();
    }

    // Сохранение в localStorage
    save() {
        localStorage.setItem(this.dbName, JSON.stringify(this.data));
    }

    // ========== КЛИЕНТЫ ==========
    registerClient(email, password, name, phone, telegram) {
        const existingClient = this.data.clients.find(c => c.email === email);
        if (existingClient) {
            throw new Error('Клиент с таким email уже существует');
        }

        const client = {
            id: `client_${Date.now()}`,
            email,
            password,
            name,
            phone,
            telegram,
            avatar: name.charAt(0).toUpperCase(),
            createdAt: new Date().toISOString(),
            stats: {
                ordersCount: 0,
                totalSpent: 0,
                activeOrders: 0
            }
        };

        this.data.clients.push(client);
        this.save();
        this.syncToGist();
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

    // ========== ЗАКАЗЫ ==========
    createOrder(clientId, projectName, projectType, budget, deadline, prompt) {
        // Проверка промта
        if (prompt.length < 300 || prompt.length > 2500) {
            throw new Error('Промт должен быть от 300 до 2500 символов');
        }

        const client = this.data.clients.find(c => c.id === clientId);
        if (!client) throw new Error('Клиент не найден');

        const order = {
            id: `order_${Date.now()}`,
            clientId,
            clientName: client.name,
            clientEmail: client.email,
            clientPhone: client.phone,
            clientTelegram: client.telegram,
            projectName,
            projectType, // 'static' или 'dynamic'
            budget: parseInt(budget),
            deadline: parseInt(deadline),
            prompt,
            status: 'new', // new, in_progress, review, completed, rejected
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

        this.save();
        this.syncToGist();
        return order;
    }

    getOrdersForClient(clientId) {
        return this.data.orders.filter(order => order.clientId === clientId);
    }

    getAvailableOrders() {
        return this.data.orders.filter(order => 
            order.status === 'new' && !order.assignedTo
        );
    }

    getOrdersForExecutor(executorId) {
        return this.data.orders.filter(order => order.assignedTo === executorId);
    }

    getOrderById(orderId) {
        return this.data.orders.find(order => order.id === orderId);
    }

    updateOrderStatus(orderId, status, executorId = null) {
        const order = this.getOrderById(orderId);
        if (!order) throw new Error('Заказ не найден');

        order.status = status;
        order.updatedDate = new Date().toISOString();
        
        if (executorId && !order.assignedTo) {
            order.assignedTo = executorId;
            order.assignedDate = new Date().toISOString();
            
            // Обновляем статистику исполнителя
            const executor = this.data.executors.find(e => e.id === executorId);
            if (executor) {
                executor.stats.inProgress++;
            }
        }

        // Если заказ завершен, обновляем статистику
        if (status === 'completed') {
            const executor = this.data.executors.find(e => e.id === order.assignedTo);
            if (executor) {
                executor.stats.completed++;
                executor.stats.inProgress--;
                executor.stats.totalEarned += order.budget;
            }
            
            const client = this.data.clients.find(c => c.id === order.clientId);
            if (client) {
                client.stats.activeOrders--;
            }
        }

        this.save();
        this.syncToGist();
        return order;
    }

    rejectOrder(orderId, executorId) {
        const order = this.getOrderById(orderId);
        if (!order) throw new Error('Заказ не найден');

        order.status = 'rejected';
        order.rejectedBy = executorId;
        order.rejectedDate = new Date().toISOString();
        order.updatedDate = new Date().toISOString();

        this.save();
        this.syncToGist();
        return order;
    }

    // ========== СООБЩЕНИЯ ==========
    addMessage(orderId, senderId, senderType, text) {
        const order = this.getOrderById(orderId);
        if (!order) throw new Error('Заказ не найден');

        const message = {
            id: `msg_${Date.now()}`,
            orderId,
            senderId,
            senderType, // 'client' или 'executor'
            text,
            timestamp: new Date().toISOString(),
            read: false
        };

        if (!order.messages) order.messages = [];
        order.messages.push(message);
        order.updatedDate = new Date().toISOString();

        this.save();
        this.syncToGist();
        return message;
    }

    getMessages(orderId) {
        const order = this.getOrderById(orderId);
        return order ? order.messages || [] : [];
    }

    markMessagesAsRead(orderId, userId) {
        const order = this.getOrderById(orderId);
        if (!order || !order.messages) return;

        order.messages.forEach(msg => {
            if (msg.senderId !== userId) {
                msg.read = true;
            }
        });

        this.save();
    }

    // ========== СИНХРОНИЗАЦИЯ С GITHUB ==========
    async syncToGist() {
        try {
            // Для GitHub Pages используем GitHub Gist
            const token = localStorage.getItem('github_token');
            if (!token) return;

            const gistId = localStorage.getItem('github_gist_id');
            const data = {
                public: false,
                files: {
                    'sitecore_db.json': {
                        content: JSON.stringify(this.data, null, 2)
                    }
                }
            };

            const url = gistId ? 
                `https://api.github.com/gists/${gistId}` : 
                'https://api.github.com/gists';
            
            const response = await fetch(url, {
                method: gistId ? 'PATCH' : 'POST',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            if (result.id && !gistId) {
                localStorage.setItem('github_gist_id', result.id);
            }
        } catch (error) {
            console.log('Sync to GitHub failed:', error);
        }
    }

    async loadFromGist() {
        try {
            const token = localStorage.getItem('github_token');
            const gistId = localStorage.getItem('github_gist_id');
            if (!token || !gistId) return;

            const response = await fetch(`https://api.github.com/gists/${gistId}`, {
                headers: {
                    'Authorization': `token ${token}`
                }
            });

            const gist = await response.json();
            const dbContent = gist.files['sitecore_db.json'].content;
            const remoteData = JSON.parse(dbContent);

            // Объединяем данные (простейшая синхронизация)
            this.data = this.mergeData(this.data, remoteData);
            this.save();
        } catch (error) {
            console.log('Load from GitHub failed:', error);
        }
    }

    mergeData(local, remote) {
        // Простейший алгоритм слияния - берем самую свежую запись
        const result = { ...remote };
        
        // Сливаем заказы
        if (local.orders) {
            local.orders.forEach(localOrder => {
                const remoteOrder = result.orders.find(r => r.id === localOrder.id);
                if (!remoteOrder) {
                    result.orders.push(localOrder);
                } else if (new Date(localOrder.updatedDate) > new Date(remoteOrder.updatedDate)) {
                    Object.assign(remoteOrder, localOrder);
                }
            });
        }

        return result;
    }

    // ========== СТАТИСТИКА ==========
    getStats() {
        const totalOrders = this.data.orders.length;
        const completedOrders = this.data.orders.filter(o => o.status === 'completed').length;
        const totalBudget = this.data.orders.reduce((sum, order) => sum + order.budget, 0);
        const activeExecutors = this.data.executors.filter(e => e.stats.inProgress > 0).length;

        return {
            totalOrders,
            completedOrders,
            totalBudget,
            activeExecutors,
            totalClients: this.data.clients.length
        };
    }
}

// Создаем глобальный экземпляр базы данных
window.SiteCoreDB = new SiteCoreDB();
