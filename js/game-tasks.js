// Game Tasks Panel Handlers
// Флаг для отслеживания инициализации игровых заданий
let gameTasksInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    // Предотвращаем повторную инициализацию
        if (gameTasksInitialized) {
            return;
        }
    // Добавляем новую панель в глобальную функцию isAnyPanelOpen
    if (window.isAnyPanelOpen) {
        const originalFunction = window.isAnyPanelOpen;
        window.isAnyPanelOpen = function() {
            const panels = [
                'shop-panel',
                'characters-panel', 
                'city-panel',
                'tasks-panel',
                'profile-panel',
                'friends-panel',
        
                'game-tasks-panel'
            ];
            
            return panels.some(panelId => {
                const panel = document.getElementById(panelId);
                return panel && panel.style.display !== 'none';
            });
        };
    }
    
    // Закрытие панели игровых заданий
    const gameTasksClose = document.getElementById('game-tasks-close');
    const gameTasksPanel = document.getElementById('game-tasks-panel');
    if (gameTasksClose && gameTasksPanel) {
        gameTasksClose.addEventListener('click', () => {
            if (window.hidePanelWithAnimation) {
                window.hidePanelWithAnimation('game-tasks-panel', () => {
                    // Сбрасываем подсветку кнопки
                    if (window.clearActiveSideButton) {
                        window.clearActiveSideButton();
                    }
                });
            } else {
            gameTasksPanel.style.display = 'none';
                // Сбрасываем подсветку кнопки
                if (window.clearActiveSideButton) {
                    window.clearActiveSideButton();
                }
                        // Показываем индикаторы прибыли после закрытия панели
        if (window.updateProfitIndicators) {
            setTimeout(() => {
                window.updateProfitIndicators();
            }, 100);
        }
        
        // Дополнительная проверка через 200ms для надежности
        setTimeout(() => {
            if (window.updateProfitIndicators) {
                window.updateProfitIndicators();
            }
        }, 200);
            }
        });
    }
    
    // Обработчик кнопки "Получить все награды" (отключен)
    // const btnGetAllRewards = document.getElementById('btn-get-all-rewards');
    // if (btnGetAllRewards) {
    //     btnGetAllRewards.addEventListener('click', () => {
    //         // Кнопка удалена - теперь здесь будут SVG элементы
    //     });
    // }
    
    // Инициализируем отображение заданий при загрузке страницы
    renderGameTasks();
    
    // Запускаем периодическую проверку выполнения заданий
    setInterval(checkTasksCompletion, 2000); // Проверяем каждые 2 секунды
    
    gameTasksInitialized = true;
});

// Система отслеживания выполнения заданий
const TASK_KEYS = {
    EARN_100: 'task_earn_100',
    EARN_300: 'task_earn_300', 
    EARN_500: 'task_earn_500',
    HIRE_REGGI: 'task_hire_reggi',
    DELIVER_MAGAZINES: 'task_deliver_magazines',
    PRINT_BOOK: 'task_print_book'
};

// Функция для получения данных заданий с учетом сохраненного прогресса
function getGameTasksData() {
    const currentBalance = window.getBalance ? window.getBalance() : parseFloat(localStorage.getItem('balance') || '100');
    const hasReggi = localStorage.getItem('hasReggi') === 'true';
    const hasDeliveredMagazines = localStorage.getItem('hasDeliveredMagazines') === 'true';
    const hasPrintedBook = localStorage.getItem('hasPrintedBook') === 'true';
    
    // Получаем сохраненный прогресс для денежных заданий
    const earn100Progress = parseFloat(localStorage.getItem('task_progress_earn_100') || '0');
    const earn300Progress = parseFloat(localStorage.getItem('task_progress_earn_300') || '0');
    const earn500Progress = parseFloat(localStorage.getItem('task_progress_earn_500') || '0');
    
    return [
        {
            id: TASK_KEYS.EARN_100,
            title: 'Заработать 100$',
            description: 'Накопите 100 долларов для получения награды',
            reward: '5 000',
            progress: Math.min(currentBalance, 100),
            target: 100,
            status: getTaskStatus(TASK_KEYS.EARN_100, currentBalance >= 100)
        },
        {
            id: TASK_KEYS.EARN_300,
            title: 'Заработать 300$',
            description: 'Накопите 300 долларов для получения награды',
            reward: '15 000',
            progress: Math.min(currentBalance, 300),
            target: 300,
            status: getTaskStatus(TASK_KEYS.EARN_300, currentBalance >= 300)
        },
        {
            id: TASK_KEYS.HIRE_REGGI,
            title: 'Нанять Реджи',
            description: 'Наймите персонажа Реджи в свою команду',
            reward: '10 000',
            progress: hasReggi ? 1 : 0,
            target: 1,
            status: getTaskStatus(TASK_KEYS.HIRE_REGGI, hasReggi)
        },
        {
            id: TASK_KEYS.DELIVER_MAGAZINES,
            title: 'Доставить журналы в библиотеку',
            description: 'Доставьте журналы в библиотеку для получения награды',
            reward: '3 000',
            progress: hasDeliveredMagazines ? 1 : 0,
            target: 1,
            status: getTaskStatus(TASK_KEYS.DELIVER_MAGAZINES, hasDeliveredMagazines)
        },
        {
            id: TASK_KEYS.PRINT_BOOK,
            title: 'Напечатать книгу',
            description: 'Создайте и напечатайте свою первую книгу',
            reward: '10 000',
            progress: hasPrintedBook ? 1 : 0,
            target: 1,
            status: getTaskStatus(TASK_KEYS.PRINT_BOOK, hasPrintedBook)
        },
        {
            id: TASK_KEYS.EARN_500,
            title: 'Заработать 500$',
            description: 'Накопите 500 долларов для получения награды',
            reward: '20 000',
            progress: Math.min(currentBalance, 500),
            target: 500,
            status: getTaskStatus(TASK_KEYS.EARN_500, currentBalance >= 500)
        }
    ];
}

// Функция для получения статуса задания
function getTaskStatus(taskKey, isCompleted) {
    const wasClaimed = localStorage.getItem(`task_claimed_${taskKey}`) === 'true';
    const wasCompleted = localStorage.getItem(`task_completed_${taskKey}`) === 'true';
    
    if (wasClaimed) return 'claimed';
    if (wasCompleted) return 'completed';
    if (isCompleted) return 'completed';
    return 'pending';
}

// Функция для проверки выполнения заданий
function checkTasksCompletion() {
    const currentBalance = window.getBalance ? window.getBalance() : parseFloat(localStorage.getItem('balance') || '100');
    const hasReggi = localStorage.getItem('hasReggi') === 'true';
    const hasDeliveredMagazines = localStorage.getItem('hasDeliveredMagazines') === 'true';
    const hasPrintedBook = localStorage.getItem('hasPrintedBook') === 'true';
    
    let hasUpdates = false;
    
    // Проверяем денежные задания
    if (currentBalance >= 100 && localStorage.getItem(`task_completed_${TASK_KEYS.EARN_100}`) !== 'true') {
        localStorage.setItem(`task_completed_${TASK_KEYS.EARN_100}`, 'true');
        hasUpdates = true;
    }
    
    if (currentBalance >= 300 && localStorage.getItem(`task_completed_${TASK_KEYS.EARN_300}`) !== 'true') {
        localStorage.setItem(`task_completed_${TASK_KEYS.EARN_300}`, 'true');
        hasUpdates = true;
    }
    
    if (currentBalance >= 500 && localStorage.getItem(`task_completed_${TASK_KEYS.EARN_500}`) !== 'true') {
        localStorage.setItem(`task_completed_${TASK_KEYS.EARN_500}`, 'true');
        hasUpdates = true;
    }
    
    // Проверяем остальные задания
    if (hasReggi && localStorage.getItem(`task_completed_${TASK_KEYS.HIRE_REGGI}`) !== 'true') {
        localStorage.setItem(`task_completed_${TASK_KEYS.HIRE_REGGI}`, 'true');
        hasUpdates = true;
    }
    
    if (hasDeliveredMagazines && localStorage.getItem(`task_completed_${TASK_KEYS.DELIVER_MAGAZINES}`) !== 'true') {
        localStorage.setItem(`task_completed_${TASK_KEYS.DELIVER_MAGAZINES}`, 'true');
        hasUpdates = true;
    }
    
    if (hasPrintedBook && localStorage.getItem(`task_completed_${TASK_KEYS.PRINT_BOOK}`) !== 'true') {
        localStorage.setItem(`task_completed_${TASK_KEYS.PRINT_BOOK}`, 'true');
        hasUpdates = true;
    }
    
    // Если есть обновления, перерисовываем панель заданий
    if (hasUpdates) {
        renderGameTasks();
        // Также обновляем счетчики отдельно
        const tasks = getGameTasksData();
        updateTaskCounters(tasks);
    }
}

// Функция для отметки задания как выполненного
function markTaskAsCompleted(taskId) {
    localStorage.setItem(`task_completed_${taskId}`, 'true');
    renderGameTasks();
    // Обновляем счетчики
    const tasks = getGameTasksData();
    updateTaskCounters(tasks);
}

// Функция для отметки задания как полученного
function markTaskAsClaimed(taskId) {
    localStorage.setItem(`task_claimed_${taskId}`, 'true');
    renderGameTasks();
    // Обновляем счетчики
    const tasks = getGameTasksData();
    updateTaskCounters(tasks);
}

// Функция для рендеринга игровых заданий
function renderGameTasks() {
    const container = document.getElementById('game-tasks-list');
    if (!container) return;
    
    // Получаем данные заданий
    const tasks = getGameTasksData();
    
    // Очищаем контейнер
    container.innerHTML = '';
    
    // Создаем карточки для каждого задания
    tasks.forEach(task => {
        const taskCard = document.createElement('div');
        taskCard.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 4px 16px;
            margin-bottom: 4px;
            border-radius: 25px;
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            height: 28px;
            overflow: hidden;
        `;
        
        // Определяем стили в зависимости от статуса
        let backgroundColor, borderColor, statusText, statusColor, statusIcon;
        
        if (task.status === 'completed' || task.status === 'claimed') {
            // Фиолетовый фон для выполненных заданий
            backgroundColor = 'linear-gradient(135deg, #9c27b0, #673ab7)';
            borderColor = 'rgba(156, 39, 176, 0.3)';
            statusText = 'Завершено';
            statusColor = '#fff';
            statusIcon = '✓';
        } else {
            // Темный фон для невыполненных заданий
            backgroundColor = 'linear-gradient(135deg, #424242, #2d2d2d)';
            borderColor = 'rgba(255,255,255,0.1)';
            statusText = 'Перейти';
            statusColor = '#fff';
            statusIcon = '⏱';
        }
        
        taskCard.style.background = backgroundColor;
        taskCard.style.border = `1px solid ${borderColor}`;
        
        // Добавляем hover эффект
        taskCard.onmouseenter = () => {
            taskCard.style.transform = 'translateY(-2px)';
            taskCard.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
        };
        
        taskCard.onmouseleave = () => {
            taskCard.style.transform = 'translateY(0)';
            taskCard.style.boxShadow = 'none';
        };
        
        // Создаем содержимое карточки в соответствии с дизайном
        taskCard.innerHTML = `
            <!-- Центральная часть - название задания -->
            <div style="flex: 1; text-align: left;">
                <div style="
                    font-size: 10px;
                    font-weight: 500;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    color: #fff;
                    line-height: 1.2;
                    letter-spacing: 0.2px;
                ">
                    ${task.title}
                </div>
            </div>
            
            <!-- Правая часть - награда -->
            <div style="
                display: flex; 
                align-items: center; 
                gap: 3px; 
                min-width: 50px; 
                justify-content: flex-end;
                background: rgba(0,0,0,0.8);
                border-radius: 15px;
                padding: 2px 6px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                margin-left: auto;
            ">
                <div style="
                    font-size: 9px;
                    font-weight: 700;
                    color: #fff;
                ">
                    ${task.reward}
                </div>
                <div style="
                    width: 12px;
                    height: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                ">
                    <img src="assets/svg/money-icon.svg" alt="Money" style="width:12px;height:12px;">
                </div>
            </div>
        `;
        
        // Добавляем обработчик клика на всю карточку
        taskCard.onclick = () => {
            if (task.status === 'completed') {
                claimTaskReward(task);
            }
        };
        
        container.appendChild(taskCard);
    });
    
    // Обновляем счетчики
    updateTaskCounters(tasks);
}

// Функция для получения награды за задание
function claimTaskReward(task) {
    // Отмечаем задание как полученное
    markTaskAsClaimed(task.id);
    
    // Добавляем награду к балансу денег
    const rewardValue = parseInt(task.reward.replace(/\s/g, '')); // Убираем пробелы
    
    if (window.setBalance && window.getBalance) {
        const currentBalance = window.getBalance();
        window.setBalance(currentBalance + rewardValue);
    }
    

    
    // Перерисовываем панель
    renderGameTasks();
}



// Функция для обновления счетчиков заданий
function updateTaskCounters(tasks) {
    const completedCount = tasks.filter(task => task.status === 'completed' || task.status === 'claimed').length;
    const totalCount = tasks.length;
    
    // Находим счетчики в панели заданий
    const gameTasksPanel = document.getElementById('game-tasks-panel');
    if (gameTasksPanel) {
        // Ищем счетчики по содержимому родительского элемента
        const counterContainers = gameTasksPanel.querySelectorAll('div[style*="text-align:center"]');
        
        counterContainers.forEach(container => {
            const label = container.querySelector('div[style*="font-size:10px"]');
            const counter = container.querySelector('div[style*="font-size:20px"]');
            
            if (label && counter) {
                if (label.textContent.includes('выполнено')) {
                    counter.textContent = completedCount;
                } else if (label.textContent.includes('доступно')) {
                    counter.textContent = totalCount;
                }
            }
        });
    }
}

// Делаем функции глобально доступными
window.renderGameTasks = renderGameTasks;
window.calculateTotalReward = calculateTotalReward;
window.updateTotalReward = updateTotalReward;
window.markCompletedTasksAsClaimed = markCompletedTasksAsClaimed;
window.claimTaskReward = claimTaskReward;

// Функции для интеграции с игровыми событиями
window.markTaskAsCompleted = markTaskAsCompleted;
window.markTaskAsClaimed = markTaskAsClaimed;
window.checkTasksCompletion = checkTasksCompletion;

// Функции для конкретных игровых событий
window.onMoneyEarned = function(amount) {
    // Вызывается при получении денег
    checkTasksCompletion();
};

window.onReggiHired = function() {
    // Вызывается при найме Реджи
    localStorage.setItem('hasReggi', 'true');
    markTaskAsCompleted(TASK_KEYS.HIRE_REGGI);
};

window.onSofaBought = function() {
    // Вызывается при покупке дивана
    localStorage.setItem('hasSofa', 'true');
    markTaskAsCompleted(TASK_KEYS.BUY_SOFA);
};

window.onBookPrinted = function() {
    // Вызывается при печати книги
    localStorage.setItem('hasPrintedBook', 'true');
    markTaskAsCompleted(TASK_KEYS.PRINT_BOOK);
};

// Тестовые функции для разработки
window.testTaskSystem = {
    // Сбросить все задания
    resetAll: function() {
        Object.values(TASK_KEYS).forEach(key => {
            localStorage.removeItem(`task_completed_${key}`);
            localStorage.removeItem(`task_claimed_${key}`);
        });
        localStorage.removeItem('hasReggi');
        localStorage.removeItem('hasDeliveredMagazines');
        localStorage.removeItem('hasPrintedBook');
        localStorage.removeItem('gameTasksRewardsClaimed');
        renderGameTasks();
        // Обновляем счетчики
        const tasks = getGameTasksData();
        updateTaskCounters(tasks);
        alert('Все задания сброшены!');
    },
    
    // Симулировать выполнение всех заданий
    completeAll: function() {
        // Устанавливаем баланс для денежных заданий
        if (window.setBalance) {
            window.setBalance(1000); // Больше 500 для выполнения всех денежных заданий
        }
        
        // Отмечаем остальные задания как выполненные
        localStorage.setItem('hasReggi', 'true');
        localStorage.setItem('hasDeliveredMagazines', 'true');
        localStorage.setItem('hasPrintedBook', 'true');
        
        // Отмечаем задания как выполненные
        Object.values(TASK_KEYS).forEach(key => {
            localStorage.setItem(`task_completed_${key}`, 'true');
        });
        
        renderGameTasks();
        // Обновляем счетчики
        const tasks = getGameTasksData();
        updateTaskCounters(tasks);
        alert('Все задания выполнены!');
    },
    
    // Симулировать получение всех наград
    claimAll: function() {
        Object.values(TASK_KEYS).forEach(key => {
            localStorage.setItem(`task_claimed_${key}`, 'true');
        });
        renderGameTasks();
        // Обновляем счетчики
        const tasks = getGameTasksData();
        updateTaskCounters(tasks);
        alert('Все награды получены!');
    }
};

// Функция для расчета общей суммы наград
function calculateTotalReward() {
    const gameTasks = getGameTasksData();
    
    let total = 0;
    gameTasks.forEach(task => {
        // Проверяем, что задание выполнено, но еще не получено
        const isCompleted = localStorage.getItem(`task_completed_${task.id}`) === 'true';
        const isClaimed = localStorage.getItem(`task_claimed_${task.id}`) === 'true';
        
        if (isCompleted && !isClaimed) {
            // Конвертируем строки в числа (убираем 'k' и умножаем на 1000)
            const rewardValue = task.reward.includes('k') 
                ? parseInt(task.reward.replace('k', '')) * 1000 
                : parseInt(task.reward);
            total += rewardValue;
        }
    });
    
    // Форматируем результат обратно в формат с 'k'
    return total >= 1000 ? `${Math.floor(total / 1000)}k` : total.toString();
} 

// Функция для обновления суммы наград в кнопке (отключена)
function updateTotalReward() {
    // Функция отключена - кнопка "Получить все награды" удалена
    // Теперь здесь будут SVG элементы
}

// Функция для отметки завершенных заданий как полученных (устарела)
function markCompletedTasksAsClaimed() {
    // Эта функция больше не используется, так как теперь каждое задание отмечается индивидуально
} 