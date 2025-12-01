/**
 * ШАБЛОН БИБЛИОТЕКИ
 * Полный функционал библиотеки для внедрения в новую карту
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * 1. Подключите этот файл в HTML
 * 2. Вызовите initLibraryBuilding() после загрузки DOM
 * 3. Настройте координаты интерактивной зоны под новую карту
 */

(function() {
    'use strict';
    
    // === КОНФИГУРАЦИЯ БИБЛИОТЕКИ ===
    const LIBRARY_CONFIG = {
        name: 'Библиотека',
        type: 'library',
        icon: 'assets/svg/city-panel/libery.svg',
        // КООРДИНАТЫ ДЛЯ НОВОЙ КАРТЫ - НАСТРОЙТЕ ПОД ВАШУ КАРТУ
        zone: {
            left: '15%',      // Позиция слева
            top: '25%',       // Позиция сверху
            width: '8%',      // Ширина зоны
            height: '12%'     // Высота зоны
        },
        // Базовые параметры
        baseIncome: 2000,
        baseUpgradeCost: 5000,
        maxWorkers: 4,
        workerBonus: 0.2 // 20% бонус за работника
    };
    
    // === ДАННЫЕ БИБЛИОТЕКИ ===
    let libraryData = {
        level: 1,
        income: LIBRARY_CONFIG.baseIncome,
        workers: 0,
        maxWorkers: LIBRARY_CONFIG.maxWorkers,
        upgradeCost: LIBRARY_CONFIG.baseUpgradeCost,
        lastCollectTime: Date.now(),
        accumulatedProfit: 0,
        isOwned: true, // Библиотека дается бесплатно
        purchaseCost: 0,
        name: LIBRARY_CONFIG.name
    };
    
    // === ИНИЦИАЛИЗАЦИЯ ===
    function initLibraryBuilding() {
        // Загружаем сохраненные данные
        loadLibraryData();
        
        // Создаем интерактивную зону
        createLibraryZone();
        
        // Инициализируем панель
        initLibraryPanel();
        
    }
    
    // === СОЗДАНИЕ ИНТЕРАКТИВНОЙ ЗОНЫ ===
    function createLibraryZone() {
        // Удаляем старую зону если есть
        const oldZone = document.getElementById('zone-library');
        if (oldZone) {
            oldZone.remove();
        }
        
        // Создаем новую зону
        const zone = document.createElement('div');
        zone.className = 'building-zone';
        zone.id = 'zone-library';
        zone.dataset.building = 'library';
        zone.title = LIBRARY_CONFIG.name;
        zone.textContent = '4'; // Номер здания
        
        // Настраиваем позицию
        zone.style.left = LIBRARY_CONFIG.zone.left;
        zone.style.top = LIBRARY_CONFIG.zone.top;
        zone.style.width = LIBRARY_CONFIG.zone.width;
        zone.style.height = LIBRARY_CONFIG.zone.height;
        
        // Добавляем обработчики событий
        zone.addEventListener('click', handleLibraryClick);
        zone.addEventListener('touchstart', handleLibraryTouch, { passive: true });
        zone.setAttribute('data-handlers-added', 'true');
        
        // Добавляем в контейнер карты
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.appendChild(zone);
        }
    }
    
    // === ОБРАБОТЧИКИ СОБЫТИЙ ===
    function handleLibraryClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Скрываем индикаторы прибыли
        if (window.hideProfitIndicators) {
            window.hideProfitIndicators();
        }
        
        // Запускаем анимацию приближения
        if (window.zoomToBuilding) {
            window.zoomToBuilding('library', LIBRARY_CONFIG.name);
        } else {
            // Если анимация недоступна, открываем панель напрямую
            openLibraryPanel();
        }
    }
    
    function handleLibraryTouch(event) {
        event.preventDefault();
        handleLibraryClick(event);
    }
    
    // === ПАНЕЛЬ БИБЛИОТЕКИ ===
    function openLibraryPanel() {
        // Закрываем предыдущую панель
        if (window.closeBuildingPanel) {
            window.closeBuildingPanel();
        }
        
        // Создаем панель
        const panel = createLibraryPanel();
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
    
    function createLibraryPanel() {
        const panel = document.createElement('div');
        panel.className = 'building-panel';
        panel.id = 'building-panel';
        
        // Получаем актуальные данные
        const accumulatedProfit = calculateAccumulatedProfit();
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        const canUpgrade = playerMoney >= libraryData.upgradeCost;
        const canCollect = accumulatedProfit > 0;
        const canHire = libraryData.workers < libraryData.maxWorkers && playerMoney >= 5000;
        
        // Получаем назначенного сотрудника
        const assignedEmployee = window.getEmpByBuilding ? window.getEmpByBuilding('library') : null;
        
        panel.innerHTML = `
            <div class="building-panel-container">
                <!-- Заголовок -->
                <div class="building-panel-header">
                    <div class="building-panel-title">
                        <img src="${LIBRARY_CONFIG.icon}" alt="${LIBRARY_CONFIG.name}" class="building-icon">
                        <h2>${LIBRARY_CONFIG.name}</h2>
                    </div>
                    <button class="close-btn" onclick="closeLibraryPanel()">×</button>
                </div>
                
                <!-- Основная информация -->
                <div class="building-panel-content">
                    <!-- Карточка дохода -->
                    <div class="income-card">
                        <div class="card-header">
                            <h3>Доход</h3>
                            <div class="level-badge">Уровень ${libraryData.level}</div>
                        </div>
                        
                        <div class="income-info">
                            <div class="income-amount">
                                <span class="income-value">${formatNumber(libraryData.income)}</span>
                                <span class="income-period">/час</span>
                            </div>
                            
                            <div class="profit-info">
                                <div class="profit-label">Накоплено:</div>
                                <div class="profit-amount">${formatNumber(accumulatedProfit)}</div>
                            </div>
                        </div>
                        
                        <!-- Кнопка сбора -->
                        <button class="collect-btn ${canCollect ? 'active' : 'disabled'}" 
                                onclick="collectLibraryIncome()" 
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
                                <span class="cost-amount">${formatNumber(libraryData.upgradeCost)}</span>
                            </div>
                        </div>
                        
                        <button class="upgrade-btn ${canUpgrade ? 'active' : 'disabled'}" 
                                onclick="upgradeLibrary()" 
                                ${!canUpgrade ? 'disabled' : ''}>
                            <span>Улучшить</span>
                            <div class="cost-display">
                                <img src="assets/svg/money-icon.svg" alt="Cost">
                                <span>${formatNumber(libraryData.upgradeCost)}</span>
                            </div>
                        </button>
                    </div>
                    
                    <!-- Карточка сотрудников -->
                    <div class="employee-card">
                        <div class="card-header">
                            <h3>Сотрудники</h3>
                            <div class="employee-count">${libraryData.workers}/${libraryData.maxWorkers}</div>
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
                        
                        <button class="employee-btn" onclick="openEmployeeAssignment('library')">
                            ${assignedEmployee ? 'Сменить сотрудника' : 'Назначить сотрудника'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        return panel;
    }
    
    // === ФУНКЦИИ УПРАВЛЕНИЯ ===
    function collectLibraryIncome() {
        const accumulatedProfit = calculateAccumulatedProfit();
        
        if (accumulatedProfit > 0) {
            // Добавляем деньги к балансу
            if (window.setPlayerMoney && window.getPlayerMoney) {
                const currentMoney = window.getPlayerMoney();
                window.setPlayerMoney(currentMoney + accumulatedProfit);
            }
            
            // Сбрасываем накопленную прибыль
            libraryData.accumulatedProfit = 0;
            libraryData.lastCollectTime = Date.now();
            
            // Сохраняем данные
            saveLibraryData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification(`💰 Получено ${formatNumber(accumulatedProfit)}`, 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openLibraryPanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Нет денег для получения!', 'error');
            }
        }
    }
    
    function upgradeLibrary() {
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        
        if (playerMoney >= libraryData.upgradeCost) {
            // Списываем деньги
            if (window.setPlayerMoney) {
                window.setPlayerMoney(playerMoney - libraryData.upgradeCost);
            }
            
            // Улучшаем здание
            libraryData.level++;
            libraryData.income = Math.floor(libraryData.income * 1.5);
            libraryData.upgradeCost = Math.floor(libraryData.upgradeCost * 2);
            
            // Сохраняем данные
            saveLibraryData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification(`🏗️ Библиотека улучшена до уровня ${libraryData.level}!`, 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openLibraryPanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Недостаточно денег для улучшения!', 'error');
            }
        }
    }
    
    // === РАСЧЕТ ПРИБЫЛИ ===
    function calculateAccumulatedProfit() {
        if (!libraryData.isOwned) return 0;
        
        // Если lastCollectTime не установлен, прибыль не накапливается
        if (!libraryData.lastCollectTime) return 0;
        
        const currentTime = Date.now();
        const timeDiff = currentTime - libraryData.lastCollectTime;
        const hoursPassed = timeDiff / (1000 * 60 * 60);
        
        // Базовый доход в час с учетом работников
        const hourlyIncome = libraryData.income * (1 + libraryData.workers * LIBRARY_CONFIG.workerBonus);
        
        // Рассчитываем накопленную прибыль
        const newProfit = hourlyIncome * hoursPassed;
        
        return Math.floor(libraryData.accumulatedProfit + newProfit);
    }
    
    // === СОХРАНЕНИЕ И ЗАГРУЗКА ===
    function saveLibraryData() {
        localStorage.setItem('libraryData', JSON.stringify(libraryData));
    }
    
    function loadLibraryData() {
        const saved = localStorage.getItem('libraryData');
        if (saved) {
            const parsed = JSON.parse(saved);
            libraryData = { ...libraryData, ...parsed };
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
    
    function closeLibraryPanel() {
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
    window.initLibraryBuilding = initLibraryBuilding;
    window.collectLibraryIncome = collectLibraryIncome;
    window.upgradeLibrary = upgradeLibrary;
    window.closeLibraryPanel = closeLibraryPanel;
    window.openEmployeeAssignment = function(building) {
        if (window.openAssignOverlay) {
            window.openAssignOverlay(building);
        }
    };
    
    // === АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ ===
    document.addEventListener('DOMContentLoaded', function() {
        // Инициализируем библиотеку после загрузки DOM
        setTimeout(initLibraryBuilding, 100);
    });
    
})();
