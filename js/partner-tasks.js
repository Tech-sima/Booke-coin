// Partner Tasks System
// Флаг для отслеживания инициализации партнерских заданий
let partnerTasksInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    // Предотвращаем повторную инициализацию
        if (partnerTasksInitialized) {
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
    
    // Закрытие панели партнерских заданий
    const tasksClose = document.getElementById('tasks-close');
    const tasksPanel = document.getElementById('tasks-panel');
    if (tasksClose && tasksPanel) {
        tasksClose.addEventListener('click', () => {
            if (window.hidePanelWithAnimation) {
                window.hidePanelWithAnimation('tasks-panel', () => {
                    // Сбрасываем подсветку кнопки
                    if (window.clearActiveSideButton) {
                        window.clearActiveSideButton();
                    }
                });
            } else {
                tasksPanel.style.display = 'none';
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
    

    
    // Инициализируем отображение заданий при загрузке страницы
    renderPartnerTasks();
    // Периодическая проверка выполнения партнерских заданий
    setInterval(checkPartnerTasksCompletion, 3000);

    // Засчитываем задачу подписки на канал при возврате в приложение
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            const wasChannelLinkOpened = localStorage.getItem('partner_join_channel_clicked') === 'true';
            if (wasChannelLinkOpened && localStorage.getItem(`partner_task_completed_${PARTNER_TASK_KEYS.JOIN_PRISMAKOV}`) !== 'true') {
                markPartnerTaskAsCompleted(PARTNER_TASK_KEYS.JOIN_PRISMAKOV);
            }
        }
    });

    partnerTasksInitialized = true;
});

// Система отслеживания выполнения партнерских заданий
// Базовый URL для API: если фронтенд запущен на Live Server (порт 5500),
// используем отдельный PHP-сервер на 8001. Иначе — относительный путь.
const PARTNER_API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (location && location.port === '5500' ? 'http://127.0.0.1:8001/' : './');
const PARTNER_TASK_KEYS = {
    INVITE_FRIEND: 'partner_invite_friend',
    JOIN_PRISMAKOV: 'partner_join_prismakov'
};

// Функция для получения данных партнерских заданий
function getPartnerTasksData(category = 'social') {
    const inviteCompleted = localStorage.getItem(`partner_task_completed_${PARTNER_TASK_KEYS.INVITE_FRIEND}`) === 'true';
    const joinCompleted = localStorage.getItem(`partner_task_completed_${PARTNER_TASK_KEYS.JOIN_PRISMAKOV}`) === 'true';

    const socialTasks = [
        {
            id: PARTNER_TASK_KEYS.INVITE_FRIEND,
            title: 'Пригласи друга',
            description: 'Приведи нового игрока по реферальной ссылке',
            reward: '150 000',
            progress: inviteCompleted ? 1 : 0,
            target: 1,
            status: getPartnerTaskStatus(PARTNER_TASK_KEYS.INVITE_FRIEND, inviteCompleted)
        },
        {
            id: PARTNER_TASK_KEYS.JOIN_PRISMAKOV,
            title: "Присоединись к Prismakov's path",
            description: 'Открой канал и подпишись',
            reward: '50 000',
            progress: joinCompleted ? 1 : 0,
            target: 1,
            status: getPartnerTaskStatus(PARTNER_TASK_KEYS.JOIN_PRISMAKOV, joinCompleted)
        }
    ];

    const bookeTasks = [];

    return category === 'social' ? socialTasks : bookeTasks;
}

// Функция для получения статуса партнерского задания
function getPartnerTaskStatus(taskKey, isCompleted) {
    const wasClaimed = localStorage.getItem(`partner_task_claimed_${taskKey}`) === 'true';
    const wasCompleted = localStorage.getItem(`partner_task_completed_${taskKey}`) === 'true';
    
    if (wasClaimed) return 'claimed';
    if (wasCompleted) return 'completed';
    if (isCompleted) return 'completed';
    return 'pending';
}

// Функция для проверки выполнения партнерских заданий
async function checkPartnerTasksCompletion() {
    let hasUpdates = false;

    try {
        // Выполнение задания «Пригласи друга» при наличии хотя бы одного прямого реферала
        const tg = (window.Telegram && Telegram.WebApp) ? Telegram.WebApp : null;
        let myId = tg?.initDataUnsafe?.user?.id || localStorage.getItem('dev_user_id') || null;
        if (myId) {
            const r = await fetch(`${PARTNER_API_BASE}api/get_referral_stats.php?telegramId=${myId}`);
            let d = null;
            try {
                d = await r.json();
            } catch (parseErr) {
                const text = await r.text();
            }
            const refCount = d && d.success ? (d.referral_cnt || 0) : 0;
            if (refCount > 0 && localStorage.getItem(`partner_task_completed_${PARTNER_TASK_KEYS.INVITE_FRIEND}`) !== 'true') {
                localStorage.setItem(`partner_task_completed_${PARTNER_TASK_KEYS.INVITE_FRIEND}`, 'true');
                hasUpdates = true;
            }
        }
    } catch (e) {
    }

    if (hasUpdates) {
        renderPartnerTasks();
        const tasks = getPartnerTasksData();
        updatePartnerTaskCounters(tasks);
    }
}

// Функция для отметки партнерского задания как выполненного
function markPartnerTaskAsCompleted(taskId) {
    localStorage.setItem(`partner_task_completed_${taskId}`, 'true');
    renderPartnerTasks();
    // Обновляем счетчики
    const tasks = getPartnerTasksData();
    updatePartnerTaskCounters(tasks);
}

// Функция для отметки партнерского задания как полученного
function markPartnerTaskAsClaimed(taskId) {
    localStorage.setItem(`partner_task_claimed_${taskId}`, 'true');
    renderPartnerTasks();
    // Обновляем счетчики
    const tasks = getPartnerTasksData();
    updatePartnerTaskCounters(tasks);
}

// Функция для рендеринга партнерских заданий
function renderPartnerTasks(category = 'social') {
    const container = document.getElementById('tasks-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    // Получаем актуальные данные заданий для выбранной категории
    const partnerTasks = getPartnerTasksData(category);
    
    // Обновляем счетчики выполненных заданий для текущей категории
    updatePartnerTaskCounters(partnerTasks, category);
    
    // Показываем задания (карточки в стиле игровых заданий)
    partnerTasks.forEach(task => {
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

        let backgroundColor, borderColor;
        if (task.status === 'completed' || task.status === 'claimed') {
            backgroundColor = 'linear-gradient(135deg, #9c27b0, #673ab7)';
            borderColor = 'rgba(156, 39, 176, 0.3)';
        } else {
            backgroundColor = 'linear-gradient(135deg, #424242, #2d2d2d)';
            borderColor = 'rgba(255,255,255,0.1)';
        }

        taskCard.style.background = backgroundColor;
        taskCard.style.border = `1px solid ${borderColor}`;

        taskCard.onmouseenter = () => {
            taskCard.style.transform = 'translateY(-2px)';
            taskCard.style.boxShadow = '0 8px 24px rgba(0,0,0,0.3)';
        };
        taskCard.onmouseleave = () => {
            taskCard.style.transform = 'translateY(0)';
            taskCard.style.boxShadow = 'none';
        };

        taskCard.innerHTML = `
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

        taskCard.onclick = () => {
            if (task.status === 'completed') {
                // Выдача награды
                markPartnerTaskAsClaimed(task.id);
                const rewardValue = parseInt(task.reward.replace(/\s/g, ''));
                const currentBalance = window.getBalance ? window.getBalance() : parseFloat(localStorage.getItem('balance') || '100');
                const newBalance = currentBalance + rewardValue;
                if (window.setBalance) {
                    window.setBalance(newBalance);
                } else {
                    localStorage.setItem('balance', newBalance);
                    const moneyAmount = document.getElementById('money-amount');
                    if (moneyAmount) {
                        moneyAmount.textContent = window.formatNumber ? window.formatNumber(newBalance) : newBalance;
                    }
                }
            } else if (task.status === 'pending') {
                // Специальное действие для задачи подписки на канал
                if (task.id === PARTNER_TASK_KEYS.JOIN_PRISMAKOV) {
                    const tg = (window.Telegram && Telegram.WebApp) ? Telegram.WebApp : null;
                    const link = 'https://t.me/prismakovchannel';
                    try {
                        if (tg && typeof tg.openTelegramLink === 'function') {
                            tg.openTelegramLink(link);
                        } else {
                            window.open(link, '_blank');
                        }
                        localStorage.setItem('partner_join_channel_clicked', 'true');
                    } catch (e) {
                        window.open(link, '_blank');
                        localStorage.setItem('partner_join_channel_clicked', 'true');
                    }
                }
            }
        };

        container.appendChild(taskCard);
    });

    updatePartnerTotalReward();
}

// Функция для обновления счетчиков партнерских заданий
function updatePartnerTaskCounters(tasks, category = 'social') {
    // Получаем все задания из обеих категорий для общего подсчета
    const allSocialTasks = getPartnerTasksData('social');
    const allBookeTasks = getPartnerTasksData('booke');
    const allTasks = [...allSocialTasks, ...allBookeTasks];

    const completedCount = allTasks.filter(task => task.status === 'completed' || task.status === 'claimed').length;
    const totalCount = allTasks.length;

    // Обновляем счетчики по ID (новая разметка)
    const completedEl = document.getElementById('partner-completed-count');
    const totalEl = document.getElementById('partner-total-count');
    if (completedEl) completedEl.textContent = completedCount;
    if (totalEl) totalEl.textContent = totalCount;

    // Fallback: если где-то используется старая разметка с крупными цифрами
    const tasksPanel = document.getElementById('tasks-panel');
    if (tasksPanel) {
        const counters = tasksPanel.querySelectorAll('div[style*="font-size:32px"]');
        if (counters[0]) counters[0].textContent = completedCount;
        if (counters[1]) counters[1].textContent = totalCount;
    }
}

// Функция для расчета общей суммы наград партнерских заданий
function calculatePartnerTotalReward() {
    // Получаем все задания из обеих категорий
    const allSocialTasks = getPartnerTasksData('social');
    const allBookeTasks = getPartnerTasksData('booke');
    const allTasks = [...allSocialTasks, ...allBookeTasks];
    
    let total = 0;
    allTasks.forEach(task => {
        // Проверяем, что задание выполнено, но еще не получено
        const isCompleted = localStorage.getItem(`partner_task_completed_${task.id}`) === 'true';
        const isClaimed = localStorage.getItem(`partner_task_claimed_${task.id}`) === 'true';
        
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

// Функция для обновления суммы наград в кнопке партнерских заданий
function updatePartnerTotalReward() {
    const btnGetAllPartnerRewards = document.getElementById('btn-get-all-partner-rewards');
    if (btnGetAllPartnerRewards) {
        const totalReward = calculatePartnerTotalReward();
        const rewardSpan = btnGetAllPartnerRewards.querySelector('div span');
        if (rewardSpan) {
            rewardSpan.textContent = `+${totalReward}`;
        }
        
        // Проверяем, есть ли выполненные, но не полученные задания
        const hasCompletedTasks = totalReward !== '0';
        
        if (!hasCompletedTasks) {
            btnGetAllPartnerRewards.disabled = true;
            btnGetAllPartnerRewards.style.opacity = '0.5';
            btnGetAllPartnerRewards.style.cursor = 'not-allowed';
            btnGetAllPartnerRewards.style.background = '#333';
        } else {
            btnGetAllPartnerRewards.disabled = false;
            btnGetAllPartnerRewards.style.opacity = '1';
            btnGetAllPartnerRewards.style.cursor = 'pointer';
            btnGetAllPartnerRewards.style.background = '#5a5a5a';
        }
    }
}

// Делаем функции глобально доступными
window.renderPartnerTasks = renderPartnerTasks;
window.calculatePartnerTotalReward = calculatePartnerTotalReward;
window.updatePartnerTotalReward = updatePartnerTotalReward;
window.markPartnerTaskAsCompleted = markPartnerTaskAsCompleted;
window.markPartnerTaskAsClaimed = markPartnerTaskAsClaimed;
window.checkPartnerTasksCompletion = checkPartnerTasksCompletion;
window.updatePartnerTaskCounters = updatePartnerTaskCounters;

// Тестовые функции для разработки
window.testPartnerTaskSystem = {
    // Сбросить все партнерские задания
    resetAll: function() {
        Object.values(PARTNER_TASK_KEYS).forEach(key => {
            localStorage.removeItem(`partner_task_completed_${key}`);
            localStorage.removeItem(`partner_task_claimed_${key}`);
        });
        renderPartnerTasks();
        // Обновляем счетчики
        const tasks = getPartnerTasksData();
        updatePartnerTaskCounters(tasks);
        alert('Все партнерские задания сброшены!');
    },
    
    // Симулировать выполнение всех партнерских заданий
    completeAll: function() {
        // Отмечаем задания как выполненные
        Object.values(PARTNER_TASK_KEYS).forEach(key => {
            localStorage.setItem(`partner_task_completed_${key}`, 'true');
        });
        
        renderPartnerTasks();
        // Обновляем счетчики
        const tasks = getPartnerTasksData();
        updatePartnerTaskCounters(tasks);
        alert('Все партнерские задания выполнены!');
    },
    
    // Симулировать получение всех наград партнерских заданий
    claimAll: function() {
        Object.values(PARTNER_TASK_KEYS).forEach(key => {
            localStorage.setItem(`partner_task_claimed_${key}`, 'true');
        });
        renderPartnerTasks();
        // Обновляем счетчики
        const tasks = getPartnerTasksData();
        updatePartnerTaskCounters(tasks);
        alert('Все награды партнерских заданий получены!');
    }
}; 