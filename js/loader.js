// Lightweight loader overlay controller
// Shows dark screen with animated rays, "BOOKE" title, tagline, percent, and Start button

(function(){
    const overlay = document.getElementById('loading-overlay');
    if (!overlay) return;
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const progressContainer = document.getElementById('progress-container');
    const startBtn = document.getElementById('start-button');
    // Canvas removed - using SVG loading screen instead

    // Public API exposed to window for main.js to hook
    // window.GameLoader.show(); window.GameLoader.hide(); window.GameLoader.setProgress(p)
    const GameLoader = {
        show: function(){ overlay.style.display = 'flex'; },
        hide: function(){ overlay.style.display = 'none'; },
        setProgress: function(p){
            const clamped = Math.max(0, Math.min(100, Math.floor(p)));
            
            // Update progress bar
            if (progressFill) {
                progressFill.style.width = clamped + '%';
            }
            if (progressText) {
                progressText.textContent = clamped + '%';
            }
            
            if (clamped >= 100) {
                // Hide progress container and show start button
                if (progressContainer) {
                    progressContainer.style.opacity = '0';
                    progressContainer.style.transform = 'translateY(8px)';
                    progressContainer.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
                }
                
                if (startBtn) {
                    // Show start button after progress container fades out
                    setTimeout(() => {
                        if (progressContainer) {
                            progressContainer.style.display = 'none';
                        }
                        startBtn.style.display = 'inline-block';
                        requestAnimationFrame(() => {
                            startBtn.classList.add('revealed');
                        });
                    }, 500);
                }
            }
        },
        onStart: null
    };

    // Simple preloader: preload key images and GLTF files via fetch HEAD
    async function preloadAssets() {
        const assets = [
            'assets/png/main-menu-bg.png',
            'assets/svg/shop-icon.svg',
            'assets/svg/ref-icon.svg',
            'models/BOOKE_map.gltf',
            'models/BOOKE_map.bin'
        ];
        let loaded = 0;
        const total = assets.length;

        GameLoader.show();
        GameLoader.setProgress(1);

        for (const url of assets) {
            try {
                if (url.endsWith('.png') || url.endsWith('.svg')) {
                    await new Promise((resolve, reject) => {
                        const img = new Image();
                        img.onload = resolve;
                        img.onerror = resolve; // don't block on failures
                        img.src = url;
                    });
                } else {
                    // Fetch with HEAD to warm cache
                    await fetch(url, { method: 'GET', cache: 'reload' }).catch(()=>{});
                }
            } catch (e) {
                // Ignore errors; continue progress
            }
            loaded += 1;
            GameLoader.setProgress((loaded / total) * 100);
        }
    }

    // Wire start button
    if (startBtn) {
        startBtn.addEventListener('click', () => {
            if (typeof GameLoader.onStart === 'function') {
                GameLoader.hide();
                GameLoader.onStart();
            } else {
                GameLoader.hide();
            }
        });
    }

    // Canvas animation removed - using SVG loading screen instead

    // Kick off preload after DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', preloadAssets);
    } else {
        preloadAssets();
    }

    window.GameLoader = GameLoader;
})();


