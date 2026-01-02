// ============================================================================
// SITECORE PLATFORM 2026
// Полная система управления заказами на разработку сайтов
// ============================================================================

class SiteCorePlatform {
    constructor() {
        // Состояние приложения
        this.state = {
            currentUser: null,
            currentView: 'landing',
            currentSection: 'dashboard',
            currentChatId: null,
            currentModal: null,
            uploadedFiles: []
        };

        // Инициализация данных
        this.initializeData();
        
        // Инициализация приложения
        this.init();
    }

    // ============================================================================
    // ИНИЦИАЛИЗАЦИЯ
    // ============================================================================

    init() {
        this.loadUser();
        this.showView(this.state.currentView);
        this.setupEventListeners();
        this.updateDate();
    }

    initializeData() {
        // Инициализация данных если они отсутствуют
        
        // Исполнители (разработчики)
        if (!localStorage.getItem('sitecore_developers')) {
            const developers = [
                {
                    id: 1,
                    name: "Александр",
                    password: "789653",
                    role: "developer",
                    position: "Team Lead Разработчик",
                    avatar: "А",
                    online: true,
                    currentTasks: 0,
                    completedTasks: 0,
                    rating: 4.8
                },
                {
                    id: 2,
                    name: "Максим",
                    password: "140612",
                    role: "developer",
                    position: "Frontend Специалист",
                    avatar: "М",
                    online: true,
                    currentTasks: 0,
                    completedTasks: 0,
                    rating: 4.6
                }
            ];
            localStorage.setItem('sitecore_developers', JSON.stringify(developers));
        }

        // Клиенты
        if (!localStorage.getItem('sitecore_clients')) {
            localStorage.setItem('sitecore_clients', JSON.stringify([]));
        }

        // Заказы
        if (!localStorage.getItem('sitecore_orders')) {
            localStorage.setItem('sitecore_orders', JSON.stringify([]));
        }

        // Сообщения
        if (!localStorage.getItem('sitecore_messages')) {
            localStorage.setItem('sitecore_messages', JSON.stringify({}));
        }
    }

    // ============================================================================
    // УПРАВЛЕНИЕ ДАННЫМИ
    // ============================================================================

    // Получение всех разработчиков
    getDevelopers() {
        return JSON.parse(localStorage.getItem('sitecore_developers') || '[]');
    }

    // Получение всех клиентов
    getClients() {
        return JSON.parse(localStorage.getItem('sitecore_clients') || '[]');
    }

    // Получение всех заказов
    getOrders() {
        return JSON.parse(localStorage.getItem('sitecore_orders') || '[]');
    }

    // Получение сообщений заказа
    getOrderMessages(orderId) {
        const allMessages = JSON.parse(localStorage.getItem('sitecore_messages') || '{}');
        return allMessages[orderId] || [];
    }

    // Сохранение данных
    saveDevelopers(developers) {
        localStorage.setItem('sitecore_developers', JSON.stringify(developers));
    }

    saveClients(clients) {
        localStorage.setItem('sitecore_clients', JSON.stringify(clients));
    }

    saveOrders(orders) {
        localStorage.setItem('sitecore_orders', JSON.stringify(orders));
    }

    saveOrderMessages(orderId, messages) {
        const allMessages = JSON.parse(localStorage.getItem('sitecore_messages') || '{}');
        allMessages[orderId] = messages;
        localStorage.setItem('sitecore_messages', JSON.stringify(allMessages));
    }

    // ============================================================================
    // АУТЕНТИФИКАЦИЯ
    // ============================================================================

    loadUser() {
        const userData = localStorage.getItem('currentUser');
        if (userData) {
            this.state.currentUser = JSON.parse(userData);
            this.showView(this.state.currentUser.role === 'client' ? 'client-dashboard' : 'developer-dashboard');
        }
    }

    saveUser(user) {
        localStorage.setItem('currentUser', JSON.stringify(user));
        this.state.currentUser = user;
    }

    logout() {
        localStorage.removeItem('currentUser');
        this.state.currentUser = null;
        this.state.currentView = 'landing';
        this.state.currentSection = 'dashboard';
        this.state.currentChatId = null;
        this.showView('landing');
        this.showNotification('Вы успешно вышли из системы', 'success');
    }

    // Регистрация клиента
    registerClient(clientData) {
        const clients = this.getClients();
        
        // Проверка уникальности email
        const existingClient = clients.find(c => c.email === clientData.email);
        if (existingClient) {
            return { success: false, message: "Клиент с таким email уже зарегистрирован" };
        }

        // Создание нового клиента
        const newClient = {
            id: Date.now(),
            ...clientData,
            role: "client",
            avatar: clientData.name.charAt(0).toUpperCase(),
            registrationDate: new Date().toISOString(),
            status: "active",
            ordersCount: 0,
            totalSpent: 0
        };

        clients.push(newClient);
        this.saveClients(clients);

        return { success: true, user: newClient };
    }

    // Аутентификация клиента
    authenticateClient(email, password) {
        const clients = this.getClients();
        const client = clients.find(c => c.email === email && c.password === password);
        
        if (client) {
            const { password: _, ...clientWithoutPassword } = client;
            return clientWithoutPassword;
        }
        
        return null;
    }

    // Аутентификация разработчика
    authenticateDeveloper(name, password) {
        const developers = this.getDevelopers();
        const developer = developers.find(d => 
            d.name === name && d.password === password
        );
        
        if (developer) {
            const { password: _, ...developerWithoutPassword } = developer;
            return developerWithoutPassword;
        }
        
        return null;
    }

    // ============================================================================
    // УПРАВЛЕНИЕ ЗАКАЗАМИ
    // ============================================================================

    // Создание заказа
    createOrder(orderData) {
        const orders = this.getOrders();
        const clients = this.getClients();
        
        const client = clients.find(c => c.id === orderData.clientId);
        if (!client) {
            return { success: false, message: "Клиент не найден" };
        }

        // Валидация промта
        if (orderData.prompt.length < 300) {
            return { success: false, message: "Промт должен содержать минимум 300 символов" };
        }

        if (orderData.prompt.length > 2500) {
            return { success: false, message: "Промт должен содержать максимум 2500 символов" };
        }

        // Создание заказа
        const newOrder = {
            id: Date.now(),
            ...orderData,
            status: 'new',
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
            developerId: null,
            developerName: null,
            progress: 0,
            messagesCount: 0,
            attachments: orderData.attachments || []
        };

        orders.push(newOrder);
        this.saveOrders(orders);

        // Обновляем статистику клиента
        client.ordersCount = (client.ordersCount || 0) + 1;
        this.updateClient(client);

        // Создаем чат для заказа
        this.initOrderChat(newOrder.id);

        return {
            success: true,
            order: newOrder
        };
    }

    // Назначение заказа разработчику
    assignOrder(orderId, developerId) {
        const orders = this.getOrders();
        const developers = this.getDevelopers();
        
        const orderIndex = orders.findIndex(o => o.id === orderId);
        const developer = developers.find(d => d.id === developerId);
        
        if (orderIndex === -1) {
            return { success: false, message: "Заказ не найден" };
        }

        if (!developer) {
            return { success: false, message: "Разработчик не найден" };
        }

        // Обновляем заказ
        orders[orderIndex] = {
            ...orders[orderIndex],
            developerId: developerId,
            developerName: developer.name,
            status: 'in-progress',
            assignedDate: new Date().toISOString(),
            updatedDate: new Date().toISOString()
        };

        this.saveOrders(orders);

        // Обновляем статистику разработчика
        developer.currentTasks = (developer.currentTasks || 0) + 1;
        this.updateDeveloper(developer);

        // Создаем системное сообщение
        this.addSystemMessage(orderId, `Заказ назначен разработчику ${developer.name}`);

        return {
            success: true,
            order: orders[orderIndex]
        };
    }

    // Обновление статуса заказа
    updateOrderStatus(orderId, status) {
        const orders = this.getOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) {
            return { success: false, message: "Заказ не найден" };
        }

        const oldStatus = orders[orderIndex].status;
        orders[orderIndex] = {
            ...orders[orderIndex],
            status: status,
            updatedDate: new Date().toISOString()
        };

        // Если заказ завершен, обновляем статистику разработчика
        if (status === 'completed' && oldStatus !== 'completed') {
            const developers = this.getDevelopers();
            const developer = developers.find(d => d.id === orders[orderIndex].developerId);
            
            if (developer) {
                developer.currentTasks = Math.max(0, (developer.currentTasks || 0) - 1);
                developer.completedTasks = (developer.completedTasks || 0) + 1;
                this.updateDeveloper(developer);
            }
            
            // Добавляем дату завершения
            orders[orderIndex].completedDate = new Date().toISOString();
        }

        this.saveOrders(orders);

        // Создаем системное сообщение
        const statusText = this.getStatusText(status);
        this.addSystemMessage(orderId, `Статус изменен на: ${statusText}`);

        return {
            success: true,
            order: orders[orderIndex]
        };
    }

    // Получение заказов клиента
    getClientOrders(clientId) {
        const orders = this.getOrders();
        return orders.filter(order => order.clientId === clientId);
    }

    // Получение заказов разработчика
    getDeveloperOrders(developerId) {
        const orders = this.getOrders();
        return orders.filter(order => order.developerId === developerId);
    }

    // Получение доступных заказов
    getAvailableOrders() {
        const orders = this.getOrders();
        return orders.filter(order => !order.developerId && order.status === 'new');
    }

    // ============================================================================
    // ЧАТ И СООБЩЕНИЯ
    // ============================================================================

    // Инициализация чата для заказа
    initOrderChat(orderId) {
        const messages = this.getOrderMessages(orderId);
        
        // Добавляем приветственное сообщение
        this.addSystemMessage(orderId, 'Заказ создан. Ожидайте назначения разработчика.');
        
        return messages;
    }

    // Добавление сообщения
    addMessage(orderId, messageData) {
        const messages = this.getOrderMessages(orderId);
        
        const newMessage = {
            id: Date.now(),
            ...messageData,
            timestamp: new Date().toISOString(),
            read: false
        };
        
        messages.push(newMessage);
        this.saveOrderMessages(orderId, messages);
        
        // Обновляем счетчик сообщений в заказе
        const orders = this.getOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex !== -1) {
            orders[orderIndex].messagesCount = (orders[orderIndex].messagesCount || 0) + 1;
            orders[orderIndex].updatedDate = new Date().toISOString();
            this.saveOrders(orders);
        }
        
        return newMessage;
    }

    // Добавление системного сообщения
    addSystemMessage(orderId, text) {
        return this.addMessage(orderId, {
            senderId: 'system',
            senderName: 'Система',
            senderRole: 'system',
            text: text,
            type: 'system'
        });
    }

    // Пометить сообщения как прочитанные
    markMessagesAsRead(orderId, role) {
        const messages = this.getOrderMessages(orderId);
        const updatedMessages = messages.map(msg => {
            if (msg.senderRole !== role && !msg.read) {
                return { ...msg, read: true };
            }
            return msg;
        });
        
        this.saveOrderMessages(orderId, updatedMessages);
    }

    // ============================================================================
    // ОБНОВЛЕНИЕ ДАННЫХ
    // ============================================================================

    updateClient(client) {
        const clients = this.getClients();
        const clientIndex = clients.findIndex(c => c.id === client.id);
        
        if (clientIndex !== -1) {
            clients[clientIndex] = client;
            this.saveClients(clients);
        }
    }

    updateDeveloper(developer) {
        const developers = this.getDevelopers();
        const developerIndex = developers.findIndex(d => d.id === developer.id);
        
        if (developerIndex !== -1) {
            developers[developerIndex] = developer;
            this.saveDevelopers(developers);
        }
    }

    // ============================================================================
    // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
    // ============================================================================

    getStatusText(status) {
        const statuses = {
            'new': 'Новый',
            'in-progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершен',
            'paid': 'Оплачен'
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

    getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 60) {
            return `${diffMins} мин назад`;
        } else if (diffHours < 24) {
            return `${diffHours} ч назад`;
        } else if (diffDays === 1) {
            return 'Вчера';
        } else {
            return `${diffDays} дн назад`;
        }
    }

    // ============================================================================
    // ИНТЕРФЕЙС
    // ============================================================================

    showView(view) {
        this.state.currentView = view;
        
        // Скрываем все вью
        document.querySelectorAll('.landing, .form-container, .dashboard').forEach(el => {
            el.classList.remove('active');
        });
        
        // Показываем нужную вью
        switch(view) {
            case 'landing':
                document.getElementById('landing').classList.add('active');
                break;
            case 'client-login':
                document.getElementById('client-login-form').classList.add('active');
                break;
            case 'client-register':
                document.getElementById('client-register-form').classList.add('active');
                break;
            case 'developer-login':
                document.getElementById('developer-login-form').classList.add('active');
                break;
            case 'client-dashboard':
                document.getElementById('client-dashboard').classList.add('active');
                this.loadClientDashboard();
                break;
            case 'developer-dashboard':
                document.getElementById('developer-dashboard').classList.add('active');
                this.loadDeveloperDashboard();
                break;
        }
    }

    showSection(section) {
        this.state.currentSection = section;
        
        // Скрываем все секции
        document.querySelectorAll('.content-section').forEach(el => {
            el.classList.remove('active');
        });
        
        // Показываем нужную секцию
        const sectionId = this.state.currentUser?.role === 'client' ? 
            `client-${section}-section` : 
            section === 'dev-dashboard' ? 'dev-dashboard-section' : `${section}-section`;
        
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        }
        
        // Обновляем активные ссылки в навигации
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === section) {
                link.classList.add('active');
            }
        });
        
        // Загружаем данные для секции
        this.loadSectionData(section);
    }

    showModal(title, content) {
        document.getElementById('modalOrderTitle').textContent = title;
        document.getElementById('modalOrderContent').innerHTML = content;
        document.getElementById('orderModal').classList.add('active');
        this.state.currentModal = 'order';
    }

    closeModal() {
        document.getElementById('orderModal').classList.remove('active');
        this.state.currentModal = null;
    }

    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const text = document.getElementById('notificationText');
        
        text.textContent = message;
        notification.className = `notification ${type} active`;
        
        setTimeout(() => {
            notification.classList.remove('active');
        }, 3000);
    }

    // ============================================================================
    // ЗАГРУЗКА ДАННЫХ ИНТЕРФЕЙСА
    // ============================================================================

    loadClientDashboard() {
        if (!this.state.currentUser) return;
        
        // Обновляем информацию пользователя
        document.getElementById('clientName').textContent = this.state.currentUser.name;
        document.getElementById('clientAvatar').textContent = this.state.currentUser.avatar;
        document.getElementById('welcomeClientName').textContent = this.state.currentUser.name.split(' ')[0];
        
        // Обновляем статистику
        const orders = this.getClientOrders(this.state.currentUser.id);
        const activeOrders = orders.filter(o => o.status === 'new' || o.status === 'in-progress' || o.status === 'review').length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const totalBudget = orders.reduce((sum, o) => sum + (o.budget || 0), 0);
        const newMessages = this.countUnreadMessages('client');
        
        document.getElementById('activeOrdersCount').textContent = activeOrders;
        document.getElementById('completedOrdersCount').textContent = completedOrders;
        document.getElementById('totalBudget').textContent = this.formatCurrency(totalBudget);
        document.getElementById('newMessagesCount').textContent = newMessages;
        document.getElementById('ordersBadge').textContent = orders.length;
        document.getElementById('messagesBadge').textContent = newMessages > 0 ? newMessages : '';
        
        // Показываем первую секцию
        this.showSection('dashboard');
    }

    loadDeveloperDashboard() {
        if (!this.state.currentUser) return;
        
        // Обновляем информацию пользователя
        document.getElementById('developerName').textContent = this.state.currentUser.name;
        document.getElementById('developerAvatar').textContent = this.state.currentUser.avatar;
        document.getElementById('welcomeDeveloperName').textContent = this.state.currentUser.name;
        
        // Обновляем статистику
        const myOrders = this.getDeveloperOrders(this.state.currentUser.id);
        const availableOrders = this.getAvailableOrders();
        const completedOrders = myOrders.filter(o => o.status === 'completed').length;
        const activeOrders = myOrders.filter(o => o.status === 'in-progress' || o.status === 'review').length;
        const earnedAmount = myOrders
            .filter(o => o.status === 'completed')
            .reduce((sum, o) => sum + (o.budget || 0), 0);
        const newMessages = this.countUnreadMessages('developer');
        
        document.getElementById('myTasksCount').textContent = activeOrders;
        document.getElementById('completedTasksCount').textContent = completedOrders;
        document.getElementById('earnedAmount').textContent = this.formatCurrency(earnedAmount);
        document.getElementById('devNewMessagesCount').textContent = newMessages;
        document.getElementById('availableOrdersBadge').textContent = availableOrders.length;
        document.getElementById('myOrdersBadge').textContent = myOrders.length;
        document.getElementById('devMessagesBadge').textContent = newMessages > 0 ? newMessages : '';
        
        // Загружаем срочные задачи
        this.loadUrgentTasks();
        
        // Показываем первую секцию
        this.showSection('dev-dashboard');
    }

    loadSectionData(section) {
        switch(section) {
            case 'orders':
                this.loadClientOrders();
                break;
            case 'new-order':
                this.setupNewOrderForm();
                break;
            case 'messages':
                this.loadClientMessages();
                break;
            case 'profile':
                this.loadClientProfile();
                break;
            case 'available-orders':
                this.loadAvailableOrders();
                break;
            case 'my-orders':
                this.loadDeveloperOrders();
                break;
            case 'dev-messages':
                this.loadDeveloperMessages();
                break;
            case 'clients':
                this.loadClientsList();
                break;
        }
    }

    countUnreadMessages(role) {
        let orders = [];
        if (role === 'client') {
            orders = this.getClientOrders(this.state.currentUser.id);
        } else {
            orders = this.getDeveloperOrders(this.state.currentUser.id);
        }
        
        let unreadCount = 0;
        
        orders.forEach(order => {
            const messages = this.getOrderMessages(order.id);
            const unread = messages.filter(msg => 
                msg.senderRole !== role && msg.senderRole !== 'system' && !msg.read
            ).length;
            unreadCount += unread;
        });
        
        return unreadCount;
    }

    loadUrgentTasks() {
        const myOrders = this.getDeveloperOrders(this.state.currentUser.id);
        const urgentTasks = myOrders
            .filter(o => o.status === 'in-progress')
            .slice(0, 3);
        
        const container = document.getElementById('urgentTasksList');
        if (!container) return;
        
        if (urgentTasks.length === 0) {
            container.innerHTML = `
                <div style="background: white; padding: 30px; border-radius: var(--radius); text-align: center; color: var(--gray);">
                    <i class="fas fa-check-circle" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <p>Нет активных задач</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = urgentTasks.map(order => {
            return `
                <div style="background: white; padding: 25px; border-radius: var(--radius); margin-bottom: 15px; border-left: 4px solid var(--warning);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                        <h4 style="font-size: 16px; font-weight: 600; color: var(--dark);">${order.projectName}</h4>
                        <span class="status-badge status-in-progress">В работе</span>
                    </div>
                    <p style="color: var(--gray); margin-bottom: 15px; font-size: 14px;">${order.prompt.substring(0, 80)}...</p>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 14px; color: var(--gray);">${order.clientName}</span>
                        <span style="font-weight: 600; color: var(--dark);">${this.formatCurrency(order.budget)}</span>
                    </div>
                </div>
            `;
        }).join('');
    }

    // ============================================================================
    // ФОРМЫ И ВАЛИДАЦИЯ
    // ============================================================================

    setupNewOrderForm() {
        const promptInput = document.getElementById('projectPrompt');
        const promptCounter = document.getElementById('promptCounter');
        
        if (!promptInput || !promptCounter) return;
        
        promptInput.addEventListener('input', () => {
            const count = promptInput.value.length;
            promptCounter.textContent = `${count}/2500 символов`;
            
            if (count < 300) {
                promptCounter.className = 'prompt-counter error';
            } else if (count > 2500) {
                promptCounter.className = 'prompt-counter error';
            } else {
                promptCounter.className = 'prompt-counter success';
            }
        });
        
        // Сброс формы
        document.getElementById('newOrderForm').reset();
        promptCounter.textContent = '0/2500 символов';
        promptCounter.className = 'prompt-counter';
    }

    // ============================================================================
    // ОБРАБОТЧИКИ СОБЫТИЙ
    // ============================================================================

    setupEventListeners() {
        // Навигация между формами
        document.getElementById('client-login-btn').addEventListener('click', () => {
            this.showView('client-login');
        });
        
        document.getElementById('client-register-btn').addEventListener('click', () => {
            this.showView('client-register');
        });
        
        document.getElementById('developer-login-btn').addEventListener('click', () => {
            this.showView('developer-login');
        });
        
        // Кнопки "Назад"
        document.getElementById('back-from-login').addEventListener('click', () => {
            this.showView('landing');
        });
        
        document.getElementById('back-from-register').addEventListener('click', () => {
            this.showView('landing');
        });
        
        document.getElementById('back-from-developer').addEventListener('click', () => {
            this.showView('landing');
        });
        
        // Переключение между регистрацией и входом
        document.getElementById('to-register-btn').addEventListener('click', () => {
            this.showView('client-register');
        });
        
        document.getElementById('to-login-btn').addEventListener('click', () => {
            this.showView('client-login');
        });
        
        // Отображение/скрытие пароля
        document.querySelectorAll('.password-toggle').forEach(button => {
            button.addEventListener('click', (e) => {
                const targetId = e.target.closest('.password-toggle').getAttribute('data-target');
                const input = document.getElementById(targetId);
                const icon = e.target.closest('.password-toggle').querySelector('i');
                
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });
        
        // Форма входа клиента
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            
            const user = this.authenticateClient(email, password);
            
            if (user) {
                this.saveUser(user);
                this.showView('client-dashboard');
                this.showNotification('Вход выполнен успешно', 'success');
            } else {
                this.showNotification('Неверный email или пароль', 'error');
            }
        });
        
        // Форма регистрации клиента
        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim();
            const phone = document.getElementById('registerPhone').value.trim();
            const telegram = document.getElementById('registerTelegram').value.trim();
            const password = document.getElementById('registerPassword').value;
            const confirmPassword = document.getElementById('registerConfirmPassword').value;
            
            // Валидация
            if (password !== confirmPassword) {
                this.showNotification('Пароли не совпадают', 'error');
                return;
            }
            
            if (password.length < 6) {
                this.showNotification('Пароль должен содержать не менее 6 символов', 'error');
                return;
            }
            
            if (!telegram.startsWith('@')) {
                this.showNotification('Telegram должен начинаться с @', 'error');
                return;
            }
            
            // Регистрация клиента
            const result = this.registerClient({
                name,
                email,
                phone,
                telegram,
                password
            });
            
            if (result.success) {
                // Автоматический вход после регистрации
                const user = this.authenticateClient(email, password);
                if (user) {
                    this.saveUser(user);
                    this.showView('client-dashboard');
                    this.showNotification('Регистрация прошла успешно!', 'success');
                }
            } else {
                this.showNotification(result.message, 'error');
            }
        });
        
        // Форма входа разработчика
        document.getElementById('developerLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const name = document.getElementById('developerSelect').value;
            const password = document.getElementById('developerPassword').value;
            
            if (!name) {
                this.showNotification('Выберите разработчика', 'error');
                return;
            }
            
            const user = this.authenticateDeveloper(name, password);
            
            if (user) {
                this.saveUser(user);
                this.showView('developer-dashboard');
                this.showNotification('Вход выполнен успешно', 'success');
            } else {
                this.showNotification('Неверный пароль', 'error');
            }
        });
        
        // Навигация в дашбордах
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = e.target.closest('.nav-link').getAttribute('data-section');
                this.showSection(section);
            });
        });
        
        // Выход
        document.getElementById('clientLogout').addEventListener('click', () => {
            this.logout();
        });
        
        document.getElementById('developerLogout').addEventListener('click', () => {
            this.logout();
        });
        
        // Создание заказа
        document.getElementById('newOrderForm').addEventListener('submit', (e) => {
            e.preventDefault();
            
            const projectName = document.getElementById('projectName').value.trim();
            const projectType = document.getElementById('projectType').value;
            const budget = parseInt(document.getElementById('projectBudget').value);
            const deadline = parseInt(document.getElementById('projectDeadline').value);
            const prompt = document.getElementById('projectPrompt').value.trim();
            
            // Валидация
            if (!projectName || !projectType || !budget || !deadline || !prompt) {
                this.showNotification('Заполните все обязательные поля', 'error');
                return;
            }
            
            if (budget < 10000) {
                this.showNotification('Бюджет должен быть не менее 10,000 руб.', 'error');
                return;
            }
            
            if (deadline < 3) {
                this.showNotification('Срок должен быть не менее 3 дней', 'error');
                return;
            }
            
            if (prompt.length < 300) {
                this.showNotification('Промт должен содержать минимум 300 символов', 'error');
                return;
            }
            
            if (prompt.length > 2500) {
                this.showNotification('Промт должен содержать максимум 2500 символов', 'error');
                return;
            }
            
            // Создание заказа
            const result = this.createOrder({
                clientId: this.state.currentUser.id,
                clientName: this.state.currentUser.name,
                clientEmail: this.state.currentUser.email,
                clientPhone: this.state.currentUser.phone,
                clientTelegram: this.state.currentUser.telegram,
                projectName,
                projectType,
                budget,
                deadline,
                prompt
            });
            
            if (result.success) {
                this.showNotification('Заказ успешно создан!', 'success');
                this.showSection('orders');
            } else {
                this.showNotification(result.message, 'error');
            }
        });
        
        // Отмена создания заказа
        document.getElementById('cancelOrderBtn').addEventListener('click', () => {
            this.showSection('dashboard');
        });
        
        // Закрытие модального окна
        document.getElementById('modalClose').addEventListener('click', () => {
            this.closeModal();
        });
        
        // Клик по фону модального окна
        document.getElementById('orderModal').addEventListener('click', (e) => {
            if (e.target === document.getElementById('orderModal')) {
                this.closeModal();
            }
        });
        
        // Редактирование профиля
        document.getElementById('editProfileBtn').addEventListener('click', () => {
            this.showNotification('Редактирование профиля будет доступно в следующем обновлении', 'info');
        });
    }

    // ============================================================================
    // ЗАГРУЗКА ДАННЫХ ДЛЯ СЕКЦИЙ
    // ============================================================================

    loadClientOrders() {
        if (!this.state.currentUser) return;
        
        const orders = this.getClientOrders(this.state.currentUser.id);
        const tbody = document.getElementById('clientOrdersBody');
        
        if (!tbody) return;
        
        if (orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--gray);">
                        <i class="fas fa-file-alt" style="font-size: 48px; margin-bottom: 20px; display: block;"></i>
                        <p>У вас пока нет заказов</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = orders.map(order => {
            const deadline = new Date(order.createdDate);
            deadline.setDate(deadline.getDate() + order.deadline);
            const daysLeft = Math.ceil((deadline - new Date()) / (1000 * 60 * 60 * 24));
            
            return `
                <tr>
                    <td>
                        <strong>${order.projectName}</strong><br>
                        <small style="color: var(--gray);">${order.projectType === 'static' ? 'Статический сайт' : 'Динамический сайт'}</small>
                    </td>
                    <td>${order.projectType === 'static' ? 'Статический' : 'Динамический'}</td>
                    <td><strong>${this.formatCurrency(order.budget)}</strong></td>
                    <td>${order.deadline} дней<br><small style="color: ${daysLeft < 3 ? 'var(--danger)' : 'var(--gray)'};">${daysLeft > 0 ? `Осталось: ${daysLeft} дн.` : 'Просрочен'}</small></td>
                    <td><span class="status-badge status-${order.status}">${this.getStatusText(order.status)}</span></td>
                    <td>${order.developerName || '<span style="color: var(--gray);">Не назначен</span>'}</td>
                    <td>
                        <button style="padding: 8px 16px; background: var(--primary); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; margin-right: 8px;" 
                                onclick="sitecore.viewOrder(${order.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                        <button style="padding: 8px 16px; background: var(--gray-light); color: var(--dark); border: none; border-radius: var(--radius-sm); cursor: pointer;"
                                onclick="sitecore.openChat(${order.id})">
                            <i class="fas fa-comment"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    loadClientProfile() {
        if (!this.state.currentUser) return;
        
        document.getElementById('profileName').value = this.state.currentUser.name;
        document.getElementById('profileEmail').value = this.state.currentUser.email;
        document.getElementById('profilePhone').value = this.state.currentUser.phone;
        document.getElementById('profileTelegram').value = this.state.currentUser.telegram;
        document.getElementById('profileRegDate').value = new Date(this.state.currentUser.registrationDate).toLocaleDateString('ru-RU');
    }

    loadAvailableOrders() {
        const orders = this.getAvailableOrders();
        const container = document.getElementById('availableOrdersList');
        
        if (!container) return;
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div style="background: white; padding: 40px; border-radius: var(--radius); text-align: center; color: var(--gray);">
                    <i class="fas fa-clipboard-check" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <p>Нет доступных заказов</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = orders.map(order => {
            return `
                <div style="background: white; padding: 30px; border-radius: var(--radius); margin-bottom: 20px; border: 2px solid var(--gray-light);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                        <div>
                            <h3 style="font-size: 18px; font-weight: 700; color: var(--dark); margin-bottom: 5px;">${order.projectName}</h3>
                            <p style="color: var(--gray); font-size: 14px;">${order.clientName}</p>
                        </div>
                        <span class="status-badge status-new">Новый</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
                        <div>
                            <p style="font-size: 14px; color: var(--gray); margin-bottom: 5px;">Тип сайта</p>
                            <p style="font-weight: 600; color: var(--dark);">${order.projectType === 'static' ? 'Статический' : 'Динамический'}</p>
                        </div>
                        <div>
                            <p style="font-size: 14px; color: var(--gray); margin-bottom: 5px;">Бюджет</p>
                            <p style="font-weight: 600; color: var(--dark);">${this.formatCurrency(order.budget)}</p>
                        </div>
                        <div>
                            <p style="font-size: 14px; color: var(--gray); margin-bottom: 5px;">Срок</p>
                            <p style="font-weight: 600; color: var(--dark);">${order.deadline} дней</p>
                        </div>
                    </div>
                    
                    <p style="color: var(--dark-light); margin-bottom: 25px; line-height: 1.5;">${order.prompt.substring(0, 150)}...</p>
                    
                    <div style="display: flex; gap: 15px;">
                        <button style="flex: 1; padding: 15px; background: var(--primary); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600;"
                                onclick="sitecore.takeOrder(${order.id})">
                            <i class="fas fa-hand-paper"></i> Взять в работу
                        </button>
                        <button style="padding: 15px 25px; background: var(--gray-light); color: var(--dark); border: none; border-radius: var(--radius-sm); cursor: pointer;"
                                onclick="sitecore.viewOrder(${order.id})">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    loadDeveloperOrders() {
        if (!this.state.currentUser) return;
        
        const orders = this.getDeveloperOrders(this.state.currentUser.id);
        const container = document.getElementById('developerOrdersList');
        
        if (!container) return;
        
        if (orders.length === 0) {
            container.innerHTML = `
                <div style="background: white; padding: 40px; border-radius: var(--radius); text-align: center; color: var(--gray);">
                    <i class="fas fa-briefcase" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <p>У вас пока нет заказов</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = orders.map(order => {
            return `
                <div style="background: white; padding: 30px; border-radius: var(--radius); margin-bottom: 20px; border-left: 4px solid var(--primary);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 20px;">
                        <div>
                            <h3 style="font-size: 18px; font-weight: 700; color: var(--dark); margin-bottom: 5px;">${order.projectName}</h3>
                            <p style="color: var(--gray); font-size: 14px;">${order.clientName}</p>
                        </div>
                        <span class="status-badge status-${order.status}">${this.getStatusText(order.status)}</span>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 25px;">
                        <div>
                            <p style="font-size: 14px; color: var(--gray); margin-bottom: 5px;">Бюджет</p>
                            <p style="font-weight: 600; color: var(--dark);">${this.formatCurrency(order.budget)}</p>
                        </div>
                        <div>
                            <p style="font-size: 14px; color: var(--gray); margin-bottom: 5px;">Срок</p>
                            <p style="font-weight: 600; color: var(--dark);">${order.deadline} дней</p>
                        </div>
                        <div>
                            <p style="font-size: 14px; color: var(--gray); margin-bottom: 5px;">Сообщения</p>
                            <p style="font-weight: 600; color: var(--dark);">${order.messagesCount || 0}</p>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 15px;">
                        <button style="flex: 1; padding: 15px; background: var(--primary); color: white; border: none; border-radius: var(--radius-sm); cursor: pointer; font-weight: 600;"
                                onclick="sitecore.viewOrder(${order.id})">
                            <i class="fas fa-eye"></i> Просмотр
                        </button>
                        <button style="padding: 15px 25px; background: var(--gray-light); color: var(--dark); border: none; border-radius: var(--radius-sm); cursor: pointer;"
                                onclick="sitecore.openChat(${order.id})">
                            <i class="fas fa-comment"></i> Чат
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    loadClientsList() {
        const clients = this.getClients();
        const tbody = document.getElementById('clientsTableBody');
        
        if (!tbody) return;
        
        if (clients.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 40px; color: var(--gray);">
                        <i class="fas fa-users" style="font-size: 48px; margin-bottom: 20px; display: block;"></i>
                        <p>Клиенты не найдены</p>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = clients.map(client => {
            return `
                <tr>
                    <td>
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); color: white; display: flex; align-items: center; justify-content: center; font-weight: 600;">${client.avatar}</div>
                            ${client.name}
                        </div>
                    </td>
                    <td>${client.email}</td>
                    <td>${client.phone}</td>
                    <td>${client.telegram}</td>
                    <td><strong>${client.ordersCount || 0}</strong></td>
                    <td><span style="padding: 5px 10px; background: var(--success-light); color: var(--success); border-radius: 12px; font-size: 12px;">Активен</span></td>
                    <td>
                        <button style="padding: 8px 16px; background: var(--gray-light); color: var(--dark); border: none; border-radius: var(--radius-sm); cursor: pointer;"
                                onclick="sitecore.viewClient(${client.id})">
                            <i class="fas fa-user"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    // ============================================================================
    // ГЛОБАЛЬНЫЕ МЕТОДЫ ДЛЯ HTML
    // ============================================================================

    viewOrder(orderId) {
        const order = this.getOrders().find(o => o.id === orderId);
        if (!order) return;
        
        const content = `
            <div style="display: grid; gap: 25px;">
                <div>
                    <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 5px;">Название проекта</h4>
                    <p style="font-size: 18px; font-weight: 600; color: var(--dark);">${order.projectName}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    <div>
                        <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 5px;">Тип сайта</h4>
                        <p>${order.projectType === 'static' ? 'Статический' : 'Динамический'}</p>
                    </div>
                    <div>
                        <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 5px;">Бюджет</h4>
                        <p><strong>${this.formatCurrency(order.budget)}</strong></p>
                    </div>
                    <div>
                        <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 5px;">Срок</h4>
                        <p>${order.deadline} дней</p>
                    </div>
                    <div>
                        <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 5px;">Статус</h4>
                        <p><span class="status-badge status-${order.status}">${this.getStatusText(order.status)}</span></p>
                    </div>
                </div>
                
                <div>
                    <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 10px;">Клиент</h4>
                    <p>${order.clientName}</p>
                    <p style="color: var(--gray); font-size: 14px;">${order.clientEmail} • ${order.clientPhone}</p>
                </div>
                
                <div>
                    <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 10px;">Промт для разработки</h4>
                    <div style="background: var(--gray-lighter); padding: 20px; border-radius: var(--radius-sm); max-height: 200px; overflow-y: auto;">
                        ${order.prompt}
                    </div>
                    <p style="text-align: right; color: var(--gray); font-size: 14px; margin-top: 10px;">${order.prompt.length} символов</p>
                </div>
            </div>
        `;
        
        this.showModal(`Заказ: ${order.projectName}`, content);
    }

    takeOrder(orderId) {
        if (!this.state.currentUser || this.state.currentUser.role !== 'developer') {
            this.showNotification('Доступно только для разработчиков', 'error');
            return;
        }
        
        const result = this.assignOrder(orderId, this.state.currentUser.id);
        
        if (result.success) {
            this.showNotification('Заказ успешно взят в работу!', 'success');
            this.loadDeveloperDashboard();
            this.showSection('my-orders');
        } else {
            this.showNotification(result.message, 'error');
        }
    }

    openChat(orderId) {
        // Здесь будет реализация чата
        this.showNotification('Чат будет доступен в следующем обновлении', 'info');
    }

    viewClient(clientId) {
        const client = this.getClients().find(c => c.id === clientId);
        if (!client) return;
        
        const content = `
            <div style="display: grid; gap: 25px;">
                <div style="display: flex; align-items: center; gap: 20px;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%); color: white; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: 600;">${client.avatar}</div>
                    <div>
                        <h3 style="font-size: 24px; font-weight: 700; color: var(--dark); margin-bottom: 5px;">${client.name}</h3>
                        <p style="color: var(--gray);">Клиент SiteCore</p>
                    </div>
                </div>
                
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    <div>
                        <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 5px;">Email</h4>
                        <p>${client.email}</p>
                    </div>
                    <div>
                        <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 5px;">Телефон</h4>
                        <p>${client.phone}</p>
                    </div>
                    <div>
                        <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 5px;">Telegram</h4>
                        <p>${client.telegram}</p>
                    </div>
                    <div>
                        <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 5px;">Заказов</h4>
                        <p><strong>${client.ordersCount || 0}</strong></p>
                    </div>
                </div>
                
                <div>
                    <h4 style="color: var(--gray); font-size: 14px; margin-bottom: 10px;">Дата регистрации</h4>
                    <p>${new Date(client.registrationDate).toLocaleDateString('ru-RU')}</p>
                </div>
            </div>
        `;
        
        this.showModal(`Клиент: ${client.name}`, content);
    }

    updateDate() {
        const now = new Date();
        const options = { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        };
        
        // Можно добавить отображение даты в будущих версиях
    }

    // ============================================================================
    // ЗАГРУЗКА ЧАТОВ И СООБЩЕНИЙ
    // ============================================================================

    loadClientMessages() {
        // Реализация загрузки чатов для клиента
        const container = document.getElementById('clientChatList');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; color: var(--gray); padding: 40px;">
                <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p>Чат будет доступен в следующем обновлении</p>
            </div>
        `;
    }

    loadDeveloperMessages() {
        // Реализация загрузки чатов для разработчика
        const container = document.getElementById('developerChatList');
        if (!container) return;
        
        container.innerHTML = `
            <div style="text-align: center; color: var(--gray); padding: 40px;">
                <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 20px;"></i>
                <p>Чат будет доступен в следующем обновлении</p>
            </div>
        `;
    }
}

// Инициализация приложения
const sitecore = new SiteCorePlatform();

// Сделаем глобальные методы доступными из HTML
window.sitecore = sitecore;