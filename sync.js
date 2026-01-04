// Этот файл можно использовать для экспорта/импорта данных
// Поместите его в ту же папку и используйте в консоли браузера

// Экспорт всех данных
function exportData() {
    const data = {
        orders: JSON.parse(localStorage.getItem('sitecore_orders') || '[]'),
        users: JSON.parse(localStorage.getItem('sitecore_users') || '[]'),
        messages: JSON.parse(localStorage.getItem('sitecore_messages') || '{}'),
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitecore-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    console.log('Данные экспортированы');
    return data;
}

// Импорт данных
function importData(file) {
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const data = JSON.parse(e.target.result);
            
            if (data.orders) {
                localStorage.setItem('sitecore_orders', JSON.stringify(data.orders));
            }
            
            if (data.users) {
                localStorage.setItem('sitecore_users', JSON.stringify(data.users));
            }
            
            if (data.messages) {
                localStorage.setItem('sitecore_messages', JSON.stringify(data.messages));
            }
            
            // Синхронизируем
            localStorage.setItem('sitecore_sync', JSON.stringify(data));
            
            console.log('Данные импортированы');
            alert('Данные успешно импортированы! Обновите страницу.');
        } catch (error) {
            console.error('Ошибка импорта:', error);
            alert('Ошибка импорта данных');
        }
    };
    reader.readAsText(file);
}

// Создать HTML для импорта
function createImportUI() {
    const div = document.createElement('div');
    div.style.cssText = `
        position: fixed;
        bottom: 20px;
        left: 20px;
        z-index: 9999;
        background: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        font-family: sans-serif;
    `;
    
    div.innerHTML = `
        <h3 style="margin-top: 0;">SiteCore Sync</h3>
        <button onclick="exportData()" style="padding: 10px; margin: 5px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Экспорт данных</button>
        <br>
        <input type="file" id="importFile" accept=".json" style="margin: 10px 0;">
        <button onclick="document.getElementById('importFile').click()" style="padding: 10px; margin: 5px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">Импорт данных</button>
    `;
    
    document.body.appendChild(div);
    
    const fileInput = div.querySelector('#importFile');
    fileInput.addEventListener('change', function(e) {
        if (e.target.files[0]) {
            importData(e.target.files[0]);
        }
    });
}

// Запуск интерфейса синхронизации
// Вызовите createImportUI() в консоли браузера для отображения панели синхронизации
