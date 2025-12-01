// Tasks Panel Swap - переопределяем обработчики кнопок
// Флаг для отслеживания инициализации tasks-swap
let tasksSwapInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    // Предотвращаем повторную инициализацию
        if (tasksSwapInitialized) {
            return;
        }
    // Небольшая задержка чтобы убедиться что все обработчики из main.js загружены
    setTimeout(() => {
        // Переопределяем обработчик нижней кнопки "Задания" без замены элемента
        const bottomNavButton = document.querySelector('#bottom-nav button:nth-child(4)');
        if (bottomNavButton) {
            // Удаляем все существующие обработчики
            const newButton = bottomNavButton.cloneNode(true);
            bottomNavButton.parentNode.replaceChild(newButton, bottomNavButton);
            
            // Создаем новый обработчик для нижней кнопки
            const newClickHandler = (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                // Проверяем, не открыта ли уже какая-то панель
                const isAnyPanelOpen = () => {
                    const panels = [
                        'shop-panel',
                        'characters-panel', 
                        'city-panel',
                        'tasks-panel',
                        'profile-panel',
                        'friends-panel',
                        'phone-panel',
                        'game-tasks-panel'
                    ];
                    return panels.some(id => document.getElementById(id)?.style.display === 'flex');
                };
                
                if (isAnyPanelOpen()) return;
                
                // Скрываем красный кружок при первом посещении игровых заданий
                const tasksFirstVisit = localStorage.getItem('tasksFirstVisit') === 'true';
                if (!tasksFirstVisit) {
                    localStorage.setItem('tasksFirstVisit', 'true');
                    
                    const tasksDot = document.getElementById('tasks-dot');
                    if (tasksDot) {
                        tasksDot.style.display = 'none';
                    }
                }
                
                // Устанавливаем активное состояние
                if (window.setActiveNavButton) {
                    window.setActiveNavButton(4);
                }
                
                // Открываем новую панель игровых заданий
                const gameTasksPanel = document.getElementById('game-tasks-panel');
                if (gameTasksPanel) {
                    // Рендерим игровые задания и открываем панель
                    if (window.renderGameTasks) {
                        window.renderGameTasks();
                    }
                    if (window.showPanelWithAnimation) {
                        window.showPanelWithAnimation('game-tasks-panel');
                    } else {
                        gameTasksPanel.style.display = 'flex';
                    }
                } else {
                }
            };
            
            // Добавляем новый обработчик
            newButton.addEventListener('click', newClickHandler);
        } else {
        }
        
        // Боковая кнопка btn-tasks теперь открывает панель с партнерскими заданиями
        const btnTasks = document.getElementById('btn-tasks');
        const tasksPanel = document.getElementById('tasks-panel');
        
        if (btnTasks && tasksPanel) {
            
            // Удаляем все существующие обработчики
            const newSideButton = btnTasks.cloneNode(true);
            btnTasks.parentNode.replaceChild(newSideButton, btnTasks);
            
            // Создаем новый обработчик для боковой кнопки
            const sideButtonClickHandler = () => {
                
                // Проверяем, не открыта ли уже какая-то панель
                const isAnyPanelOpen = () => {
                    const panels = [
                        'shop-panel',
                        'characters-panel', 
                        'city-panel',
                        'tasks-panel',
                        'profile-panel',
                        'friends-panel',
                        'phone-panel',
                        'game-tasks-panel'
                    ];
                    return panels.some(id => document.getElementById(id)?.style.display === 'flex');
                };
                
                if (isAnyPanelOpen()) return;
                
                // Скрываем красный кружок при первом посещении партнерских заданий
                const tasksFirstVisit = localStorage.getItem('tasksFirstVisit') === 'true';
                if (!tasksFirstVisit) {
                    localStorage.setItem('tasksFirstVisit', 'true');
                    
                    const tasksDot = document.getElementById('tasks-dot');
                    if (tasksDot) {
                        tasksDot.style.display = 'none';
                    }
                }
                
                // Рендерим партнерские задания и открываем панель
                if (window.renderPartnerTasks) {
                    window.renderPartnerTasks();
                }
                if (window.showPanelWithAnimation) {
                    window.showPanelWithAnimation('tasks-panel');
                } else {
                    tasksPanel.style.display = 'flex';
                }
                
                // Подсвечиваем кнопку белым цветом
                if (window.setActiveSideButton) {
                    window.setActiveSideButton('btn-tasks');
                }
            };
            
            // Добавляем новый обработчик
            newSideButton.addEventListener('click', sideButtonClickHandler);
        } else {
        }
        
    }, 200); // Увеличиваем задержку до 200мс
    
    tasksSwapInitialized = true;
}); 