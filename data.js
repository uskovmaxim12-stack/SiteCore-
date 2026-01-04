// data.js - Простая локальная база данных
class SiteCoreDB {
    constructor() {
        // Пароли разработчиков
        this.developers = {
            "789563": { id: "dev_1", name: "Александр", avatar: "А" },
            "140612": { id: "dev_2", name: "Максим", avatar: "М" }
        };
        
        // Загрузка данных из localStorage
        this.orders = JSON.parse(localStorage.getItem('sitecore_orders') || '[]');
        this.clients = JSON.parse(localStorage.getItem('sitecore_clients') || '[]');
        this.messages = JSON.parse(localStorage.getItem('sitecore_messages') || '[]');
    }
    
    // Сохранение всех данных
    save() {
        localStorage.setItem('sitecore_orders', JSON.stringify(this.orders));
        localStorage.setItem('sitecore_clients', JSON.stringify(this.clients));
        localStorage.setItem('sitecore_messages', JSON.stringify(this.messages));
        return true;
    }
    
    // Клиенты
    registerClient(name, email, phone, telegram, password) {
        const client = {
            id: 'client_' + Date.now(),
            name: name,
            email: email,
            phone: phone,
            telegram: telegram,
            password: password,
            avatar: name.charAt(0).toUpperCase(),
            createdAt: new Date().toISOString()
        };
        
        this.clients.push(client);
        this.save();
        return client;
    }
    
    findClient(email, password) {
        return this.clients.find(c => c.email === email && c.password === password);
    }
    
    findClientById(id) {
        return this.clients.find(c => c.id === id);
    }
    
    // Заказы
    createOrder(clientId, data) {
        const client = this.findClientById(clientId);
        const order = {
            id: 'order_' + Date.now(),
            clientId: clientId,
            clientName: client.name,
            clientEmail: client.email,
            clientPhone: client.phone,
            clientTelegram: client.telegram,
            projectName: data.projectName,
            projectType: data.projectType,
            budget: parseInt(data.budget),
            deadline: parseInt(data.deadline),
            prompt: data.prompt,
            status: 'new',
            assignedTo: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.orders.push(order);
        
        // Добавляем системное сообщение
        this.addMessage(order.id, 'system', `Заказ "${data.projectName}" создан`);
        
        this.save();
        return order;
    }
    
    getOrders() {
        return this.orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    getClientOrders(clientId) {
        return this.orders.filter(order => order.clientId === clientId);
    }
    
    getAvailableOrders() {
        return this.orders.filter(order => !order.assignedTo && order.status === 'new');
    }
    
    getDeveloperOrders(developerId) {
        return this.orders.filter(order => order.assignedTo === developerId);
    }
    
    updateOrderStatus(orderId, status, developerId = null) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            const oldStatus = order.status;
            order.status = status;
            order.updatedAt = new Date().toISOString();
            
            if (developerId && status === 'in_progress' && !order.assignedTo) {
                order.assignedTo = developerId;
            }
            
            this.addMessage(orderId, 'system', 
                developerId 
                ? `Разработчик изменил статус с "${this.getStatusText(oldStatus)}" на "${this.getStatusText(status)}"`
                : `Клиент изменил статус на "${this.getStatusText(status)}"`
            );
            
            this.save();
        }
    }
    
    assignOrder(orderId, developerId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            order.assignedTo = developerId;
            order.status = 'in_progress';
            order.updatedAt = new Date().toISOString();
            
            const developer = Object.values(this.developers).find(d => d.id === developerId);
            this.addMessage(orderId, 'system', `Разработчик ${developer.name} взял заказ в работу`);
            
            this.save();
        }
    }
    
    // Сообщения
    addMessage(orderId, sender, text) {
        const message = {
            id: 'msg_' + Date.now(),
            orderId: orderId,
            text: text,
            sender: sender,
            timestamp: new Date().toISOString()
        };
        
        this.messages.push(message);
        this.save();
        return message;
    }
    
    getOrderMessages(orderId) {
        return this.messages.filter(m => m.orderId === orderId)
            .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    }
    
    // Вспомогательные функции
    getStatusText(status) {
        const statuses = {
            'new': 'Новый',
            'in_progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершён',
            'cancelled': 'Отменён'
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
    
    // Статистика
    getClientStats(clientId) {
        const orders = this.getClientOrders(clientId);
        return {
            total: orders.length,
            active: orders.filter(o => !['completed', 'cancelled'].includes(o.status)).length,
            completed: orders.filter(o => o.status === 'completed').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length
        };
    }
    
    getDeveloperStats(developerId) {
        const orders = this.getDeveloperOrders(developerId);
        return {
            total: orders.length,
            available: this.getAvailableOrders().length,
            active: orders.filter(o => o.status === 'in_progress').length,
            completed: orders.filter(o => o.status === 'completed').length
        };
    }
}

// Глобальный экземпляр базы данных
window.sitecoreDB = new SiteCoreDB();
