(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const btnFriends = document.getElementById('btn-sound');
        const friendsPanel = document.getElementById('friends-panel');
        const closeBtn = document.getElementById('friends-close');

        if (!btnFriends || !friendsPanel) {
            return;
        }

        const clearSideButton = () => {
            if (window.clearActiveSideButton) {
                window.clearActiveSideButton();
            }
        };

        const openPanel = () => {
            if (window.showPanelWithAnimation) {
                window.showPanelWithAnimation('friends-panel');
            } else {
                friendsPanel.style.display = 'flex';
            }

            if (window.setActiveSideButton) {
                window.setActiveSideButton('btn-sound');
            }
        };

        const closePanel = () => {
            if (window.hidePanelWithAnimation) {
                window.hidePanelWithAnimation('friends-panel', clearSideButton);
            } else {
                friendsPanel.style.display = 'none';
                clearSideButton();
            }
        };

        btnFriends.addEventListener('click', openPanel);
        closeBtn?.addEventListener('click', closePanel);
    });
})();

