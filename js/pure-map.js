// Простая карта на чистом HTML/CSS/JS с панорамированием/зумом и появлением зданий
(function(){
    var BASE_WIDTH = 4818;
    var BASE_HEIGHT = 3213;
    var buildingsConfig = {
        library: { // Библиотека
            img: 'building-templates/interactive-map/Buildings (8).png', x: 2411, y: 1500, w: 695, h: 1089
        },
        storage: { // Почта
            img: 'building-templates/interactive-map/Buildings (9).png', x: 2094, y: 1924, w: 590, h: 926
        },
        print: { // Типография
            img: 'building-templates/interactive-map/Buildings (11).png', x: 689, y: 1085, w: 614, h: 961
        },
        factory: { // Завод
            img: 'building-templates/interactive-map/Buildings (10).png', x: 515, y: -425, w: 817, h: 1310
        }
    };

    var stage = document.getElementById('pure-map-stage');
    var content = document.getElementById('pure-map-content');
    var bg = document.getElementById('pure-map-bg');
    var buildingsRoot = document.getElementById('pure-map-buildings');
    if(!stage || !content || !bg || !buildingsRoot){ return; }
    
    // Оптимизация производительности для плавного свайпа
    content.style.willChange = 'transform';
    content.style.backfaceVisibility = 'hidden';

    // Панорамирование/зум - объявляем state раньше, чтобы использовать в функциях
    var state = { scale: 0.18, minScale: 0.12, maxScale: 3, x: 0, y: 0, dragging: false, lastX: 0, lastY: 0, vx: 0, vy: 0 };

    // Устанавливаем базовые размеры подложки
    bg.style.width = BASE_WIDTH + 'px';
    bg.style.height = BASE_HEIGHT + 'px';

    // Создаём узлы зданий
    var buildingNodes = {};
    Object.keys(buildingsConfig).forEach(function(key){
        var cfg = buildingsConfig[key];
        var el = document.createElement('img');
        el.src = cfg.img;
        el.alt = key;
        el.style.position = 'absolute';
        el.style.left = cfg.x + 'px';
        el.style.top = cfg.y + 'px';
        el.style.width = cfg.w + 'px';
        el.style.height = cfg.h + 'px';
        el.style.pointerEvents = 'auto';
        el.style.userSelect = 'none';
        el.style.webkitUserDrag = 'none';
        buildingsRoot.appendChild(el);
        buildingNodes[key] = el;
    });

    function readBuildingsState(){
        try{ return JSON.parse(localStorage.getItem('buildingsData')||'{}'); }catch(e){ return {}; }
    }

    function applyVisibility(){
        var data = readBuildingsState();
        Object.keys(buildingNodes).forEach(function(key){
            if(key === 'library'){
                setOwnedUI('library');
                return;
            }
            var owned = !!(data[key] && data[key].isOwned === true);
            if(owned){
                setOwnedUI(key);
            }else{
                buildingNodes[key].style.display = 'none';
                if(circleNodes[key]) circleNodes[key].style.display = 'none';
                buildingNodes[key].onclick = null;
            }
        });
    }

    // Круговые индикаторы для купленных зданий
    var circleNodes = {};
    var CIRCLE_SIZE = 90; // Размер круга
    var CIRCLE_OFFSET = 10; // Отступ от края здания
    function ensureCircle(key){
        if(circleNodes[key]) return circleNodes[key];
        var cfg = buildingsConfig[key];
        if(!cfg) return null;
        var circle = document.createElement('div');
        circle.style.position = 'absolute';
        // Правый верхний угол здания с небольшим отступом
        circle.style.left = (cfg.x + cfg.w - CIRCLE_SIZE - CIRCLE_OFFSET) + 'px';
        circle.style.top = (cfg.y + CIRCLE_OFFSET) + 'px';
        circle.style.width = CIRCLE_SIZE + 'px';
        circle.style.height = CIRCLE_SIZE + 'px';
        circle.style.borderRadius = '50%';
        circle.style.background = 'radial-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.0))';
        circle.style.pointerEvents = 'none';
        circle.style.filter = 'blur(0.2px)';
        circle.style.zIndex = '1';
        circle.style.display = '';
        // Оптимизация для плавного обновления при свайпе
        circle.style.willChange = 'transform';
        circle.style.backfaceVisibility = 'hidden';
        buildingsRoot.appendChild(circle);
        circleNodes[key] = circle;
        return circle;
    }

    function setOwnedUI(key){
        if(buildingNodes[key]){
            buildingNodes[key].style.display = '';
            var circle = ensureCircle(key);
            if(circle){
                circle.style.display = '';
            }
            // Клик по зданию открывает соответствующую панель
            buildingNodes[key].style.cursor = 'pointer';
            buildingNodes[key].style.zIndex = '2';
            buildingNodes[key].setAttribute('role','button');
            buildingNodes[key].onclick = function(){
                try{
                    var names = {factory:'Завод', storage:'Почта', print:'Типография', library:'Библиотека'};
                    if(typeof window.openBuildingPanel === 'function'){
                        window.openBuildingPanel(key, names[key]||'');
                        return;
                    }
                }catch(e){}
            };
        }
    }

    // Функция для получения экранных координат здания
    function getBuildingScreenPosition(key){
        // Сначала пробуем использовать реальный DOM элемент круга, если он существует
        if(circleNodes[key] && circleNodes[key].parentNode){
            var circleRect = circleNodes[key].getBoundingClientRect();
            return { 
                x: circleRect.left + circleRect.width / 2, 
                y: circleRect.top + circleRect.height / 2, 
                width: circleRect.width, 
                height: circleRect.height 
            };
        }
        // Fallback: вычисляем координаты вручную (правый верхний угол здания)
        var cfg = buildingsConfig[key];
        if(!cfg) return null;
        var contentRect = content.getBoundingClientRect();
        // Правый верхний угол здания (как в ensureCircle)
        var circleSize = CIRCLE_SIZE;
        var offset = CIRCLE_OFFSET;
        var buildingRightX = cfg.x + cfg.w - circleSize - offset;
        var buildingTopY = cfg.y + offset;
        // Применяем трансформацию карты: координаты относительно content, затем применяем transform
        // content имеет transform-origin: 0 0, поэтому координаты умножаются на scale и добавляется translate
        var screenX = contentRect.left + (buildingRightX + circleSize / 2) * state.scale;
        var screenY = contentRect.top + (buildingTopY + circleSize / 2) * state.scale;
        return { x: screenX, y: screenY, width: circleSize, height: circleSize };
    }

    // Экспортируем API для мгновенного показа после покупки
    window.pureMap = {
        showBuilding: function(key){ setOwnedUI(key); },
        getBuildingPosition: getBuildingScreenPosition,
        getBuildingsConfig: function(){ return buildingsConfig; },
        getState: function(){ return state; },
        getStage: function(){ return stage; }
    };

    function clampPan(){
        var sw = stage.clientWidth, sh = stage.clientHeight;
        var mapW = BASE_WIDTH * state.scale, mapH = BASE_HEIGHT * state.scale;
        var minX = Math.min(0, sw - mapW), maxX = Math.max(0, sw - mapW) + 0; // если карта меньше экрана — центрируем
        var minY = Math.min(0, sh - mapH), maxY = Math.max(0, sh - mapH) + 0;
        if(mapW <= sw){ state.x = (sw - mapW) * 0.5; } else { state.x = Math.min(0, Math.max(minX, state.x)); }
        if(mapH <= sh){ state.y = (sh - mapH) * 0.5; } else { state.y = Math.min(0, Math.max(minY, state.y)); }
    }
    function applyTransform(){
        clampPan();
        // Применяем трансформацию синхронно для мгновенного обновления
        content.style.transform = 'translate3d('+state.x+'px,'+state.y+'px,0) scale('+state.scale+')';
        // Синхронно обновляем только позиции существующих индикаторов (быстро, без пересоздания)
        if(typeof window.updateProfitIndicatorsPositions === 'function'){
            // Вызываем синхронно для мгновенного обновления позиций без задержки
            window.updateProfitIndicatorsPositions();
        }
    }

    function fitToStage(){
        var sw = stage.clientWidth;
        var sh = stage.clientHeight;
        var sx = sw / BASE_WIDTH;
        var sy = sh / BASE_HEIGHT;
        // Используем cover, чтобы карта заполняла экран по меньшей стороне без полос
        var s = Math.max(sx, sy);
        state.scale = Math.max(state.minScale, Math.min(state.maxScale, s));
        // Центрирование
        state.x = (sw - BASE_WIDTH*state.scale) * 0.5;
        state.y = (sh - BASE_HEIGHT*state.scale) * 0.5;
        applyTransform();
    }

    // Drag (повышенная чувствительность, без пост-скольжения)
    stage.addEventListener('pointerdown', function(e){
        state.dragging = true; state.lastX = e.clientX; state.lastY = e.clientY; state.vx = 0; state.vy = 0; stage.setPointerCapture(e.pointerId);
    });
    stage.addEventListener('pointermove', function(e){
        if(!state.dragging) return;
        var dx = (e.clientX - state.lastX) * 1.5; var dy = (e.clientY - state.lastY) * 1.5; // чувствительнее x1.5
        state.lastX = e.clientX; state.lastY = e.clientY;
        state.x += dx; state.y += dy; state.vx = 0; state.vy = 0; applyTransform();
    });
    stage.addEventListener('pointerup', function(e){ state.dragging = false; });
    stage.addEventListener('pointercancel', function(e){ state.dragging = false; });
    // Отключаем нативный скролл/зум браузера для корректного свайпа
    try{ stage.style.touchAction = 'none'; }catch(e){}

    // Отключён колесо-зум (фиксированный масштаб/фокус задаётся через методы)
    stage.addEventListener('wheel', function(e){ e.preventDefault(); }, { passive: false });

    // Убрана кнопка быстрого свайпа

    function focusToKey(key){
        var cfg = buildingsConfig[key];
        if(!cfg) return;
        var sw = stage.clientWidth, sh = stage.clientHeight;
        // Фиксированный масштаб под объект (~35% * 3 = ~105% меньшей стороны экрана)
        var targetSize = Math.min(sw, sh) * (0.35 * 3);
        var scaleX = targetSize / cfg.w;
        var scaleY = targetSize / cfg.h;
        var targetScale = Math.max(state.minScale, Math.min(state.maxScale, Math.min(scaleX, scaleY)));
        var objCx = cfg.x + cfg.w/2;
        var objCy = cfg.y + cfg.h/2;
        state.scale = targetScale;
        state.x = (sw/2) - objCx * targetScale;
        state.y = (sh/2) - objCy * targetScale;
        applyTransform();
    }

    // Экспорт фиксированных зумов
    window.pureMap.focusTo = function(key){ focusToKey(key); };
    window.zoomToLibrary = function(){ focusToKey('library'); };
    window.zoomToStorage = function(){ focusToKey('storage'); };

    window.addEventListener('resize', fitToStage);
    fitToStage();
    applyVisibility();
    // Библиотека — видна и кликабельна изначально
    setOwnedUI('library');
})();


