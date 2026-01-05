// Исправленный script.js для developer.html (вставьте этот код вместо старого)

// Глобальные переменные
let currentUser = null;
let database = {
    users: { clients: [], developers: [] },
    orders: [],
    messages: []
};
let currentChatOrderId = null;
let currentOrderId = null;
let isInitialized = false;
let isLoading = false;

// Конфигурация базы данных
const DB_CONFIG = {
    API_URL: 'https://api.jsonbin.io/v3/b',
    BIN_ID: '66b3d9c5ad19ca34f8c48e0d',
    API_KEY: '$2b$10$LQYjMwTj2wXGJfX8b7K6DeoEJpJX5qYQY9t8rFqGtHvK1lM3nP4oS'
};

// Инициализация
async function init() {
    console.log('Инициализация панели разработчика...');
    
    if (isInitialized) {
        console.log('Уже инициализировано');
        return;
    }
    
    // Проверка авторизации - КРИТИЧНО ВАЖНОЕ ИСПРАВЛЕНИЕ
    const userData = sessionStorage.getItem('currentUser');
    console.log('Данные пользователя:', userData);
    
    if (!userData) {
        console.log('Нет данных пользователя, редирект на вход');
        window.location.href = 'index.html';
        return;
    }

    try {
        currentUser = JSON.parse(userData);
        console.log('Текущий пользователь:', currentUser);
        
        // Проверяем, что это разработчик
        if (currentUser.type !== 'developer') {
            console.log('Не разработчик, редирект');
            window.location.href = 'client.html';
            return;
        }
        
        // Показываем базовую информацию сразу
        updateUserInfo();
        
        // Загружаем кэшированные данные если есть
        const cachedData = localStorage.getItem('sitecore_database');
        if (cachedData) {
            try {
                database = JSON.parse(cachedData);
                console.log('Используем кэшированные данные');
            } catch (e) {
                console.error('Ошибка парсинга кэша:', e);
            }
        }
        
        // Загружаем свежие данные
        await loadDatabase();
        
        // Инициализируем интерфейс
        loadDashboardData();
        loadOrders();
        loadClients();
        
        isInitialized = true;
        console.log('Панель разработчика успешно инициализирована');
        
    } catch (error) {
        console.error('Критическая ошибка инициализации:', error);
        showNotification('Ошибка загрузки. Попробуйте войти снова.', 'error');
        setTimeout(() => {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        }, 3000);
    }
}

// Загрузка базы данных
async function loadDatabase() {
    if (isLoading) return;
    isLoading = true;
    
    try {
        console.log('Загрузка данных из облака...');
        const response = await fetch(`${DB_CONFIG.API_URL}/${DB_CONFIG.BIN_ID}/latest`, {
            headers: { 'X-Master-Key': DB_CONFIG.API_KEY }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ошибка: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Данные получены');
        
        if (data && data.record) {
            database = data.record;
            // Сохраняем в кэш
            localStorage.setItem('sitecore_database', JSON.stringify(database));
            console.log('База данных обновлена');
        }
        
        return true;
    } catch (error) {
        console.warn('Ошибка загрузки из облака:', error);
        
        // Используем локальные данные если есть
        const localData = localStorage.getItem('sitecore_database');
        if (localData) {
            try {
                database = JSON.parse(localData);
                console.log('Используем локальную копию базы');
                return true;
            } catch (parseError) {
                console.error('Ошибка парсинга локальных данных:', parseError);
            }
        }
        
        // Если нет данных вообще, создаем пустую структуру
        database = {
            users: { clients: [], developers: [] },
            orders: [],
            messages: []
        };
        
        console.log('Создана новая база данных');
        return false;
    } finally {
        isLoading = false;
    }
}

// Сохранение базы данных
async function saveDatabase() {
    try {
        const response = await fetch(`${DB_CONFIG.API_URL}/${DB_CONFIG.BIN_ID}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'X-Master-Key': DB_CONFIG.API_KEY
            },
            body: JSON.stringify(database)
        });
        
        if (response.ok) {
            // Сохраняем локальную копию
            localStorage.setItem('sitecore_database', JSON.stringify(database));
            console.log('Данные сохранены');
            return true;
        } else {
            throw new Error(`Ошибка сохранения: ${response.status}`);
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
        // Все равно сохраняем локально
        localStorage.setItem('sitecore_database', JSON.stringify(database));
        return false;
    }
}

// Обновление информации пользователя
function updateUserInfo() {
    if (!currentUser) return;
    
    document.getElementById('current-user-info').innerHTML = `
        <div class="user-avatar">${currentUser.avatar || 'Р'}</div>
        <div class="user-name">${currentUser.name || 'Разработчик'}</div>
    `;

    document.getElementById('developer-name').textContent = currentUser.name || 'Разработчик';
    
    // Заголовок приветствия
    const now = new Date();
    const hours = now.getHours();
    let greeting;
    
    if (hours < 12) greeting = 'Доброе утро';
    else if (hours < 18) greeting = 'Добрый день';
    else greeting = 'Добрый вечер';
    
    document.getElementById('welcome-title').textContent = `${greeting}, ${currentUser.name || 'Разработчик'}!`;
}

// Загрузка данных дашборда
function loadDashboardData() {
    if (!database || !database.orders) return;
    
    const orders = database.orders;
    const myOrders = orders.filter(order => order.assignedTo === currentUser.id);
    const availableOrders = orders.filter(order => !order.assignedTo && order.status === 'new');
    
    document.getElementById('stats-badge').innerHTML = `
        <i class="fas fa-chart-line"></i>
        <span>Активных заказов: ${myOrders.length}</span>
    `;
    
    document.getElementById('quick-stats').innerHTML = `
        <div class="quick-stat">
            <div class="quick-stat-value">${availableOrders.length}</div>
            <div class="quick-stat-label">Доступных заказов</div>
        </div>
        <div class="quick-stat">
            <div class="quick-stat-value">${myOrders.length}</div>
            <div class="quick-stat-label">Мои заказы</div>
        </div>
        <div class="quick-stat">
            <div class="quick-stat-value">${myOrders.filter(o => o.status === 'completed').length}</div>
            <div class="quick-stat-label">Завершено</div>
        </div>
        <div class="quick-stat">
            <div class="quick-stat-value">${database.users.clients?.length || 0}</div>
            <div class="quick-stat-label">Клиентов</div>
        </div>
    `;
}

// Показать раздел
function showSection(section) {
    // Обновляем активные пункты меню
    document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
    event.target.classList.add('active');
    
    // Показываем выбранный раздел
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(section + '-section').classList.add('active');
}

// Загрузка заказов
function loadOrders() {
    if (!database || !database.orders) {
        console.log('Нет данных о заказах');
        return;
    }
    
    const filter = document.getElementById('orders-filter').value;
    let orders = database.orders;
    
    // Применяем фильтр
    if (filter !== 'all') {
        orders = orders.filter(order => order.status === filter);
    }
    
    // Сортируем по дате (новые сначала)
    orders.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    
    // Обновляем статистику
    const allOrders = database.orders;
    const newOrders = allOrders.filter(o => o.status === 'new').length;
    const myOrders = allOrders.filter(o => o.assignedTo === currentUser.id);
    
    document.getElementById('orders-badge').textContent = newOrders;
    
    // Отображаем заказы
    const container = document.getElementById('orders-grid');
    if (!container) return;
    
    if (orders.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--gray); grid-column: 1/-1;">
                <i class="fas fa-clipboard-list" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                <h3 style="margin-bottom: 10px;">Заказы не найдены</h3>
                <p>Измените параметры фильтра или загляните позже</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = orders.map(order => {
        const client = database.users.clients?.find(c => c.id === order.clientId) || order;
        const statusTexts = {
            'new': 'Новый',
            'in-progress': 'В работе',
            'review': 'На проверке',
            'completed': 'Завершен',
            'cancelled': 'Отменен'
        };
        
        const statusColors = {
            'new': 'status-new',
            'in-progress': 'status-progress',
            'review': 'status-review',
            'completed': 'status-completed',
            'cancelled': 'status-cancelled'
        };
        
        // Проверяем, назначен ли заказ текущему разработчику
        const isAssignedToMe = order.assignedTo === currentUser.id;
        const isAvailable = !order.assignedTo && order.status === 'new';
        
        return `
            <div class="order-card" onclick="openOrderModal('${order.id}')">
                <div class="order-card-header">
                    <div>
                        <h3>${order.projectName || 'Без названия'}</h3>
                        <div class="order-client">${client.name || order.clientName || 'Клиент не указан'}</div>
                    </div>
                    <div class="order-status ${statusColors[order.status] || 'status-new'}">
                        ${statusTexts[order.status] || 'Новый'}
                    </div>
                </div>
                
                <div class="order-card-body">
                    <div class="order-details">
                        <div class="order-detail">
                            <div class="order-detail-label">Тип</div>
                            <div class="order-detail-value">${order.projectType === 'static' ? 'Статический' : 'Динамический'}</div>
                        </div>
                        <div class="order-detail">
                            <div class="order-detail-label">Бюджет</div>
                            <div class="order-detail-value">${formatCurrency(order.budget || 0)}</div>
                        </div>
                        <div class="order-detail">
                            <div class="order-detail-label">Срок</div>
                            <div class="order-detail-value">${order.deadline || 0} дней</div>
                        </div>
                        <div class="order-detail">
                            <div class="order-detail-label">Статус</div>
                            <div class="order-detail-value">
                                ${isAssignedToMe ? 'Ваш заказ' : isAvailable ? 'Доступен' : 'Назначен'}
                            </div>
                        </div>
                    </div>
                    
                    <div class="order-prompt-preview">
                        ${(order.prompt || 'Нет описания').substring(0, 150)}...
                    </div>
                </div>
                
                <div class="order-actions">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); openOrderModal('${order.id}')">
                        <i class="fas fa-edit"></i> Управлять
                    </button>
                    ${isAvailable ? `
                        <button class="btn btn-success" onclick="event.stopPropagation(); takeOrder('${order.id}')">
                            <i class="fas fa-hand-paper"></i> Взять
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Фильтрация заказов
function filterOrders() {
    loadOrders();
}

// Обновление заказов
async function refreshOrders() {
    await loadDatabase();
    loadOrders();
    showNotification('Заказы обновлены', 'success');
}

// Открыть модальное окно заказа
function openOrderModal(orderId) {
    currentOrderId = orderId;
    const order = database.orders.find(o => o.id === orderId);
    if (!order) {
        showNotification('Заказ не найден', 'error');
        return;
    }
    
    const client = database.users.clients?.find(c => c.id === order.clientId) || order;
    
    // Заполняем информацию
    document.getElementById('order-modal-title').textContent = order.projectName || 'Без названия';
    document.getElementById('modal-client-name').textContent = client.name || order.clientName || 'Клиент не указан';
    document.getElementById('modal-client-email').textContent = client.email || order.clientEmail || 'Не указан';
    document.getElementById('modal-client-phone').textContent = client.phone || order.clientPhone || 'Не указан';
    document.getElementById('modal-client-telegram').textContent = client.telegram ? '@' + client.telegram : (order.clientTelegram || 'Не указан');
    document.getElementById('modal-project-type').textContent = order.projectType === 'static' ? 'Статический сайт' : 'Динамический сайт';
    document.getElementById('modal-project-budget').textContent = formatCurrency(order.budget || 0);
    document.getElementById('modal-project-deadline').textContent = `${order.deadline || 0} дней`;
    document.getElementById('modal-project-status').textContent = getStatusText(order.status);
    document.getElementById('modal-project-prompt').textContent = order.prompt || 'Нет описания';
    
    // Устанавливаем текущий статус
    document.getElementById('status-select').value = order.status;
    
    // Показываем/скрываем кнопки
    const takeOrderBtn = document.getElementById('take-order-btn');
    const completeOrderBtn = document.getElementById('complete-order-btn');
    
    if (order.assignedTo && order.assignedTo !== currentUser.id) {
        takeOrderBtn.style.display = 'none';
        completeOrderBtn.style.display = 'none';
    } else if (order.assignedTo === currentUser.id) {
        takeOrderBtn.style.display = 'none';
        if (order.status !== 'completed' && order.status !== 'cancelled') {
            completeOrderBtn.style.display = 'block';
        } else {
            completeOrderBtn.style.display = 'none';
        }
    } else {
        takeOrderBtn.style.display = 'block';
        completeOrderBtn.style.display = 'none';
    }
    
    // Показываем модальное окно
    document.getElementById('order-modal').classList.add('active');
}

// Закрыть модальное окно заказа
function closeOrderModal() {
    document.getElementById('order-modal').classList.remove('active');
    currentOrderId = null;
}

// Взять заказ в работу
async function takeOrder() {
    if (!currentOrderId) return;
    
    const order = database.orders.find(o => o.id === currentOrderId);
    if (!order) return;
    
    order.assignedTo = currentUser.id;
    order.status = 'in-progress';
    order.updatedAt = new Date().toISOString();
    
    // Добавляем системное сообщение
    if (!database.messages) database.messages = [];
    database.messages.push({
        id: 'msg_' + Date.now(),
        orderId: currentOrderId,
        text: `${currentUser.name} взял заказ в работу`,
        sender: 'system',
        timestamp: new Date().toISOString()
    });
    
    // Сохраняем базу
    const saved = await saveDatabase();
    if (saved) {
        showNotification('Заказ взят в работу!', 'success');
        closeOrderModal();
        loadOrders();
        loadDashboardData();
    }
}

// Завершить заказ
async function completeOrder() {
    if (!currentOrderId) return;
    
    if (!confirm('Вы уверены, что хотите завершить этот заказ?')) return;
    
    const order = database.orders.find(o => o.id === currentOrderId);
    if (!order) return;
    
    order.status = 'completed';
    order.updatedAt = new Date().toISOString();
    
    // Добавляем системное сообщение
    if (!database.messages) database.messages = [];
    database.messages.push({
        id: 'msg_' + Date.now(),
        orderId: currentOrderId,
        text: `Заказ завершен разработчиком ${currentUser.name}`,
        sender: 'system',
        timestamp: new Date().toISOString()
    });
    
    // Сохраняем базу
    const saved = await saveDatabase();
    if (saved) {
        showNotification('Заказ завершен!', 'success');
        closeOrderModal();
        loadOrders();
        loadDashboardData();
    }
}

// Обновить статус заказа
async function updateOrderStatus() {
    if (!currentOrderId) return;
    
    const status = document.getElementById('status-select').value;
    const order = database.orders.find(o => o.id === currentOrderId);
    if (!order) return;
    
    const oldStatus = order.status;
    order.status = status;
    order.updatedAt = new Date().toISOString();
    
    // Добавляем системное сообщение
    if (!database.messages) database.messages = [];
    database.messages.push({
        id: 'msg_' + Date.now(),
        orderId: currentOrderId,
        text: `Статус изменен с "${getStatusText(oldStatus)}" на "${getStatusText(status)}"`,
        sender: 'system',
        timestamp: new Date().toISOString()
    });
    
    // Сохраняем базу
    const saved = await saveDatabase();
    if (saved) {
        showNotification('Статус обновлен', 'success');
        closeOrderModal();
        loadOrders();
    }
}

// Удалить заказ
async function deleteOrder() {
    if (!currentOrderId) return;
    
    if (!confirm('Вы уверены, что хотите удалить этот заказ? Это действие нельзя отменить.')) return;
    
    const orderIndex = database.orders.findIndex(o => o.id === currentOrderId);
    if (orderIndex === -1) return;
    
    database.orders.splice(orderIndex, 1);
    
    // Сохраняем базу
    const saved = await saveDatabase();
    if (saved) {
        showNotification('Заказ удален', 'success');
        closeOrderModal();
        loadOrders();
        loadDashboardData();
    }
}

// Получить текст статуса
function getStatusText(status) {
    const statuses = {
        'new': 'Новый',
        'in-progress': 'В работе',
        'review': 'На проверке',
        'completed': 'Завершен',
        'cancelled': 'Отменен'
    };
    return statuses[status] || status;
}

// Загрузка клиентов
function loadClients() {
    if (!database || !database.users || !database.users.clients) return;
    
    const clients = database.users.clients;
    
    // Обновляем счетчик
    document.getElementById('clients-badge').textContent = clients.length;
    
    // Отображаем клиентов
    const container = document.getElementById('clients-grid');
    if (!container) return;
    
    if (clients.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px; color: var(--gray); grid-column: 1/-1;">
                <i class="fas fa-users" style="font-size: 48px; margin-bottom: 15px; opacity: 0.5;"></i>
                <h3 style="margin-bottom: 10px;">Клиентов пока нет</h3>
                <p>Клиенты появятся после регистрации на платформе</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = clients.map(client => {
        // Получаем заказы клиента
        const clientOrders = database.orders?.filter(o => o.clientId === client.id) || [];
        const completedOrders = clientOrders.filter(o => o.status === 'completed').length;
        const totalSpent = clientOrders.reduce((sum, order) => sum + (order.budget || 0), 0);
        
        return `
            <div class="client-card">
                <div class="client-header">
                    <div class="client-avatar">${client.avatar || client.name?.charAt(0) || 'К'}</div>
                    <div class="client-info">
                        <h3>${client.name || 'Без имени'}</h3>
                        <div class="client-email">${client.email || 'Нет email'}</div>
                    </div>
                </div>
                
                <div class="client-details">
                    <div class="client-detail">
                        <span class="client-detail-label">Телефон</span>
                        <span class="client-detail-value">${client.phone || 'Не указан'}</span>
                    </div>
                    <div class="client-detail">
                        <span class="client-detail-label">Telegram</span>
                        <span class="client-detail-value">${client.telegram ? '@' + client.telegram : 'Не указан'}</span>
                    </div>
                    <div class="client-detail">
                        <span class="client-detail-label">Заказов</span>
                        <span class="client-detail-value">${clientOrders.length}</span>
                    </div>
                    <div class="client-detail">
                        <span class="client-detail-label">Завершено</span>
                        <span class="client-detail-value">${completedOrders}</span>
                    </div>
                    <div class="client-detail">
                        <span class="client-detail-label">Потратил</span>
                        <span class="client-detail-value">${formatCurrency(totalSpent)}</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Поиск клиентов
function searchClients() {
    const search = document.getElementById('clients-search').value.toLowerCase();
    const clients = document.querySelectorAll('.client-card');
    
    clients.forEach(client => {
        const text = client.textContent.toLowerCase();
        client.style.display = text.includes(search) ? 'block' : 'none';
    });
}

// Обновление клиентов
async function refreshClients() {
    await loadDatabase();
    loadClients();
    showNotification('Список клиентов обновлен', 'success');
}

// Открыть модальное окно чата
function openChatModal() {
    currentChatOrderId = currentOrderId;
    const order = database.orders.find(o => o.id === currentChatOrderId);
    if (!order) {
        showNotification('Заказ не найден', 'error');
        return;
    }
    
    document.getElementById('chat-modal-title').textContent = `Чат: ${order.projectName || 'Без названия'}`;
    loadChatMessages();
    document.getElementById('chat-modal').classList.add('active');
}

// Закрыть модальное окно чата
function closeChatModal() {
    document.getElementById('chat-modal').classList.remove('active');
    currentChatOrderId = null;
}

// Загрузить сообщения чата
function loadChatMessages() {
    if (!currentChatOrderId) return;
    
    const messages = database.messages?.filter(m => m.orderId === currentChatOrderId) || [];
    const container = document.getElementById('chat-messages');
    if (!container) return;
    
    if (messages.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--gray);">
                <p>Нет сообщений</p>
            </div>
        `;
        return;
    }
    
    // Сортируем по времени
    messages.sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));
    
    container.innerHTML = messages.map(msg => {
        if (msg.sender === 'system') {
            return `
                <div class="message-system">
                    <i class="fas fa-info-circle"></i> ${msg.text || ''}
                </div>
            `;
        } else {
            const isDeveloper = msg.sender === currentUser.id;
            const sender = isDeveloper ? currentUser.name : 'Клиент';
            
            return `
                <div class="message ${isDeveloper ? 'developer' : 'client'}">
                    <div class="message-sender">${sender}</div>
                    <div>${msg.text || ''}</div>
                    <div class="message-time">${msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                </div>
            `;
        }
    }).join('');
    
    // Прокрутка вниз
    container.scrollTop = container.scrollHeight;
}

// Отправить сообщение
async function sendMessage() {
    if (!currentChatOrderId) return;
    
    const input = document.getElementById('chat-input');
    const message = input.value.trim();
    
    if (!message) return;
    
    // Создаем сообщение
    const newMessage = {
        id: 'msg_' + Date.now(),
        orderId: currentChatOrderId,
        text: message,
        sender: currentUser.id,
        timestamp: new Date().toISOString()
    };
    
    // Добавляем в базу
    if (!database.messages) database.messages = [];
    database.messages.push(newMessage);
    
    // Сохраняем базу
    const saved = await saveDatabase();
    if (saved) {
        // Очищаем поле ввода
        input.value = '';
        
        // Обновляем сообщения
        loadChatMessages();
    }
}

// Форматирование валюты
function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(amount);
}

// Показать уведомление
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Выход
function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// Инициализация при загрузке
document.addEventListener('DOMContentLoaded', function() {
    console.log('Документ загружен, начинаем инициализацию...');
    
    // Запускаем инициализацию
    setTimeout(() => {
        init();
    }, 100);
    
    // Автоматическое обновление данных каждые 30 секунд
    setInterval(() => {
        if (isInitialized) {
            loadDatabase().then(() => {
                loadDashboardData();
                loadOrders();
                loadClients();
            });
        }
    }, 30000);
    
    // Обновляем данные при возвращении на вкладку
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden && isInitialized) {
            loadDatabase();
        }
    });
});
