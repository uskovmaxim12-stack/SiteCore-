// SiteCore Cloud Database System
class SiteCoreDatabase {
    constructor() {
        this.API_URL = 'https://sitecore-db.sergey-evdokimov.workers.dev';
        this.isOnline = true;
        this.localCache = null;
        this.lastSync = 0;
    }

    // Инициализация базы данных
    async init() {
        try {
            // Проверяем соединение с облачной базой
            const response = await fetch(`${this.API_URL}/ping`);
            if (!response.ok) throw new Error('Cloud DB offline');
            
            // Загружаем текущую базу
            const data = await this.fetchDB();
            if (data) {
                this.localCache = data;
                this.lastSync = Date.now();
                console.log('Cloud database loaded successfully');
                return true;
            }
        } catch (error) {
            console.warn('Cloud DB offline, using local storage');
            this.isOnline = false;
            return this.loadLocal();
        }
    }

    // Загрузка базы из облака
    async fetchDB() {
        try {
            const response = await fetch(`${this.API_URL}/db`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            return null;
        }
    }

    // Сохранение в облако
    async saveDB(data) {
        try {
            const response = await fetch(`${this.API_URL}/db`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Локальное хранение как резерв
    loadLocal() {
        const localData = localStorage.getItem('sitecore_db_backup');
        if (localData) {
            this.localCache = JSON.parse(localData);
            return true;
        }
        
        // Создаем начальную структуру
        this.localCache = {
            version: '3.0',
            users: {
                clients: [],
                developers: [
                    {
                        id: 'dev_1',
                        name: 'Максим',
                        password: '140612',
                        avatar: 'М',
                        email: 'maxim@sitecore.ru',
                        role: 'developer'
                    },
                    {
                        id: 'dev_2',
                        name: 'Александр',
                        password: '789563',
                        avatar: 'А',
                        email: 'alexander@sitecore.ru',
                        role: 'developer'
                    }
                ]
            },
            orders: [],
            messages: [],
            settings: {
                discountActive: true,
                discountPercent: 15
            },
            stats: {
                totalOrders: 0,
                completedOrders: 0,
                totalRevenue: 0
            }
        };
        
        this.saveLocal();
        return true;
    }

    saveLocal() {
        localStorage.setItem('sitecore_db_backup', JSON.stringify(this.localCache));
    }

    // Синхронизация (автоматическая каждые 30 секунд)
    async sync() {
        if (!this.isOnline || Date.now() - this.lastSync < 30000) return;
        
        try {
            await this.saveDB(this.localCache);
            this.lastSync = Date.now();
            console.log('Database synced to cloud');
        } catch (error) {
            console.warn('Sync failed, saving locally');
            this.saveLocal();
        }
    }

    // CRUD операции
    async addUser(user) {
        const newUser = {
            id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...user,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        if (user.type === 'client') {
            this.localCache.users.clients.push(newUser);
        } else if (user.type === 'developer') {
            this.localCache.users.developers.push(newUser);
        }

        await this.sync();
        return newUser;
    }

    async findUser(type, query) {
        const users = type === 'client' ? this.localCache.users.clients : this.localCache.users.developers;
        
        if (query.email && query.password) {
            return users.find(u => u.email === query.email && u.password === query.password);
        } else if (query.password && type === 'developer') {
            return users.find(u => u.password === query.password);
        } else if (query.id) {
            return users.find(u => u.id === query.id);
        }
        
        return null;
    }

    async createOrder(orderData) {
        const newOrder = {
            id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...orderData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'new',
            messages: []
        };

        this.localCache.orders.push(newOrder);
        this.localCache.stats.totalOrders++;
        
        await this.sync();
        return newOrder;
    }

    async getOrders(filter = {}) {
        let orders = [...this.localCache.orders];
        
        if (filter.clientId) {
            orders = orders.filter(o => o.clientId === filter.clientId);
        }
        
        if (filter.assignedTo) {
            orders = orders.filter(o => o.assignedTo === filter.assignedTo);
        }
        
        if (filter.status && filter.status !== 'all') {
            orders = orders.filter(o => o.status === filter.status);
        }
        
        return orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    async updateOrder(orderId, updates) {
        const orderIndex = this.localCache.orders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) return null;
        
        this.localCache.orders[orderIndex] = {
            ...this.localCache.orders[orderIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        if (updates.status === 'completed') {
            this.localCache.stats.completedOrders++;
        }
        
        await this.sync();
        return this.localCache.orders[orderIndex];
    }

    async addMessage(orderId, message) {
        const order = this.localCache.orders.find(o => o.id === orderId);
        if (!order) return null;
        
        const newMessage = {
            id: `msg_${Date.now()}`,
            ...message,
            timestamp: new Date().toISOString()
        };
        
        if (!order.messages) order.messages = [];
        order.messages.push(newMessage);
        
        await this.sync();
        return newMessage;
    }

    // Получение статистики
    getStats() {
        return this.localCache.stats;
    }

    // Получение настроек
    getSettings() {
        const now = new Date();
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const daysLeft = Math.ceil((endOfMonth - now) / (1000 * 60 * 60 * 24));
        
        return {
            ...this.localCache.settings,
            daysLeft: daysLeft > 0 ? daysLeft : 0
        };
    }
}

// Создаем глобальный экземпляр базы данных
window.SiteCoreDB = new SiteCoreDatabase();
