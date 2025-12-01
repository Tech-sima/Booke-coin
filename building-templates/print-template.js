/**
 * ШАБЛОН ТИПОГРАФИИ (PRINT)
 * Полный функционал типографии для внедрения в новую карту
 * Включает систему печати книг и журналов с прогрессом
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * 1. Подключите этот файл в HTML
 * 2. Вызовите initPrintBuilding() после загрузки DOM
 * 3. Настройте координаты интерактивной зоны под новую карту
 */

(function() {
    'use strict';
    
    // === КОНФИГУРАЦИЯ ТИПОГРАФИИ ===
    const PRINT_CONFIG = {
        name: 'Типография',
        type: 'print',
        icon: 'assets/svg/city-panel/typography.svg',
        // КООРДИНАТЫ ДЛЯ НОВОЙ КАРТЫ - НАСТРОЙТЕ ПОД ВАШУ КАРТУ
        zone: {
            left: '45%',      // Позиция слева
            top: '55%',       // Позиция сверху
            width: '10%',     // Ширина зоны
            height: '15%'     // Высота зоны
        },
        // Базовые параметры
        baseIncome: 5000,
        baseUpgradeCost: 10000,
        maxWorkers: 3,
        workerBonus: 0.2, // 20% бонус за работника
        purchaseCost: 25000,
        // Параметры печати
        printCost: 15000,
        printTime: 30, // минут
        expediteCost: 5000,
        expediteTime: 5 // минут
    };
    
    // === ДАННЫЕ ТИПОГРАФИИ ===
    let printData = {
        level: 1,
        income: PRINT_CONFIG.baseIncome,
        workers: 0,
        maxWorkers: PRINT_CONFIG.maxWorkers,
        upgradeCost: PRINT_CONFIG.baseUpgradeCost,
        lastCollectTime: null,
        accumulatedProfit: 0,
        isOwned: false,
        purchaseCost: PRINT_CONFIG.purchaseCost,
        name: PRINT_CONFIG.name,
        // Данные печати
        isPrinting: false,
        printStartTime: 0,
        printTotalTime: PRINT_CONFIG.printTime * 60 * 1000, // в миллисекундах
        isExpedited: false,
        currentPrintType: 'books', // 'books' или 'magazines'
        currentPrintQuantity: 1
    };
    
    // === ИНИЦИАЛИЗАЦИЯ ===
    function initPrintBuilding() {
        // Загружаем сохраненные данные
        loadPrintData();
        
        // Создаем интерактивную зону
        createPrintZone();
        
        // Инициализируем панель
        initPrintPanel();
        
        // Запускаем систему печати
        startPrintSystem();
        
    }
    
    // === СОЗДАНИЕ ИНТЕРАКТИВНОЙ ЗОНЫ ===
    function createPrintZone() {
        // Удаляем старую зону если есть
        const oldZone = document.getElementById('zone-print');
        if (oldZone) {
            oldZone.remove();
        }
        
        // Создаем новую зону
        const zone = document.createElement('div');
        zone.className = 'building-zone';
        zone.id = 'zone-print';
        zone.dataset.building = 'print';
        zone.title = PRINT_CONFIG.name;
        zone.textContent = '1'; // Номер здания
        
        // Настраиваем позицию
        zone.style.left = PRINT_CONFIG.zone.left;
        zone.style.top = PRINT_CONFIG.zone.top;
        zone.style.width = PRINT_CONFIG.zone.width;
        zone.style.height = PRINT_CONFIG.zone.height;
        
        // Добавляем обработчики событий
        zone.addEventListener('click', handlePrintClick);
        zone.addEventListener('touchstart', handlePrintTouch, { passive: true });
        zone.setAttribute('data-handlers-added', 'true');
        
        // Добавляем в контейнер карты
        const mapContainer = document.getElementById('map-container');
        if (mapContainer) {
            mapContainer.appendChild(zone);
        }
    }
    
    // === ОБРАБОТЧИКИ СОБЫТИЙ ===
    function handlePrintClick(event) {
        event.preventDefault();
        event.stopPropagation();
        
        // Скрываем индикаторы прибыли
        if (window.hideProfitIndicators) {
            window.hideProfitIndicators();
        }
        
        // Запускаем анимацию приближения
        if (window.zoomToBuilding) {
            window.zoomToBuilding('print', PRINT_CONFIG.name);
        } else {
            // Если анимация недоступна, открываем панель напрямую
            openPrintPanel();
        }
    }
    
    function handlePrintTouch(event) {
        event.preventDefault();
        handlePrintClick(event);
    }
    
    // === ПАНЕЛЬ ТИПОГРАФИИ ===
    function openPrintPanel() {
        // Закрываем предыдущую панель
        if (window.closeBuildingPanel) {
            window.closeBuildingPanel();
        }
        
        // Создаем панель
        const panel = createPrintPanel();
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
    
    function createPrintPanel() {
        const panel = document.createElement('div');
        panel.className = 'building-panel';
        panel.id = 'building-panel';
        
        // Получаем актуальные данные
        const accumulatedProfit = calculateAccumulatedProfit();
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        const canUpgrade = playerMoney >= printData.upgradeCost;
        const canCollect = accumulatedProfit > 0;
        const canHire = printData.workers < printData.maxWorkers && playerMoney >= 5000;
        const canBuy = !printData.isOwned && playerMoney >= printData.purchaseCost;
        const canPrint = !printData.isPrinting && playerMoney >= PRINT_CONFIG.printCost;
        
        // Получаем назначенного сотрудника
        const assignedEmployee = window.getEmpByBuilding ? window.getEmpByBuilding('print') : null;
        
        // Если здание не куплено, показываем панель покупки
        if (!printData.isOwned) {
            panel.innerHTML = `
                <div class="building-panel-container">
                    <!-- Заголовок -->
                    <div class="building-panel-header">
                        <div class="building-panel-title">
                            <img src="${PRINT_CONFIG.icon}" alt="${PRINT_CONFIG.name}" class="building-icon">
                            <h2>${PRINT_CONFIG.name}</h2>
                        </div>
                        <button class="close-btn" onclick="closePrintPanel()">×</button>
                    </div>
                    
                    <!-- Панель покупки -->
                    <div class="building-panel-content">
                        <div class="purchase-card">
                            <div class="purchase-info">
                                <h3>Купить ${PRINT_CONFIG.name}</h3>
                                <p>Печатное предприятие для производства печатной продукции</p>
                                
                                <div class="purchase-details">
                                    <div class="detail-item">
                                        <span>Стоимость:</span>
                                        <span class="cost">${formatNumber(printData.purchaseCost)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span>Доход в час:</span>
                                        <span class="income">${formatNumber(printData.income)}</span>
                                    </div>
                                    <div class="detail-item">
                                        <span>Макс. работников:</span>
                                        <span class="workers">${printData.maxWorkers}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <button class="purchase-btn ${canBuy ? 'active' : 'disabled'}" 
                                    onclick="buyPrint()" 
                                    ${!canBuy ? 'disabled' : ''}>
                                <span>Купить за ${formatNumber(printData.purchaseCost)}</span>
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
                            <img src="${PRINT_CONFIG.icon}" alt="${PRINT_CONFIG.name}" class="building-icon">
                            <h2>${PRINT_CONFIG.name}</h2>
                        </div>
                        <button class="close-btn" onclick="closePrintPanel()">×</button>
                    </div>
                    
                    <!-- Основная информация -->
                    <div class="building-panel-content">
                        <!-- Карточка дохода -->
                        <div class="income-card">
                            <div class="card-header">
                                <h3>Доход</h3>
                                <div class="level-badge">Уровень ${printData.level}</div>
                            </div>
                            
                            <div class="income-info">
                                <div class="income-amount">
                                    <span class="income-value">${formatNumber(printData.income)}</span>
                                    <span class="income-period">/час</span>
                                </div>
                                
                                <div class="profit-info">
                                    <div class="profit-label">Накоплено:</div>
                                    <div class="profit-amount">${formatNumber(accumulatedProfit)}</div>
                                </div>
                            </div>
                            
                            <!-- Кнопка сбора -->
                            <button class="collect-btn ${canCollect ? 'active' : 'disabled'}" 
                                    onclick="collectPrintIncome()" 
                                    ${!canCollect ? 'disabled' : ''}>
                                <span>Собрать</span>
                                <img src="assets/svg/money-icon.svg" alt="Collect">
                            </button>
                        </div>
                        
                        <!-- Карточка печати -->
                        <div class="print-card">
                            <div class="card-header">
                                <h3>Печать</h3>
                                <div class="print-status ${printData.isPrinting ? 'printing' : 'idle'}">
                                    ${printData.isPrinting ? 'Печатает' : 'Готова'}
                                </div>
                            </div>
                            
                            ${printData.isPrinting ? `
                                <div class="print-progress">
                                    <div class="progress-info">
                                        <div class="progress-type">${printData.currentPrintType === 'books' ? 'Книги' : 'Журналы'}</div>
                                        <div class="progress-quantity">${printData.currentPrintQuantity} шт.</div>
                                    </div>
                                    
                                    <div class="progress-bar">
                                        <div class="progress-fill" id="print-progress-fill"></div>
                                    </div>
                                    
                                    <div class="progress-time">
                                        <span id="print-time-left">0 мин.</span>
                                    </div>
                                    
                                    <div class="print-actions">
                                        <button class="expedite-btn" onclick="expeditePrint()">
                                            Ускорить за ${formatNumber(PRINT_CONFIG.expediteCost)}
                                        </button>
                                    </div>
                                </div>
                            ` : `
                                <div class="print-menu">
                                    <div class="print-options">
                                        <div class="print-type-selector">
                                            <label>
                                                <input type="radio" name="print-type" value="books" checked>
                                                <span>Книги</span>
                                            </label>
                                            <label>
                                                <input type="radio" name="print-type" value="magazines">
                                                <span>Журналы</span>
                                            </label>
                                        </div>
                                        
                                        <div class="print-quantity-selector">
                                            <label>Количество:</label>
                                            <select id="print-quantity">
                                                <option value="1">1 шт.</option>
                                                <option value="2">2 шт.</option>
                                                <option value="3">3 шт.</option>
                                                <option value="5">5 шт.</option>
                                                <option value="10">10 шт.</option>
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <button class="start-print-btn ${canPrint ? 'active' : 'disabled'}" 
                                            onclick="startPrint()" 
                                            ${!canPrint ? 'disabled' : ''}>
                                        <span>Начать печать</span>
                                        <div class="cost-display">
                                            <img src="assets/svg/money-icon.svg" alt="Cost">
                                            <span>${formatNumber(PRINT_CONFIG.printCost)}</span>
                                        </div>
                                    </button>
                                </div>
                            `}
                        </div>
                        
                        <!-- Карточка улучшения -->
                        <div class="upgrade-card">
                            <div class="card-header">
                                <h3>Улучшение</h3>
                            </div>
                            
                            <div class="upgrade-info">
                                <div class="upgrade-cost">
                                    <span>Стоимость:</span>
                                    <span class="cost-amount">${formatNumber(printData.upgradeCost)}</span>
                                </div>
                            </div>
                            
                            <button class="upgrade-btn ${canUpgrade ? 'active' : 'disabled'}" 
                                    onclick="upgradePrint()" 
                                    ${!canUpgrade ? 'disabled' : ''}>
                                <span>Улучшить</span>
                                <div class="cost-display">
                                    <img src="assets/svg/money-icon.svg" alt="Cost">
                                    <span>${formatNumber(printData.upgradeCost)}</span>
                                </div>
                            </button>
                        </div>
                        
                        <!-- Карточка сотрудников -->
                        <div class="employee-card">
                            <div class="card-header">
                                <h3>Сотрудники</h3>
                                <div class="employee-count">${printData.workers}/${printData.maxWorkers}</div>
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
                            
                            <button class="employee-btn" onclick="openEmployeeAssignment('print')">
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
    function buyPrint() {
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        
        if (playerMoney >= printData.purchaseCost) {
            // Списываем деньги
            if (window.setPlayerMoney) {
                window.setPlayerMoney(playerMoney - printData.purchaseCost);
            }
            
            // Покупаем здание
            printData.isOwned = true;
            printData.lastCollectTime = Date.now();
            
            // Сохраняем данные
            savePrintData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification(`🎉 Поздравляем! Вы купили ${PRINT_CONFIG.name}!`, 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openPrintPanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Недостаточно денег для покупки!', 'error');
            }
        }
    }
    
    function collectPrintIncome() {
        const accumulatedProfit = calculateAccumulatedProfit();
        
        if (accumulatedProfit > 0) {
            // Добавляем деньги к балансу
            if (window.setPlayerMoney && window.getPlayerMoney) {
                const currentMoney = window.getPlayerMoney();
                window.setPlayerMoney(currentMoney + accumulatedProfit);
            }
            
            // Сбрасываем накопленную прибыль
            printData.accumulatedProfit = 0;
            printData.lastCollectTime = Date.now();
            
            // Сохраняем данные
            savePrintData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification(`💰 Получено ${formatNumber(accumulatedProfit)}`, 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openPrintPanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Нет денег для получения!', 'error');
            }
        }
    }
    
    function upgradePrint() {
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        
        if (playerMoney >= printData.upgradeCost) {
            // Списываем деньги
            if (window.setPlayerMoney) {
                window.setPlayerMoney(playerMoney - printData.upgradeCost);
            }
            
            // Улучшаем здание
            printData.level++;
            printData.income = Math.floor(printData.income * 1.5);
            printData.upgradeCost = Math.floor(printData.upgradeCost * 2);
            
            // Сохраняем данные
            savePrintData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification(`🏗️ Типография улучшена до уровня ${printData.level}!`, 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openPrintPanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Недостаточно денег для улучшения!', 'error');
            }
        }
    }
    
    // === СИСТЕМА ПЕЧАТИ ===
    function startPrint() {
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        
        if (playerMoney >= PRINT_CONFIG.printCost) {
            // Списываем деньги
            if (window.setPlayerMoney) {
                window.setPlayerMoney(playerMoney - PRINT_CONFIG.printCost);
            }
            
            // Получаем параметры печати
            const printType = document.querySelector('input[name="print-type"]:checked').value;
            const quantity = parseInt(document.getElementById('print-quantity').value);
            
            // Устанавливаем параметры печати
            printData.isPrinting = true;
            printData.printStartTime = Date.now();
            printData.printTotalTime = PRINT_CONFIG.printTime * 60 * 1000;
            printData.isExpedited = false;
            printData.currentPrintType = printType;
            printData.currentPrintQuantity = quantity;
            
            // Сохраняем данные
            savePrintData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification('🖨️ Печать началась!', 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openPrintPanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Недостаточно денег для печати!', 'error');
            }
        }
    }
    
    function expeditePrint() {
        const playerMoney = window.getPlayerMoney ? window.getPlayerMoney() : 0;
        
        if (playerMoney >= PRINT_CONFIG.expediteCost && printData.isPrinting && !printData.isExpedited) {
            // Списываем деньги
            if (window.setPlayerMoney) {
                window.setPlayerMoney(playerMoney - PRINT_CONFIG.expediteCost);
            }
            
            // Ускоряем печать
            printData.isExpedited = true;
            printData.printTotalTime = PRINT_CONFIG.expediteTime * 60 * 1000;
            
            // Сохраняем данные
            savePrintData();
            
            // Показываем уведомление
            if (window.showNotification) {
                window.showNotification('⚡ Печать ускорена!', 'success');
            }
            
            // Обновляем панель
            setTimeout(() => {
                openPrintPanel();
            }, 100);
        } else {
            if (window.showNotification) {
                window.showNotification('❌ Недостаточно денег для ускорения!', 'error');
            }
        }
    }
    
    function startPrintSystem() {
        // Обновляем прогресс печати каждую секунду
        setInterval(() => {
            if (printData.isPrinting) {
                updatePrintProgress();
            }
        }, 1000);
    }
    
    function updatePrintProgress() {
        if (!printData.isPrinting) return;
        
        const currentTime = Date.now();
        const elapsed = currentTime - printData.printStartTime;
        const progress = Math.min(100, (elapsed / printData.printTotalTime) * 100);
        
        // Обновляем прогресс-бар
        const progressFill = document.getElementById('print-progress-fill');
        if (progressFill) {
            progressFill.style.width = progress + '%';
        }
        
        // Обновляем оставшееся время
        const timeLeft = document.getElementById('print-time-left');
        if (timeLeft) {
            const remaining = Math.max(0, printData.printTotalTime - elapsed);
            const minutes = Math.ceil(remaining / (60 * 1000));
            timeLeft.textContent = `${minutes} мин.`;
        }
        
        // Проверяем завершение печати
        if (elapsed >= printData.printTotalTime) {
            completePrint();
        }
    }
    
    function completePrint() {
        // Добавляем товары в склад
        if (printData.currentPrintType === 'books') {
            window.storedBooks = (window.storedBooks || 0) + printData.currentPrintQuantity;
        } else {
            window.storedMags = (window.storedMags || 0) + printData.currentPrintQuantity;
        }
        
        // Сбрасываем состояние печати
        printData.isPrinting = false;
        printData.printStartTime = 0;
        printData.isExpedited = false;
        
        // Сохраняем данные
        savePrintData();
        
        // Показываем уведомление
        if (window.showNotification) {
            window.showNotification(`✅ Печать завершена! Получено ${printData.currentPrintQuantity} ${printData.currentPrintType === 'books' ? 'книг' : 'журналов'}`, 'success');
        }
        
        // Обновляем панель
        setTimeout(() => {
            openPrintPanel();
        }, 100);
    }
    
    // === РАСЧЕТ ПРИБЫЛИ ===
    function calculateAccumulatedProfit() {
        if (!printData.isOwned) return 0;
        
        // Если lastCollectTime не установлен, прибыль не накапливается
        if (!printData.lastCollectTime) return 0;
        
        const currentTime = Date.now();
        const timeDiff = currentTime - printData.lastCollectTime;
        const hoursPassed = timeDiff / (1000 * 60 * 60);
        
        // Базовый доход в час с учетом работников
        const hourlyIncome = printData.income * (1 + printData.workers * PRINT_CONFIG.workerBonus);
        
        // Рассчитываем накопленную прибыль
        const newProfit = hourlyIncome * hoursPassed;
        
        return Math.floor(printData.accumulatedProfit + newProfit);
    }
    
    // === СОХРАНЕНИЕ И ЗАГРУЗКА ===
    function savePrintData() {
        localStorage.setItem('printData', JSON.stringify(printData));
    }
    
    function loadPrintData() {
        const saved = localStorage.getItem('printData');
        if (saved) {
            const parsed = JSON.parse(saved);
            printData = { ...printData, ...parsed };
            // Если здание не куплено, сбрасываем lastCollectTime
            if (!printData.isOwned) {
                printData.lastCollectTime = null;
                printData.accumulatedProfit = 0;
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
    
    function closePrintPanel() {
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
    window.initPrintBuilding = initPrintBuilding;
    window.buyPrint = buyPrint;
    window.collectPrintIncome = collectPrintIncome;
    window.upgradePrint = upgradePrint;
    window.closePrintPanel = closePrintPanel;
    window.startPrint = startPrint;
    window.expeditePrint = expeditePrint;
    window.openEmployeeAssignment = function(building) {
        if (window.openAssignOverlay) {
            window.openAssignOverlay(building);
        }
    };
    
    // === АВТОМАТИЧЕСКАЯ ИНИЦИАЛИЗАЦИЯ ===
    document.addEventListener('DOMContentLoaded', function() {
        // Инициализируем типографию после загрузки DOM
        setTimeout(initPrintBuilding, 100);
    });
    
})();
