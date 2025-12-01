/**
 * ШАБЛОН ПОЧТЫ (STORAGE)
 * Полный функционал почты для внедрения в новую карту
 * Включает систему доставки и хранения товаров
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * 1. Подключите этот файл в HTML
 * 2. Вызовите initStorageBuilding() после загрузки DOM
 * 3. Настройте координаты интерактивной зоны под новую карту
 */

(function() {
    'use strict';
    
    // === КОНФИГУРАЦИЯ ПОЧТЫ ===
    const STORAGE_CONFIG = {
        name: 'Почта',
        type: 'storage',
        icon: 'assets/svg/city-panel/mail.svg',
        // КООРДИНАТЫ ДЛЯ НОВОЙ КАРТЫ - НАСТРОЙТЕ ПОД ВАШУ КАРТУ
        zone: {
            left: '35%',      // Позиция слева
            top: '45%',       // Позиция сверху
            width: '8%',      // Ширина зоны
            height: '12%'     // Высота зоны
        },
        // Базовые параметры
        baseIncome: 3000,
        baseUpgradeCost: 8000,
        maxWorkers: 2,
        workerBonus: 0.2, // 20% бонус за работника
        purchaseCost: 15000,
        // Параметры доставки
        deliveryOrders: [],
        maxDeliveryOrders: 3,
        deliveryTime: 10 // минут на доставку
    };
    
    // === ДАННЫЕ ПОЧТЫ ===
    let storageData = {
        level: 1,
        income: STORAGE_CONFIG.baseIncome,
        workers: 0,
        maxWorkers: STORAGE_CONFIG.maxWorkers,
        upgradeCost: STORAGE_CONFIG.baseUpgradeCost,
        lastCollectTime: null,
        accumulatedProfit: 0,
        isOwned: false,
        purchaseCost: STORAGE_CONFIG.purchaseCost,
        name: STORAGE_CONFIG.name,
        // Данные доставки
        deliveryOrders: [],
        currentDelivery: null
    };
    
    // === ИНИЦИАЛИЗАЦИЯ ===
    function initStorageBuilding() {
        // Загружаем сохраненные данные
        loadStorageData();
        
        // Создаем интерактивную зону
        createStorageZone();
        
        // Инициализируем панель
        initStoragePanel();
        
        // Запускаем систему доставки
        startDeliverySystem();
        
    }
    
    // === СОЗДАНИЕ ИНТЕРАКТИВНОЙ ЗОНЫ ===
    function createStorageZone() {
        // Удаляем старую зону если есть
        const oldZone = document.getElementById('zone-storage');
        if (oldZone) {
            oldZone.remove();
        }
        
        // Создаем новую зону
        const zone = document.createElement('div');
        zone.className = 'building-zone';
        zone.id = 'zone-storage';
        zone.dataset.building = 'storage';
        zone.title = STORAGE_CONFIG.name;
        zone.textContent = '3'; // Номер здания
        
        // Настраиваем позицию
        zone.style.left = STORAGE_CONFIG.zone.left;
        zone.style.top = STORAGE_CONFIG.zone.top;
        zone.style.width = STORAGE_CONFIG.zone.width;
        zone.style.height = STORAGE_CONFIG.zone.height;
        
        // Добавляем обработчики событий
        zone.addEventListener('click', handleStorageClick);
        zone.addEventListener('touchstart', handleStorageTouch, { passive: true });
        zone.setAttribute('data-handlers-added', 'true');
        
        // Добавляем в контейнер карты
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.appendChild(zone);
        }
    }
    
    // === ОБРАБОТЧИКИ СОБЫТИЙ ===
    function handleStorageClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Скрываем индикаторы прибыли
        if (window.hideProfitIndicators) {
            window.hideProfitIndicators();
        }
        
        // Запускаем анимацию приближения
        if (window.zoomToBuilding) {
            window.zoomToBuilding('storage', STORAGE_CONFIG.name);
        } else {
            // Если анимация недоступна, открываем панель напрямую
            openStoragePanel();
        }
    }
    
    function handleStorageTouch(event) {
        event.preventDefault();
        handleStorageClick(event);
    }
    
    // === ПАНЕЛЬ ПОЧТЫ ===
    function openStoragePanel() {
        // Закрываем предыдущую панель
        if (window.closeBuildingPanel) {
            window.closeBuildingPanel();
        }
        
        // Создаем панель
        const panel = createStoragePanel();
        document.body.appendChild(panel);
        
        // Показываем панель с анимацией
        setTimeout(() => {
            panel.classList.add('show');
        }, 10);
        
        // Скрываем главное меню
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.style.display = 'none';
        }
    }
    
    function createStoragePanel() {
        const panel = document.createElement('div');
        panel.className = 'building-panel';
        panel.id = 'building-panel';
        
        // Получаем актуальные данные
        const accumulatedProfit = calculateAccumulatedProfit();
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        const canUpgrade = playerMoney >= storageData.upgradeCost;
        const canCollect = accumulatedProfit > 0;
        const canHire = storageData.workers < storageData.maxWorkers && playerMoney >= 5000;
        const canBuy = !storageData.isOwned && playerMoney >= storageData.purchaseCost;
        
        // Получаем назначенного сотрудника
        const assignedEmployee = window.getEmpByBuilding ? window.getEmpByBuilding('storage') : null;
        
        // Если здание не куплено, показываем панель покупки
        if (!storageData.isOwned) {
            panel.innerHTML = `
                <div class="building-panel-container">
                    <!-- Заголовок -->
                    <div class="building-panel-header">
                        <div class="building-panel-title">
                            <img src="${STORAGE_CONFIG.icon}" alt="${STORAGE_CONFIG.name}" class="building-icon">
                            <h2>${STORAGE_CONFIG.name}</h2>
                        </div>
                        <button class="close-btn" onclick="closeStoragePanel()">×</button>
                    </div>
                    
                    <!-- Панель покупки -->
                    <div class="building-panel-content">
                        <div class="purchase-card">
                            <div class="purchase-info">
                                <h3>Купить ${STORAGE_CONFIG.name}</h3>
                                <p>Почтовое отделение для доставки корреспонденции</p>
                                
                                <div class="purchase-details">
                                    <div class="detail-item">
                                        <span>Стоимость:</span>
                                        <span class="cost">${formatNumber(storageData.purchaseCost)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span>Доход в час:</span>
                                        <span class="income">${formatNumber(storageData.income)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span>Макс. работников:</span>
                                        <span class="workers">${storageData.maxWorkers}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button class="purchase-btn ${canBuy ? 'active' : 'disabled'}" 
                                    onclick="buyStorage()" 
                                    ${!canBuy ? 'disabled' : ''}>
                                <span>Купить за ${formatNumber(storageData.purchaseCost)}</span>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Обычная панель управления
            panel.innerHTML = `
                <div class="building-panel-container">
                    <!-- Заголовок -->
                    <div class="building-panel-header">
                        <div class="building-panel-title">
                            <img src="${STORAGE_CONFIG.icon}" alt="${STORAGE_CONFIG.name}" class="building-icon">
                            <h2>${STORAGE_CONFIG.name}</h2>
                        </div>
                        <button class="close-btn" onclick="closeStoragePanel()">×</button>
                    </div>
                    
                    <!-- Основная информация -->
                    <div class="building-panel-content">
                        <!-- Карточка дохода -->
                        <div class="income-card">
                            <div class="card-header">
                                <h3>Доход</h3>
                                <div class="level-badge">Уровень ${storageData.level}</div>
                            </div>
                            
                            <div class="income-info">
                                <div class="income-amount">
                                    <span class="income-value">${formatNumber(storageData.income)}</span>
                                    <span class="income-period">/час</span>
                                </div>
                                
                                <div class="profit-info">
                                    <div class="profit-label">Накоплено:</div>
                                    <div class="profit-amount">${formatNumber(accumulatedProfit)}</div>
                                </div>
                            </div>
                            
                            <!-- Кнопка сбора -->
                            <button class="collect-btn ${canCollect ? 'active' : 'disabled'}" 
                                    onclick="collectStorageIncome()" 
                                    ${!canCollect ? 'disabled' : ''}>
                                <span>Собрать</span>
                                <img src="assets/svg/money-icon.svg" alt="Collect">
                            </button>
                        </div>
                        
                        <!-- Карточка доставки -->
                        <div class="delivery-card">
                            <div class="card-header">
                                <h3>Доставка</h3>
                                <div class="delivery-count">${storageData.deliveryOrders.length}/${STORAGE_CONFIG.maxDeliveryOrders}</div>
                            </div>
                            
                            <div class="delivery-info">
                                ${storageData.deliveryOrders.length > 0 ? `
                                    <div class="delivery-orders">
                                        ${storageData.deliveryOrders.map((order, index) => `
                                            <div class="delivery-order">
                                                <div class="order-info">
                                                    <div class="order-type">${order.type === 'books' ? 'Книги' : 'Журналы'}</div>
                                                    <div class="order-quantity">${order.quantity} шт.</div>
                                                </div>
                                                <div class="order-reward">+${formatNumber(order.reward)}</div>
                                            </div>
                                        `).join('')}
                                    </div>
                                ` : `
                                    <div class="no-deliveries">
                                        <div class="no-deliveries-text">Нет активных заказов</div>
                                    </div>
                                `}
                            </div>
                            
                            <button class="delivery-btn" onclick="openDeliveryMenu()">
                                Управление доставкой
                            </button>
                        </div>
                        
                        <!-- Карточка улучшения -->
                        <div class="upgrade-card">
                            <div class="card-header">
                                <h3>Улучшение</h3>
                            </div>
                            
                            <div class="upgrade-info">
                                <div class="upgrade-cost">
                                    <span>Стоимость:</span>
                                    <span class="cost-amount">${formatNumber(storageData.upgradeCost)}</span>
                                </div>
                            </div>
                            
                            <button class="upgrade-btn ${canUpgrade ? 'active' : 'disabled'}" 
                                    onclick="upgradeStorage()" 
                                    ${!canUpgrade ? 'disabled' : ''}>
                                <span>Улучшить</span>
                                <div class="cost-display">
                                    <img src="assets/svg/money-icon.svg" alt="Cost">
                                    <span>${formatNumber(storageData.upgradeCost)}</span>
                                </div>
                            </button>
                        </div>
                        
                        <!-- Карточка сотрудников -->
                        <div class="employee-card">
                            <div class="card-header">
                                <h3>Сотрудники</h3>
                                <div class="employee-count">${storageData.workers}/${storageData.maxWorkers}</div>
                            </div>
                            
                            ${assignedEmployee ? `
                                <div class="assigned-employee">
                                    <img src="${assignedEmployee.img}" alt="${assignedEmployee.name}" class="employee-avatar">
                                    <div class="employee-info">
                                        <div class="employee-name">${assignedEmployee.name}</div>
                                        <div class="employee-level">Уровень ${assignedEmployee.level}</div>
                                        <div class="employee-skill">Навык: ${assignedEmployee.skill}</div>
                                    </div>
                                </div>
                            ` : `
                                <div class="no-employee">
                                    <div class="no-employee-text">Нет назначенного сотрудника</div>
                                </div>
                            `}
                            
                            <button class="employee-btn" onclick="openEmployeeAssignment('storage')">
                                ${assignedEmployee ? 'Сменить сотрудника' : 'Назначить сотрудника'}
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        return panel;
    }
    
    // === ФУНКЦИИ УПРАВЛЕНИЯ ===
    function buyStorage() {
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        
        if (playerMoney >= storageData.purchaseCost) {
            // Списываем деньги
            if (window.setPlayerMoney) {
                window.setPlayerMoney(playerMoney - storageData.purchaseCost);
            }
            
            // Покупаем здание
            storageData.isOwned = true;
            storageData.lastCollectTime = Date.now();
            
            // Сохраняем данные
            saveStorageData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification(`🎉 Поздравляем! Вы купили ${STORAGE_CONFIG.name}!`, 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openStoragePanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Недостаточно денег для покупки!', 'error');
            }
        }
    }
    
    function collectStorageIncome() {
        const accumulatedProfit = calculateAccumulatedProfit();
        
        if (accumulatedProfit > 0) {
            // Добавляем деньги к балансу
            if (window.setPlayerMoney && window.getPlayerMoney) {
                const currentMoney = window.getPlayerMoney();
                window.setPlayerMoney(currentMoney + accumulatedProfit);
            }
            
            // Сбрасываем накопленную прибыль
            storageData.accumulatedProfit = 0;
            storageData.lastCollectTime = Date.now();
            
            // Сохраняем данные
            saveStorageData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification(`💰 Получено ${formatNumber(accumulatedProfit)}`, 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openStoragePanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Нет денег для получения!', 'error');
            }
        }
    }
    
    function upgradeStorage() {
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        
        if (playerMoney >= storageData.upgradeCost) {
            // Списываем деньги
            if (window.setPlayerMoney) {
                window.setPlayerMoney(playerMoney - storageData.upgradeCost);
            }
            
            // Улучшаем здание
            storageData.level++;
            storageData.income = Math.floor(storageData.income * 1.5);
            storageData.upgradeCost = Math.floor(storageData.upgradeCost * 2);
            
            // Сохраняем данные
            saveStorageData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification(`🏗️ Почта улучшена до уровня ${storageData.level}!`, 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openStoragePanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Недостаточно денег для улучшения!', 'error');
            }
        }
    }
    
    // === СИСТЕМА ДОСТАВКИ ===
    function startDeliverySystem() {
        // Генерируем случайные заказы на доставку
        setInterval(() => {
            if (storageData.isOwned && storageData.deliveryOrders.length < STORAGE_CONFIG.maxDeliveryOrders) {
                generateDeliveryOrder();
            }
        }, 30000); // Каждые 30 секунд
    }
    
    function generateDeliveryOrder() {
        const orderTypes = ['books', 'magazines'];
        const type = orderTypes[Math.floor(Math.random() * orderTypes.length)];
        const quantity = Math.floor(Math.random() * 5) + 1; // 1-5 штук
        const reward = quantity * (type === 'books' ? 1000 : 500); // 1000 за книгу, 500 за журнал
        
        const order = {
            id: Date.now(),
            type: type,
            quantity: quantity,
            reward: reward,
            timeLeft: STORAGE_CONFIG.deliveryTime * 60 * 1000, // в миллисекундах
            createdAt: Date.now()
        };
        
        storageData.deliveryOrders.push(order);
        saveStorageData();
        
        // Показываем уведомление о новом заказе
        if (window.showNotification) {
            window.showNotification(`📦 Новый заказ: ${quantity} ${type === 'books' ? 'книг' : 'журналов'}`, 'info');
        }
    }
    
    function openDeliveryMenu() {
        // Создаем меню доставки
        const menu = document.createElement('div');
        menu.className = 'delivery-menu';
        menu.id = 'delivery-menu';
        
        menu.innerHTML = `
            <div class="delivery-menu-container">
                <div class="delivery-menu-header">
                    <h3>Управление доставкой</h3>
                    <button class="close-btn" onclick="closeDeliveryMenu()">×</button>
                </div>
                
                <div class="delivery-menu-content">
                    ${storageData.deliveryOrders.length > 0 ? `
                        <div class="active-orders">
                            <h4>Активные заказы</h4>
                            ${storageData.deliveryOrders.map((order, index) => `
                                <div class="order-item">
                                    <div class="order-details">
                                        <div class="order-type">${order.type === 'books' ? 'Книги' : 'Журналы'}</div>
                                        <div class="order-quantity">${order.quantity} шт.</div>
                                        <div class="order-reward">+${formatNumber(order.reward)}</div>
                                    </div>
                                    <button class="complete-order-btn" onclick="completeDeliveryOrder(${order.id})">
                                        Выполнить
                                    </button>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="no-orders">
                            <div class="no-orders-text">Нет активных заказов</div>
                            <button class="generate-order-btn" onclick="generateDeliveryOrder()">
                                Создать заказ
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;
        
        document.body.appendChild(menu);
        
        // Показываем меню с анимацией
        setTimeout(() => {
            menu.classList.add('show');
        }, 10);
    }
    
    function completeDeliveryOrder(orderId) {
        const orderIndex = storageData.deliveryOrders.findIndex(order => order.id === orderId);
        if (orderIndex === -1) return;
        
        const order = storageData.deliveryOrders[orderIndex];
        
        // Проверяем, есть ли товары в наличии
        const storedBooks = window.storedBooks || 0;
        const storedMags = window.storedMags || 0;
        
        if (order.type === 'books' && storedBooks < order.quantity) {
            if (window.showNotification) {
                window.showNotification('❌ Недостаточно книг в наличии!', 'error');
            }
            return;
        }
        
        if (order.type === 'magazines' && storedMags < order.quantity) {
            if (window.showNotification) {
                window.showNotification('❌ Недостаточно журналов в наличии!', 'error');
            }
            return;
        }
        
        // Убираем товары из склада
        if (order.type === 'books') {
            window.storedBooks = Math.max(0, storedBooks - order.quantity);
        } else {
            window.storedMags = Math.max(0, storedMags - order.quantity);
        }
        
        // Добавляем награду
        if (window.setPlayerMoney && window.getPlayerMoney) {
            const currentMoney = window.getPlayerMoney();
            window.setPlayerMoney(currentMoney + order.reward);
        }
        
        // Удаляем заказ
        storageData.deliveryOrders.splice(orderIndex, 1);
        saveStorageData();
        
        // Показываем уведомление
        if (window.showNotification) {
            window.showNotification(`✅ Заказ выполнен! Получено ${formatNumber(order.reward)}`, 'success');
        }
        
        // Закрываем меню и обновляем панель
        closeDeliveryMenu();
        setTimeout(() => {
            openStoragePanel();
        }, 100);
    }
    
    function closeDeliveryMenu() {
        const menu = document.getElementById('delivery-menu');
        if (menu) {
            menu.classList.remove('show');
            setTimeout(() => {
                if (menu.parentNode) {
                    menu.parentNode.removeChild(menu);
                }
            }, 300);
        }
    }
    
    // === РАСЧЕТ ПРИБЫЛИ ===
    function calculateAccumulatedProfit() {
        if (!storageData.isOwned) return 0;
        
        // Если lastCollectTime не установлен, прибыль не накапливается
        if (!storageData.lastCollectTime) return 0;
        
        const currentTime = Date.now();
        const timeDiff = currentTime - storageData.lastCollectTime;
        const hoursPassed = timeDiff / (1000 * 60 * 60);
        
        // Базовый доход в час с учетом работников
        const hourlyIncome = storageData.income * (1 + storageData.workers * STORAGE_CONFIG.workerBonus);
        
        // Рассчитываем накопленную прибыль
        const newProfit = hourlyIncome * hoursPassed;
        
        return Math.floor(storageData.accumulatedProfit + newProfit);
    }
    
    // === СОХРАНЕНИЕ И ЗАГРУЗКА ===
    function saveStorageData() {
        localStorage.setItem('storageData', JSON.stringify(storageData));
    }
    
    function loadStorageData() {
        const saved = localStorage.getItem('storageData');
        if (saved) {
            const parsed = JSON.parse(saved);
            storageData = { ...storageData, ...parsed };
            // Если здание не куплено, сбрасываем lastCollectTime
            if (!storageData.isOwned) {
                storageData.lastCollectTime = null;
                storageData.accumulatedProfit = 0;
            }
        }
    }
    
    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
    function formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'k';
        }
        return num.toString();
    }
    
    function closeStoragePanel() {
        const panel = document.getElementById('building-panel');
        if (panel) {
            panel.classList.remove('show');
            setTimeout(() => {
                if (panel.parentNode) {
                    panel.parentNode.removeChild(panel);
                }
            }, 300);
        }
        
        // Показываем главное меню
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.style.display = 'block';
        }
    }
    
    // === ГЛОБАЛЬНЫЕ ФУНКЦИИ ===
    window.initStorageBuilding = initStorageBuilding;
    window.buyStorage = buyStorage;
    window.collectStorageIncome = collectStorageIncome;
    window.upgradeStorage = upgradeStorage;
    window.closeStoragePanel = closeStoragePanel;
    window.openDeliveryMenu = openDeliveryMenu;
    window.completeDeliveryOrder = completeDeliveryOrder;
    window.closeDeliveryMenu = closeDeliveryMenu;
    window.generateDeliveryOrder = generateDeliveryOrder;
    window.openEmployeeAssignment = function(building) {
        if (window.openAssignOverlay) {
            window.openAssignOverlay(building);
        }
    };
    
    // === АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ ===
    document.addEventListener('DOMContentLoaded', function() {
        // Инициализируем почту после загрузки DOM
        setTimeout(initStorageBuilding, 100);
    });
    
})();
