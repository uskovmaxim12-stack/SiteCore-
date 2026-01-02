// ==================== СИСТЕМА ДАННЫХ ====================
const SiteCore = {
    // Инициализация
    init() {
        if (!localStorage.getItem('sc_initialized')) {
            this.setupDefaultData();
            localStorage.setItem('sc_initialized', '2026');
        }
        this.checkSession();
    },

    // Проверка сессии
    checkSession() {
        const user = this.getCurrentUser();
        if (user) {
            console.log(`Привет, ${user.name}!`);
            this.redirectToDashboard(user.role);
        }
    },

    // Перенаправление на дашборд
    redirectToDashboard(role) {
        if (role === 'client') {
            window.location.href = '#client-dashboard';
            this.renderClientDashboard();
        } else {
            window.location.href = '#executor-dashboard';
            this.renderExecutorDashboard();
        }
    },

    // Настройка данных по умолчанию
    setupDefaultData() {
        // Исполнители
        const executors = [
            {id: 1, name: "Александр", password: "789653", role: "executor", position: "Team Lead", avatar: "А", online: true, tasks: 0, completed: 0, rating: 4.8},
            {id: 2, name: "Максим", password: "140612", role: "executor", position: "Frontend Dev", avatar: "М", online: true, tasks: 0, completed: 0, rating: 4.6}
        ];
        
        // Клиенты (пустой массив)
        const clients = [];
        
        // Заказы (пустой массив)
        const orders = [];
        
        // Сообщения (пустой объект)
        const messages = {};
        
        localStorage.setItem('sc_executors', JSON.stringify(executors));
        localStorage.setItem('sc_clients', JSON.stringify(clients));
        localStorage.setItem('sc_orders', JSON.stringify(orders));
        localStorage.setItem('sc_messages', JSON.stringify(messages));
    },

    // ==================== АУТЕНТИФИКАЦИЯ ====================
    // Регистрация клиента
    registerClient(data) {
        const clients = this.getClients();
        
        // Проверки
        if (clients.some(c => c.email === data.email)) {
            return {success: false, message: "Email уже используется"};
        }
        if (data.password.length < 6) {
            return {success: false, message: "Пароль минимум 6 символов"};
        }
        if (!data.telegram.startsWith('@')) {
            return {success: false, message: "Telegram начинается с @"};
        }

        const newClient = {
            id: Date.now(),
            ...data,
            role: "client",
            avatar: data.name.charAt(0).toUpperCase(),
            regDate: new Date().toISOString().split('T')[0],
            orders: 0,
            spent: 0
        };

        clients.push(newClient);
        localStorage.setItem('sc_clients', JSON.stringify(clients));
        
        // Автовход
        this.loginClient(data.email, data.password);
        return {success: true};
    },

    // Вход клиента
    loginClient(email, password) {
        const clients = this.getClients();
        const client = clients.find(c => c.email === email && c.password === password);
        
        if (client) {
            const {password: _, ...safeClient} = client;
            localStorage.setItem('sc_currentUser', JSON.stringify(safeClient));
            this.redirectToDashboard('client');
            return true;
        }
        return false;
    },

    // Вход исполнителя
    loginExecutor(name, password) {
        const executors = this.getExecutors();
        const executor = executors.find(e => e.name === name && e.password === password);
        
        if (executor) {
            const {password: _, ...safeExecutor} = executor;
            localStorage.setItem('sc_currentUser', JSON.stringify(safeExecutor));
            this.redirectToDashboard('executor');
            return true;
        }
        return false;
    },

    // Выход
    logout() {
        localStorage.removeItem('sc_currentUser');
        window.location.hash = '#login';
        this.renderLoginPage();
    },

    // ==================== ДАННЫЕ ====================
    getCurrentUser() {
        return JSON.parse(localStorage.getItem('sc_currentUser') || 'null');
    },

    getExecutors() {
        return JSON.parse(localStorage.getItem('sc_executors') || '[]');
    },

    getClients() {
        return JSON.parse(localStorage.getItem('sc_clients') || '[]');
    },

    getOrders() {
        return JSON.parse(localStorage.getItem('sc_orders') || '[]');
    },

    getMessages() {
        return JSON.parse(localStorage.getItem('sc_messages') || '{}');
    },

    // Заказы клиента
    getClientOrders(clientId) {
        return this.getOrders().filter(o => o.clientId === clientId);
    },

    // Заказы исполнителя
    getExecutorOrders(executorId) {
        return this.getOrders().filter(o => o.executorId === executorId);
    },

    // Доступные заказы
    getAvailableOrders() {
        return this.getOrders().filter(o => !o.executorId && o.status === 'new');
    },

    // ==================== ЗАКАЗЫ ====================
    createOrder(orderData) {
        const user = this.getCurrentUser();
        if (!user || user.role !== 'client') return {success: false, message: "Только клиенты могут создавать заказы"};

        // Валидация промта
        if (orderData.prompt.length < 300 || orderData.prompt.length > 2500) {
            return {success: false, message: "Промт 300-2500 символов"};
        }

        // Валидация бюджета и срока
        if (orderData.budget < 500) {
            return {success: false, message: "Минимальный бюджет 500 руб"};
        }
        if (orderData.deadline < 3) {
            return {success: false, message: "Минимальный срок 3 дня"};
        }

        const newOrder = {
            id: Date.now(),
            clientId: user.id,
            clientName: user.name,
            clientEmail: user.email,
            clientPhone: user.phone,
            clientTelegram: user.telegram,
            ...orderData,
            status: 'new',
            createdDate: new Date().toISOString(),
            updatedDate: new Date().toISOString(),
            executorId: null,
            executorName: null,
            messagesCount: 0
        };

        const orders = this.getOrders();
        orders.push(newOrder);
        localStorage.setItem('sc_orders', JSON.stringify(orders));

        // Инициализация чата
        this.initOrderChat(newOrder.id);

        return {success: true, order: newOrder};
    },

    // Взять заказ
    takeOrder(orderId) {
        const user = this.getCurrentUser();
        if (!user || user.role !== 'executor') return false;

        const orders = this.getOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1 || orders[orderIndex].executorId) return false;

        orders[orderIndex] = {
            ...orders[orderIndex],
            executorId: user.id,
            executorName: user.name,
            status: 'in_progress',
            assignedDate: new Date().toISOString()
        };

        localStorage.setItem('sc_orders', JSON.stringify(orders));
        
        // Системное сообщение
        this.addSystemMessage(orderId, `Заказ взят исполнителем ${user.name}`);
        
        return true;
    },

    // Обновить статус заказа
    updateOrderStatus(orderId, status) {
        const orders = this.getOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        
        if (orderIndex === -1) return false;

        orders[orderIndex].status = status;
        orders[orderIndex].updatedDate = new Date().toISOString();
        
        localStorage.setItem('sc_orders', JSON.stringify(orders));
        
        // Системное сообщение
        const statusText = this.getStatusText(status);
        this.addSystemMessage(orderId, `Статус изменен на: ${statusText}`);
        
        return true;
    },

    // ==================== ЧАТ ====================
    initOrderChat(orderId) {
        const messages = this.getOrderMessages(orderId);
        this.addSystemMessage(orderId, 'Заказ создан. Ожидайте исполнителя.');
        return messages;
    },

    getOrderMessages(orderId) {
        const allMessages = this.getMessages();
        return allMessages[orderId] || [];
    },

    saveOrderMessages(orderId, messages) {
        const allMessages = this.getMessages();
        allMessages[orderId] = messages;
        localStorage.setItem('sc_messages', JSON.stringify(allMessages));
    },

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
        
        // Обновляем счетчик в заказе
        const orders = this.getOrders();
        const orderIndex = orders.findIndex(o => o.id === orderId);
        if (orderIndex !== -1) {
            orders[orderIndex].messagesCount = (orders[orderIndex].messagesCount || 0) + 1;
            localStorage.setItem('sc_orders', JSON.stringify(orders));
        }
        
        return newMessage;
    },

    addSystemMessage(orderId, text) {
        return this.addMessage(orderId, {
            senderId: 'system',
            senderName: 'Система',
            senderRole: 'system',
            text: text,
            type: 'system'
        });
    },

    // ==================== УТИЛИТЫ ====================
    formatCurrency(amount) {
        return new Intl.NumberFormat('ru-RU', {
            style: 'currency',
            currency: 'RUB',
            minimumFractionDigits: 0
        }).format(amount);
    },

    getStatusText(status) {
        const statuses = {
            'new': 'Новый',
            'in_progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершен'
        };
        return statuses[status] || status;
    },

    calculateDeadline(days) {
        const date = new Date();
        date.setDate(date.getDate() + days);
        return date;
    },

    getDaysLeft(order) {
        const deadline = this.calculateDeadline(order.deadline);
        const today = new Date();
        const daysLeft = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24));
        return daysLeft > 0 ? daysLeft : 0;
    },

    // ==================== ОТОБРАЖЕНИЕ ====================
    renderLoginPage() {
        document.body.innerHTML = `
            <div class="login-container">
                <div class="glass-card">
                    <div class="logo-section">
                        <div class="year-badge">2026</div>
                        <div class="logo-main">
                            <i class="fas fa-code-branch"></i>
                            <h1>SiteCore</h1>
                        </div>
                        <p class="tagline">Платформа для разработки сайтов</p>
                    </div>

                    <div class="auth-options">
                        <div class="auth-card" id="client-card">
                            <div class="auth-icon"><i class="fas fa-user-tie"></i></div>
                            <div class="auth-title">Клиент</div>
                            <p class="auth-description">Создавайте и управляйте заказами на разработку сайтов</p>
                            <div class="arrow-icon"><i class="fas fa-arrow-right"></i></div>
                        </div>

                        <div class="auth-card" id="executor-card">
                            <div class="auth-icon"><i class="fas fa-code"></i></div>
                            <div class="auth-title">Исполнитель</div>
                            <p class="auth-description">Работайте над проектами и общайтесь с клиентами</p>
                            <div class="arrow-icon"><i class="fas fa-arrow-right"></i></div>
                        </div>
                    </div>

                    <div class="footer">© 2026 SiteCore Platform</div>
                </div>
            </div>

            <!-- Модальные окна -->
            <div class="modal" id="client-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Вход для клиента</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div id="client-error" class="error-message"></div>
                    <form id="client-login-form">
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="login-email" class="form-input" placeholder="Ваш email" required>
                        </div>
                        <div class="form-group">
                            <label>Пароль</label>
                            <div class="input-with-icon">
                                <input type="password" id="login-password" class="form-input" placeholder="Пароль" required>
                                <button type="button" class="password-toggle"><i class="fas fa-eye"></i></button>
                            </div>
                        </div>
                        <button type="submit" class="btn-submit"><i class="fas fa-sign-in-alt"></i> Войти</button>
                    </form>
                    <div class="switch-auth">Нет аккаунта? <a href="#" id="to-register">Зарегистрироваться</a></div>
                </div>
            </div>

            <div class="modal" id="register-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Регистрация клиента</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div id="register-error" class="error-message"></div>
                    <form id="register-form">
                        <div class="form-group">
                            <label>Полное имя</label>
                            <input type="text" id="reg-name" class="form-input" placeholder="Иван Иванов" required>
                        </div>
                        <div class="form-group">
                            <label>Email</label>
                            <input type="email" id="reg-email" class="form-input" placeholder="example@mail.ru" required>
                        </div>
                        <div class="form-group">
                            <label>Телефон</label>
                            <input type="tel" id="reg-phone" class="form-input" placeholder="+7 (999) 123-45-67" required>
                        </div>
                        <div class="form-group">
                            <label>Telegram</label>
                            <input type="text" id="reg-telegram" class="form-input" placeholder="@username" required>
                        </div>
                        <div class="form-group">
                            <label>Пароль</label>
                            <div class="input-with-icon">
                                <input type="password" id="reg-password" class="form-input" placeholder="Минимум 6 символов" required>
                                <button type="button" class="password-toggle"><i class="fas fa-eye"></i></button>
                            </div>
                        </div>
                        <button type="submit" class="btn-submit"><i class="fas fa-user-plus"></i> Зарегистрироваться</button>
                    </form>
                    <div class="switch-auth">Уже есть аккаунт? <a href="#" id="to-login">Войти</a></div>
                </div>
            </div>

            <div class="modal" id="executor-modal">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Вход для исполнителя</h2>
                        <button class="modal-close">&times;</button>
                    </div>
                    <div id="executor-error" class="error-message"></div>
                    <form id="executor-form">
                        <div class="form-group">
                            <label>Исполнитель</label>
                            <div class="executor-option" data-name="Александр" data-pass="789653">
                                <div class="executor-avatar">А</div>
                                <div class="executor-info">
                                    <div class="executor-name">Александр</div>
                                    <div class="executor-role">Team Lead</div>
                                </div>
                            </div>
                            <div class="executor-option" data-name="Максим" data-pass="140612">
                                <div class="executor-avatar">М</div>
                                <div class="executor-info">
                                    <div class="executor-name">Максим</div>
                                    <div class="executor-role">Frontend Dev</div>
                                </div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Пароль</label>
                            <div class="input-with-icon">
                                <input type="password" id="executor-password" class="form-input" placeholder="Пароль" required>
                                <button type="button" class="password-toggle"><i class="fas fa-eye"></i></button>
                            </div>
                        </div>
                        <button type="submit" class="btn-submit"><i class="fas fa-sign-in-alt"></i> Войти</button>
                    </form>
                </div>
            </div>
        `;

        this.bindLoginEvents();
    },

    renderClientDashboard() {
        const user = this.getCurrentUser();
        if (!user || user.role !== 'client') return this.renderLoginPage();

        const orders = this.getClientOrders(user.id);
        const activeOrders = orders.filter(o => ['new', 'in_progress', 'review'].includes(o.status)).length;
        const completedOrders = orders.filter(o => o.status === 'completed').length;
        const totalSpent = orders.filter(o => o.status === 'completed').reduce((sum, o) => sum + (o.budget || 0), 0);

        document.body.innerHTML = `
            <div class="dashboard client-dashboard">
                <!-- Боковая панель -->
                <nav class="sidebar">
                    <div class="logo">SiteCore</div>
                    <div class="user-info">
                        <div class="avatar">${user.avatar}</div>
                        <div>
                            <div class="user-name">${user.name}</div>
                            <div class="user-role">Клиент</div>
                        </div>
                    </div>
                    <div class="nav-menu">
                        <a href="#client-dashboard" class="nav-item active"><i class="fas fa-home"></i> Главная</a>
                        <a href="#client-orders" class="nav-item"><i class="fas fa-list"></i> Мои заказы <span class="badge">${orders.length}</span></a>
                        <a href="#new-order" class="nav-item"><i class="fas fa-plus"></i> Новый заказ</a>
                        <a href="#client-messages" class="nav-item"><i class="fas fa-comments"></i> Сообщения <span class="badge" id="msg-count">0</span></a>
                        <a href="#client-profile" class="nav-item"><i class="fas fa-user"></i> Профиль</a>
                    </div>
                    <button class="logout-btn" id="logout"><i class="fas fa-sign-out-alt"></i> Выйти</button>
                </nav>

                <!-- Основной контент -->
                <main class="main-content">
                    <div id="client-content">
                        <!-- Содержимое загружается динамически -->
                    </div>
                </main>
            </div>
        `;

        this.loadClientSection('dashboard');
        this.bindClientEvents();
    },

    renderExecutorDashboard() {
        const user = this.getCurrentUser();
        if (!user || user.role !== 'executor') return this.renderLoginPage();

        const myOrders = this.getExecutorOrders(user.id);
        const availableOrders = this.getAvailableOrders();

        document.body.innerHTML = `
            <div class="dashboard executor-dashboard">
                <!-- Боковая панель -->
                <nav class="sidebar">
                    <div class="logo">SiteCore</div>
                    <div class="user-info">
                        <div class="avatar">${user.avatar}</div>
                        <div>
                            <div class="user-name">${user.name}</div>
                            <div class="user-role">${user.position}</div>
                        </div>
                    </div>
                    <div class="nav-menu">
                        <a href="#executor-dashboard" class="nav-item active"><i class="fas fa-home"></i> Панель</a>
                        <a href="#all-orders" class="nav-item"><i class="fas fa-list"></i> Все заказы <span class="badge">${availableOrders.length}</span></a>
                        <a href="#my-orders" class="nav-item"><i class="fas fa-briefcase"></i> Мои заказы <span class="badge">${myOrders.length}</span></a>
                        <a href="#executor-messages" class="nav-item"><i class="fas fa-comments"></i> Сообщения <span class="badge" id="exec-msg-count">0</span></a>
                        <a href="#executor-profile" class="nav-item"><i class="fas fa-user"></i> Профиль</a>
                    </div>
                    <button class="logout-btn" id="logout"><i class="fas fa-sign-out-alt"></i> Выйти</button>
                </nav>

                <!-- Основной контент -->
                <main class="main-content">
                    <div id="executor-content">
                        <!-- Содержимое загружается динамически -->
                    </div>
                </main>
            </div>
        `;

        this.loadExecutorSection('dashboard');
        this.bindExecutorEvents();
    },

    // ==================== КЛИЕНТСКИЕ СЕКЦИИ ====================
    loadClientSection(section) {
        const user = this.getCurrentUser();
        const content = document.getElementById('client-content');
        
        switch(section) {
            case 'dashboard':
                const orders = this.getClientOrders(user.id).slice(0, 3);
                content.innerHTML = `
                    <div class="welcome-card">
                        <h1>Добро пожаловать, ${user.name}!</h1>
                        <p>SiteCore помогает превратить ваши идеи в современные сайты</p>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-clock"></i></div>
                            <div class="stat-info">
                                <h4>Активные</h4>
                                <p class="stat-value">${orders.filter(o => ['new', 'in_progress', 'review'].includes(o.status)).length}</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-check"></i></div>
                            <div class="stat-info">
                                <h4>Завершены</h4>
                                <p class="stat-value">${orders.filter(o => o.status === 'completed').length}</p>
                            </div>
                        </div>
                    </div>
                    <div class="recent-orders">
                        <h3>Последние заказы</h3>
                        ${orders.length ? orders.map(order => `
                            <div class="order-card" data-id="${order.id}">
                                <div class="order-header">
                                    <h4>${order.projectName}</h4>
                                    <span class="status status-${order.status}">${this.getStatusText(order.status)}</span>
                                </div>
                                <div class="order-details">
                                    <span>${order.projectType === 'static' ? 'Статический' : 'Динамический'}</span>
                                    <span>${this.formatCurrency(order.budget)}</span>
                                    <span>${order.deadline} дней</span>
                                </div>
                            </div>
                        `).join('') : '<p class="empty">Нет заказов</p>'}
                    </div>
                `;
                break;

            case 'orders':
                const allOrders = this.getClientOrders(user.id);
                content.innerHTML = `
                    <div class="section-header">
                        <h2>Мои заказы</h2>
                        <div class="filter-tabs">
                            <button class="filter-btn active" data-filter="all">Все</button>
                            <button class="filter-btn" data-filter="new">Новые</button>
                            <button class="filter-btn" data-filter="in_progress">В работе</button>
                            <button class="filter-btn" data-filter="completed">Завершены</button>
                        </div>
                    </div>
                    <div class="orders-container">
                        ${allOrders.length ? allOrders.map(order => `
                            <div class="order-row" data-id="${order.id}">
                                <div class="order-name">${order.projectName}</div>
                                <div class="order-type">${order.projectType === 'static' ? 'Статический' : 'Динамический'}</div>
                                <div class="order-budget">${this.formatCurrency(order.budget)}</div>
                                <div class="order-deadline">${order.deadline} дней</div>
                                <div class="order-status status-${order.status}">${this.getStatusText(order.status)}</div>
                                <div class="order-assignee">${order.executorName || 'Не назначен'}</div>
                                <div class="order-actions">
                                    <button class="btn-small view" data-id="${order.id}">Просмотр</button>
                                    <button class="btn-small chat" data-id="${order.id}">Чат</button>
                                </div>
                            </div>
                        `).join('') : '<div class="empty-state"><i class="fas fa-clipboard-list"></i><p>Нет заказов</p></div>'}
                    </div>
                `;
                break;

            case 'new-order':
                content.innerHTML = `
                    <div class="section-header">
                        <h2>Новый заказ</h2>
                    </div>
                    <form id="create-order-form" class="order-form">
                        <div class="form-group">
                            <label>Название проекта *</label>
                            <input type="text" id="project-name" required placeholder="Например: Сайт для кофейни">
                        </div>
                        <div class="form-group">
                            <label>Тип сайта *</label>
                            <select id="project-type" required>
                                <option value="">Выберите тип</option>
                                <option value="static">Статический сайт</option>
                                <option value="dynamic">Динамический сайт</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Бюджет (руб.) *</label>
                                <input type="number" id="project-budget" required min="500" step="100" placeholder="500">
                                <div class="budget-hint">Минимум 500 руб</div>
                            </div>
                            <div class="form-group">
                                <label>Срок (дней) *</label>
                                <input type="number" id="project-deadline" required min="3" max="365" placeholder="3">
                                <div class="budget-hint">Минимум 3 дня</div>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Промт для разработки *</label>
                            <textarea id="project-prompt" required minlength="300" maxlength="2500" placeholder="Опишите детально ваш проект (300-2500 символов)"></textarea>
                            <div class="prompt-counter"><span id="char-count">0</span>/2500 символов</div>
                        </div>
                        <div class="form-actions">
                            <button type="button" class="btn-secondary" id="cancel-order">Отмена</button>
                            <button type="submit" class="btn-primary">Создать заказ</button>
                        </div>
                    </form>
                `;
                break;

            case 'messages':
                content.innerHTML = `<div class="messages-container"><h2>Сообщения</h2><p>Раздел в разработке</p></div>`;
                break;

            case 'profile':
                const clientOrders = this.getClientOrders(user.id);
                content.innerHTML = `
                    <div class="profile-container">
                        <h2>Мой профиль</h2>
                        <div class="profile-content">
                            <div class="profile-sidebar">
                                <div class="avatar-large">${user.avatar}</div>
                                <h3>${user.name}</h3>
                                <p class="profile-role">Клиент</p>
                            </div>
                            <div class="profile-details">
                                <div class="details-section">
                                    <h4>Контактная информация</h4>
                                    <div class="detail-row"><span>Email:</span><span>${user.email}</span></div>
                                    <div class="detail-row"><span>Телефон:</span><span>${user.phone}</span></div>
                                    <div class="detail-row"><span>Telegram:</span><span>${user.telegram}</span></div>
                                    <div class="detail-row"><span>Дата регистрации:</span><span>${user.regDate}</span></div>
                                </div>
                                <div class="details-section">
                                    <h4>Статистика</h4>
                                    <div class="detail-row"><span>Всего заказов:</span><span>${clientOrders.length}</span></div>
                                    <div class="detail-row"><span>Активные:</span><span>${clientOrders.filter(o => ['new', 'in_progress', 'review'].includes(o.status)).length}</span></div>
                                    <div class="detail-row"><span>Завершены:</span><span>${clientOrders.filter(o => o.status === 'completed').length}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                break;
        }

        this.bindClientSectionEvents(section);
    },

    // ==================== ИСПОЛНИТЕЛЬСКИЕ СЕКЦИИ ====================
    loadExecutorSection(section) {
        const user = this.getCurrentUser();
        const content = document.getElementById('executor-content');
        
        switch(section) {
            case 'dashboard':
                const myOrders = this.getExecutorOrders(user.id);
                const available = this.getAvailableOrders();
                content.innerHTML = `
                    <div class="welcome-card">
                        <h1>Привет, ${user.name}!</h1>
                        <p>Сегодня в работе: ${myOrders.filter(o => o.status === 'in_progress').length} заказов</p>
                    </div>
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-tasks"></i></div>
                            <div class="stat-info">
                                <h4>Мои заказы</h4>
                                <p class="stat-value">${myOrders.length}</p>
                            </div>
                        </div>
                        <div class="stat-card">
                            <div class="stat-icon"><i class="fas fa-clock"></i></div>
                            <div class="stat-info">
                                <h4>Доступно</h4>
                                <p class="stat-value">${available.length}</p>
                            </div>
                        </div>
                    </div>
                    <div class="priority-orders">
                        <h3>Приоритетные задачи</h3>
                        ${myOrders.filter(o => o.status === 'in_progress').slice(0, 3).map(order => `
                            <div class="priority-item" data-id="${order.id}">
                                <h4>${order.projectName}</h4>
                                <p>${order.clientName}</p>
                                <div class="priority-meta">
                                    <span>${this.formatCurrency(order.budget)}</span>
                                    <span>${this.getDaysLeft(order)} дн.</span>
                                </div>
                            </div>
                        `).join('') || '<p class="empty">Нет активных задач</p>'}
                    </div>
                `;
                break;

            case 'all-orders':
                const orders = this.getAvailableOrders();
                content.innerHTML = `
                    <div class="section-header">
                        <h2>Доступные заказы</h2>
                    </div>
                    <div class="orders-grid">
                        ${orders.length ? orders.map(order => `
                            <div class="order-card" data-id="${order.id}">
                                <div class="order-header">
                                    <h4>${order.projectName}</h4>
                                    <span class="status status-new">Новый</span>
                                </div>
                                <div class="order-client">${order.clientName}</div>
                                <div class="order-budget">${this.formatCurrency(order.budget)}</div>
                                <div class="order-details">
                                    <span>${order.projectType === 'static' ? 'Статический' : 'Динамический'}</span>
                                    <span>${order.deadline} дней</span>
                                </div>
                                <div class="order-preview">${order.prompt.substring(0, 80)}...</div>
                                <div class="order-actions">
                                    <button class="btn-take" data-id="${order.id}">Взять в работу</button>
                                    <button class="btn-view" data-id="${order.id}">Подробнее</button>
                                </div>
                            </div>
                        `).join('') : '<div class="empty-state"><i class="fas fa-clipboard-check"></i><p>Нет доступных заказов</p></div>'}
                    </div>
                `;
                break;

            case 'my-orders':
                const executorOrders = this.getExecutorOrders(user.id);
                content.innerHTML = `
                    <div class="section-header">
                        <h2>Мои заказы</h2>
                    </div>
                    <div class="kanban-board">
                        <div class="kanban-column">
                            <div class="column-header"><h4>В работе</h4><span class="column-count">${executorOrders.filter(o => o.status === 'in_progress').length}</span></div>
                            <div class="column-body" id="progress-column">
                                ${executorOrders.filter(o => o.status === 'in_progress').map(order => `
                                    <div class="kanban-card" data-id="${order.id}" draggable="true">
                                        <h5>${order.projectName}</h5>
                                        <p>${order.clientName}</p>
                                        <div class="kanban-meta">
                                            <span>${this.formatCurrency(order.budget)}</span>
                                            <span>${this.getDaysLeft(order)} дн.</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="kanban-column">
                            <div class="column-header"><h4>На проверке</h4><span class="column-count">${executorOrders.filter(o => o.status === 'review').length}</span></div>
                            <div class="column-body" id="review-column">
                                ${executorOrders.filter(o => o.status === 'review').map(order => `
                                    <div class="kanban-card" data-id="${order.id}" draggable="true">
                                        <h5>${order.projectName}</h5>
                                        <p>${order.clientName}</p>
                                        <div class="kanban-meta">
                                            <span>${this.formatCurrency(order.budget)}</span>
                                            <span>${this.getDaysLeft(order)} дн.</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        <div class="kanban-column">
                            <div class="column-header"><h4>Завершены</h4><span class="column-count">${executorOrders.filter(o => o.status === 'completed').length}</span></div>
                            <div class="column-body" id="completed-column">
                                ${executorOrders.filter(o => o.status === 'completed').map(order => `
                                    <div class="kanban-card" data-id="${order.id}">
                                        <h5>${order.projectName}</h5>
                                        <p>${order.clientName}</p>
                                        <div class="kanban-meta">
                                            <span>${this.formatCurrency(order.budget)}</span>
                                            <span>Выполнен</span>
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                `;
                break;
        }

        this.bindExecutorSectionEvents(section);
    },

    // ==================== ОБРАБОТЧИКИ СОБЫТИЙ ====================
    bindLoginEvents() {
        // Карточки
        document.getElementById('client-card').addEventListener('click', () => this.showModal('client-modal'));
        document.getElementById('executor-card').addEventListener('click', () => this.showModal('executor-modal'));

        // Закрытие модалок
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.closest('.modal').classList.remove('active');
            });
        });

        // Переключение форм
        document.getElementById('to-register')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('client-modal');
            this.showModal('register-modal');
        });

        document.getElementById('to-login')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.hideModal('register-modal');
            this.showModal('client-modal');
        });

        // Показать/скрыть пароль
        document.querySelectorAll('.password-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const input = this.parentElement.querySelector('input');
                const icon = this.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });

        // Выбор исполнителя
        document.querySelectorAll('.executor-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.executor-option').forEach(o => o.classList.remove('selected'));
                this.classList.add('selected');
            });
        });

        // Форма входа клиента
        document.getElementById('client-login-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            
            if (this.loginClient(email, password)) {
                this.hideModal('client-modal');
            } else {
                this.showError('client-error', 'Неверные данные');
            }
        });

        // Форма регистрации
        document.getElementById('register-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const data = {
                name: document.getElementById('reg-name').value,
                email: document.getElementById('reg-email').value,
                phone: document.getElementById('reg-phone').value,
                telegram: document.getElementById('reg-telegram').value,
                password: document.getElementById('reg-password').value
            };
            
            const result = this.registerClient(data);
            if (result.success) {
                this.hideModal('register-modal');
            } else {
                this.showError('register-error', result.message);
            }
        });

        // Форма входа исполнителя
        document.getElementById('executor-form')?.addEventListener('submit', (e) => {
            e.preventDefault();
            const selected = document.querySelector('.executor-option.selected');
            if (!selected) {
                this.showError('executor-error', 'Выберите исполнителя');
                return;
            }
            
            const name = selected.getAttribute('data-name');
            const password = document.getElementById('executor-password').value;
            
            if (this.loginExecutor(name, password)) {
                this.hideModal('executor-modal');
            } else {
                this.showError('executor-error', 'Неверный пароль');
            }
        });
    },

    bindClientEvents() {
        // Навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const hash = item.getAttribute('href').substring(1);
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.loadClientSection(hash);
                window.location.hash = `#${hash}`;
            });
        });

        // Выход
        document.getElementById('logout').addEventListener('click', () => this.logout());

        // Хеш навигация
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1) || 'dashboard';
            if (hash.startsWith('client-')) {
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                document.querySelector(`[href="#${hash}"]`)?.classList.add('active');
                this.loadClientSection(hash);
            }
        });
    },

    bindExecutorEvents() {
        // Навигация
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const hash = item.getAttribute('href').substring(1);
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.loadExecutorSection(hash);
                window.location.hash = `#${hash}`;
            });
        });

        // Выход
        document.getElementById('logout').addEventListener('click', () => this.logout());

        // Хеш навигация
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1) || 'dashboard';
            if (hash.startsWith('executor-') || ['all-orders', 'my-orders'].includes(hash)) {
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                document.querySelector(`[href="#${hash}"]`)?.classList.add('active');
                this.loadExecutorSection(hash);
            }
        });
    },

    bindClientSectionEvents(section) {
        switch(section) {
            case 'new-order':
                // Счетчик символов
                const promptInput = document.getElementById('project-prompt');
                const charCount = document.getElementById('char-count');
                if (promptInput) {
                    promptInput.addEventListener('input', () => {
                        charCount.textContent = promptInput.value.length;
                        if (promptInput.value.length < 300 || promptInput.value.length > 2500) {
                            promptInput.style.borderColor = '#ef4444';
                        } else {
                            promptInput.style.borderColor = '#10b981';
                        }
                    });
                }

                // Отмена
                document.getElementById('cancel-order')?.addEventListener('click', () => {
                    window.location.hash = '#client-orders';
                });

                // Создание заказа
                document.getElementById('create-order-form')?.addEventListener('submit', (e) => {
                    e.preventDefault();
                    
                    const orderData = {
                        projectName: document.getElementById('project-name').value,
                        projectType: document.getElementById('project-type').value,
                        budget: parseInt(document.getElementById('project-budget').value),
                        deadline: parseInt(document.getElementById('project-deadline').value),
                        prompt: document.getElementById('project-prompt').value
                    };

                    const result = this.createOrder(orderData);
                    if (result.success) {
                        alert('Заказ успешно создан!');
                        window.location.hash = '#client-orders';
                    } else {
                        alert(result.message);
                    }
                });
                break;

            case 'orders':
                // Фильтры
                document.querySelectorAll('.filter-btn').forEach(btn => {
                    btn.addEventListener('click', function() {
                        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                        this.classList.add('active');
                        // Фильтрация будет добавлена позже
                    });
                });

                // Просмотр заказа
                document.querySelectorAll('.btn-small.view').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const orderId = parseInt(btn.getAttribute('data-id'));
                        this.showOrderModal(orderId);
                    });
                });

                // Клик по строке
                document.querySelectorAll('.order-row').forEach(row => {
                    row.addEventListener('click', function() {
                        const orderId = parseInt(this.getAttribute('data-id'));
                        this.showOrderModal(orderId);
                    }.bind(this));
                });
                break;
        }
    },

    bindExecutorSectionEvents(section) {
        switch(section) {
            case 'all-orders':
                // Взять заказ
                document.querySelectorAll('.btn-take').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const orderId = parseInt(btn.getAttribute('data-id'));
                        if (this.takeOrder(orderId)) {
                            alert('Заказ взят в работу!');
                            this.loadExecutorSection('all-orders');
                        }
                    });
                });

                // Просмотр заказа
                document.querySelectorAll('.btn-view, .order-card').forEach(el => {
                    el.addEventListener('click', function(e) {
                        if (e.target.closest('.btn-take')) return;
                        const orderId = parseInt(el.getAttribute('data-id') || el.closest('[data-id]')?.getAttribute('data-id'));
                        if (orderId) this.showOrderModal(orderId);
                    }.bind(this));
                });
                break;

            case 'my-orders':
                // Drag & Drop для канбана
                this.setupKanbanDragDrop();
                break;
        }
    },

    // ==================== УТИЛИТЫ ОТОБРАЖЕНИЯ ====================
    showModal(modalId) {
        document.getElementById(modalId)?.classList.add('active');
    },

    hideModal(modalId) {
        document.getElementById(modalId)?.classList.remove('active');
    },

    showError(elementId, message) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.classList.add('show');
            setTimeout(() => el.classList.remove('show'), 3000);
        }
    },

    showOrderModal(orderId) {
        const order = this.getOrders().find(o => o.id === orderId);
        if (!order) return;

        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${order.projectName}</h3>
                    <button class="modal-close">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="order-details-grid">
                        <div class="order-info">
                            <h4>Информация</h4>
                            <div class="detail-row"><span>Клиент:</span><span>${order.clientName}</span></div>
                            <div class="detail-row"><span>Тип:</span><span>${order.projectType === 'static' ? 'Статический' : 'Динамический'}</span></div>
                            <div class="detail-row"><span>Бюджет:</span><span>${this.formatCurrency(order.budget)}</span></div>
                            <div class="detail-row"><span>Срок:</span><span>${order.deadline} дней</span></div>
                            <div class="detail-row"><span>Статус:</span><span class="status status-${order.status}">${this.getStatusText(order.status)}</span></div>
                        </div>
                        <div class="order-prompt">
                            <h4>Промт</h4>
                            <div class="prompt-content">${order.prompt}</div>
                            <div class="prompt-stats">${order.prompt.length} символов</div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        
        modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    },

    setupKanbanDragDrop() {
        const cards = document.querySelectorAll('.kanban-card');
        const columns = document.querySelectorAll('.kanban-column .column-body');

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', card.dataset.id);
                card.classList.add('dragging');
            });

            card.addEventListener('dragend', () => {
                card.classList.remove('dragging');
            });
        });

        columns.forEach(column => {
            column.addEventListener('dragover', (e) => {
                e.preventDefault();
                column.style.background = 'rgba(139, 92, 246, 0.1)';
            });

            column.addEventListener('dragleave', () => {
                column.style.background = '';
            });

            column.addEventListener('drop', (e) => {
                e.preventDefault();
                column.style.background = '';
                
                const orderId = e.dataTransfer.getData('text/plain');
                const card = document.querySelector(`[data-id="${orderId}"]`);
                const newStatus = column.parentElement.querySelector('h4').textContent;
                
                if (card && !column.contains(card)) {
                    column.appendChild(card);
                    
                    let status = 'in_progress';
                    if (newStatus.includes('проверке')) status = 'review';
                    if (newStatus.includes('Завершены')) status = 'completed';
                    
                    this.updateOrderStatus(parseInt(orderId), status);
                }
            });
        });
    }
};

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', () => {
    SiteCore.init();
    
    // Обработка хешей
    if (window.location.hash) {
        const hash = window.location.hash.substring(1);
        const user = SiteCore.getCurrentUser();
        
        if (user) {
            if (user.role === 'client' && hash.startsWith('client-')) {
                SiteCore.loadClientSection(hash);
            } else if (user.role === 'executor' && (hash.startsWith('executor-') || ['all-orders', 'my-orders'].includes(hash))) {
                SiteCore.loadExecutorSection(hash);
            }
        }
    } else {
        SiteCore.renderLoginPage();
    }
});
