/**
 * ШАБЛОН ЗАВОДА
 * Полный функционал завода для внедрения в новую карту
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * 1. Подключите этот файл в HTML
 * 2. Вызовите initFactoryBuilding() после загрузки DOM
 * 3. Настройте координаты интерактивной зоны под новую карту
 */

(function() {
    'use strict';
    
    // === КОНФИГУРАЦИЯ ЗАВОДА ===
    const FACTORY_CONFIG = {
        name: 'Завод',
        type: 'factory',
        icon: 'assets/svg/city-panel/factory.svg',
        // КООРДИНАТЫ ДЛЯ НОВОЙ КАРТЫ - НАСТРОЙТЕ ПОД ВАШУ КАРТУ
        zone: {
            left: '25%',      // Позиция слева
            top: '35%',       // Позиция сверху
            width: '10%',     // Ширина зоны
            height: '15%'     // Высота зоны
        },
        // Базовые параметры
        baseIncome: 3000,
        baseUpgradeCost: 5000,
        maxWorkers: 5,
        workerBonus: 0.2, // 20% бонус за работника
        purchaseCost: 20000
    };
    
    // === ДАННЫЕ ЗАВОДА ===
    let factoryData = {
        level: 1,
        income: FACTORY_CONFIG.baseIncome,
        workers: 0,
        maxWorkers: FACTORY_CONFIG.maxWorkers,
        upgradeCost: FACTORY_CONFIG.baseUpgradeCost,
        lastCollectTime: null,
        accumulatedProfit: 0,
        isOwned: false,
        purchaseCost: FACTORY_CONFIG.purchaseCost,
        name: FACTORY_CONFIG.name
    };
    
    // === ИНИЦИАЛИЗАЦИЯ ===
    function initFactoryBuilding() {
        // Загружаем сохраненные данные
        loadFactoryData();
        
        // Создаем интерактивную зону
        createFactoryZone();
        
        // Инициализируем панель
        initFactoryPanel();
        
    }
    
    // === СОЗДАНИЕ ИНТЕРАКТИВНОЙ ЗОНЫ ===
    function createFactoryZone() {
        // Удаляем старую зону если есть
        const oldZone = document.getElementById('zone-factory');
        if (oldZone) {
            oldZone.remove();
        }
        
        // Создаем новую зону
        const zone = document.createElement('div');
        zone.className = 'building-zone';
        zone.id = 'zone-factory';
        zone.dataset.building = 'factory';
        zone.title = FACTORY_CONFIG.name;
        zone.textContent = '2'; // Номер здания
        
        // Настраиваем позицию
        zone.style.left = FACTORY_CONFIG.zone.left;
        zone.style.top = FACTORY_CONFIG.zone.top;
        zone.style.width = FACTORY_CONFIG.zone.width;
        zone.style.height = FACTORY_CONFIG.zone.height;
        
        // Добавляем обработчики событий
        zone.addEventListener('click', handleFactoryClick);
        zone.addEventListener('touchstart', handleFactoryTouch, { passive: true });
        zone.setAttribute('data-handlers-added', 'true');
        
        // Добавляем в контейнер карты
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.appendChild(zone);
        }
    }
    
    // === ОБРАБОТЧИКИ СОБЫТИЙ ===
    function handleFactoryClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Скрываем индикаторы прибыли
        if (window.hideProfitIndicators) {
            window.hideProfitIndicators();
        }
        
        // Запускаем анимацию приближения
        if (window.zoomToBuilding) {
            window.zoomToBuilding('factory', FACTORY_CONFIG.name);
        } else {
            // Если анимация недоступна, открываем панель напрямую
            openFactoryPanel();
        }
    }
    
    function handleFactoryTouch(event) {
        event.preventDefault();
        handleFactoryClick(event);
    }
    
    // === ПАНЕЛЬ ЗАВОДА ===
    function openFactoryPanel() {
        // Закрываем предыдущую панель
        if (window.closeBuildingPanel) {
            window.closeBuildingPanel();
        }
        
        // Создаем панель
        const panel = createFactoryPanel();
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
    
    function createFactoryPanel() {
        const panel = document.createElement('div');
        panel.className = 'building-panel';
        panel.id = 'building-panel';
        
        // Получаем актуальные данные
        const accumulatedProfit = calculateAccumulatedProfit();
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        const canUpgrade = playerMoney >= factoryData.upgradeCost;
        const canCollect = accumulatedProfit > 0;
        const canHire = factoryData.workers < factoryData.maxWorkers && playerMoney >= 5000;
        const canBuy = !factoryData.isOwned && playerMoney >= factoryData.purchaseCost;
        
        // Получаем назначенного сотрудника
        const assignedEmployee = window.getEmpByBuilding ? window.getEmpByBuilding('factory') : null;
        
        // Если здание не куплено, показываем панель покупки
        if (!factoryData.isOwned) {
            panel.innerHTML = `
                <div class="building-panel-container">
                    <!-- Заголовок -->
                    <div class="building-panel-header">
                        <div class="building-panel-title">
                            <img src="${FACTORY_CONFIG.icon}" alt="${FACTORY_CONFIG.name}" class="building-icon">
                            <h2>${FACTORY_CONFIG.name}</h2>
                        </div>
                        <button class="close-btn" onclick="closeFactoryPanel()">×</button>
                    </div>
                    
                    <!-- Панель покупки -->
                    <div class="building-panel-content">
                        <div class="purchase-card">
                            <div class="purchase-info">
                                <h3>Купить ${FACTORY_CONFIG.name}</h3>
                                <p>Производственное здание для изготовления товаров</p>
                                
                                <div class="purchase-details">
                                    <div class="detail-item">
                                        <span>Стоимость:</span>
                                        <span class="cost">${formatNumber(factoryData.purchaseCost)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span>Доход в час:</span>
                                        <span class="income">${formatNumber(factoryData.income)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span>Макс. работников:</span>
                                        <span class="workers">${factoryData.maxWorkers}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button class="purchase-btn ${canBuy ? 'active' : 'disabled'}" 
                                    onclick="buyFactory()" 
                                    ${!canBuy ? 'disabled' : ''}>
                                <span>Купить за ${formatNumber(factoryData.purchaseCost)}</span>
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
                            <img src="${FACTORY_CONFIG.icon}" alt="${FACTORY_CONFIG.name}" class="building-icon">
                            <h2>${FACTORY_CONFIG.name}</h2>
                        </div>
                        <button class="close-btn" onclick="closeFactoryPanel()">×</button>
                    </div>
                    
                    <!-- Основная информация -->
                    <div class="building-panel-content">
                        <!-- Карточка дохода -->
                        <div class="income-card">
                            <div class="card-header">
                                <h3>Доход</h3>
                                <div class="level-badge">Уровень ${factoryData.level}</div>
                            </div>
                            
                            <div class="income-info">
                                <div class="income-amount">
                                    <span class="income-value">${formatNumber(factoryData.income)}</span>
                                    <span class="income-period">/час</span>
                                </div>
                                
                                <div class="profit-info">
                                    <div class="profit-label">Накоплено:</div>
                                    <div class="profit-amount">${formatNumber(accumulatedProfit)}</div>
                                </div>
                            </div>
                            
                            <!-- Кнопка сбора -->
                            <button class="collect-btn ${canCollect ? 'active' : 'disabled'}" 
                                    onclick="collectFactoryIncome()" 
                                    ${!canCollect ? 'disabled' : ''}>
                                <span>Собрать</span>
                                <img src="assets/svg/money-icon.svg" alt="Collect">
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
                                    <span class="cost-amount">${formatNumber(factoryData.upgradeCost)}</span>
                                </div>
                            </div>
                            
                            <button class="upgrade-btn ${canUpgrade ? 'active' : 'disabled'}" 
                                    onclick="upgradeFactory()" 
                                    ${!canUpgrade ? 'disabled' : ''}>
                                <span>Улучшить</span>
                                <div class="cost-display">
                                    <img src="assets/svg/money-icon.svg" alt="Cost">
                                    <span>${formatNumber(factoryData.upgradeCost)}</span>
                                </div>
                            </button>
                        </div>
                        
                        <!-- Карточка сотрудников -->
                        <div class="employee-card">
                            <div class="card-header">
                                <h3>Сотрудники</h3>
                                <div class="employee-count">${factoryData.workers}/${factoryData.maxWorkers}</div>
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
                            
                            <button class="employee-btn" onclick="openEmployeeAssignment('factory')">
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
    function buyFactory() {
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        
        if (playerMoney >= factoryData.purchaseCost) {
            // Списываем деньги
            if (window.setPlayerMoney) {
                window.setPlayerMoney(playerMoney - factoryData.purchaseCost);
            }
            
            // Покупаем здание
            factoryData.isOwned = true;
            factoryData.lastCollectTime = Date.now();
            
            // Сохраняем данные
            saveFactoryData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification(`🎉 Поздравляем! Вы купили ${FACTORY_CONFIG.name}!`, 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openFactoryPanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Недостаточно денег для покупки!', 'error');
            }
        }
    }
    
    function collectFactoryIncome() {
        const accumulatedProfit = calculateAccumulatedProfit();
        
        if (accumulatedProfit > 0) {
            // Добавляем деньги к балансу
            if (window.setPlayerMoney && window.getPlayerMoney) {
                const currentMoney = window.getPlayerMoney();
                window.setPlayerMoney(currentMoney + accumulatedProfit);
            }
            
            // Сбрасываем накопленную прибыль
            factoryData.accumulatedProfit = 0;
            factoryData.lastCollectTime = Date.now();
            
            // Сохраняем данные
            saveFactoryData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification(`💰 Получено ${formatNumber(accumulatedProfit)}`, 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openFactoryPanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Нет денег для получения!', 'error');
            }
        }
    }
    
    function upgradeFactory() {
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        
        if (playerMoney >= factoryData.upgradeCost) {
            // Списываем деньги
            if (window.setPlayerMoney) {
                window.setPlayerMoney(playerMoney - factoryData.upgradeCost);
            }
            
            // Улучшаем здание
            factoryData.level++;
            factoryData.income = Math.floor(factoryData.income * 1.5);
            factoryData.upgradeCost = Math.floor(factoryData.upgradeCost * 2);
            
            // Сохраняем данные
            saveFactoryData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification(`🏗️ Завод улучшен до уровня ${factoryData.level}!`, 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openFactoryPanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Недостаточно денег для улучшения!', 'error');
            }
        }
    }
    
    // === РАСЧЕТ ПРИБЫЛИ ===
    function calculateAccumulatedProfit() {
        if (!factoryData.isOwned) return 0;
        
        // Если lastCollectTime не установлен, прибыль не накапливается
        if (!factoryData.lastCollectTime) return 0;
        
        const currentTime = Date.now();
        const timeDiff = currentTime - factoryData.lastCollectTime;
        const hoursPassed = timeDiff / (1000 * 60 * 60);
        
        // Базовый доход в час с учетом работников
        const hourlyIncome = factoryData.income * (1 + factoryData.workers * FACTORY_CONFIG.workerBonus);
        
        // Рассчитываем накопленную прибыль
        const newProfit = hourlyIncome * hoursPassed;
        
        return Math.floor(factoryData.accumulatedProfit + newProfit);
    }
    
    // === СОХРАНЕНИЕ И ЗАГРУЗКА ===
    function saveFactoryData() {
        localStorage.setItem('factoryData', JSON.stringify(factoryData));
    }
    
    function loadFactoryData() {
        const saved = localStorage.getItem('factoryData');
        if (saved) {
            const parsed = JSON.parse(saved);
            factoryData = { ...factoryData, ...parsed };
            // Если здание не куплено, сбрасываем lastCollectTime
            if (!factoryData.isOwned) {
                factoryData.lastCollectTime = null;
                factoryData.accumulatedProfit = 0;
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
    
    function closeFactoryPanel() {
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
    window.initFactoryBuilding = initFactoryBuilding;
    window.buyFactory = buyFactory;
    window.collectFactoryIncome = collectFactoryIncome;
    window.upgradeFactory = upgradeFactory;
    window.closeFactoryPanel = closeFactoryPanel;
    window.openEmployeeAssignment = function(building) {
        if (window.openAssignOverlay) {
            window.openAssignOverlay(building);
        }
    };
    
    // === АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ ===
    document.addEventListener('DOMContentLoaded', function() {
        // Инициализируем завод после загрузки DOM
        setTimeout(initFactoryBuilding, 100);
    });
    
})();
