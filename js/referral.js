// Referral system integration
(function(){
  // Флаг для отслеживания инициализации referral
let referralInitialized = false;

document.addEventListener('DOMContentLoaded', () => {
    // Предотвращаем повторную инициализацию
        if (referralInitialized) {
            return;
        }
    const tg = (window.Telegram && Telegram.WebApp) ? Telegram.WebApp : null;
    // Идентификатор пользователя: используем Telegram ID, иначе dev-фолбэк для локального запуска
    let myId = tg?.initDataUnsafe?.user?.id || null;
    if(!myId){
        // локальная отладка вне Telegram
        myId = localStorage.getItem('dev_user_id');
        if(!myId){
            myId = String(Math.floor(Math.random()*1000000000));
            localStorage.setItem('dev_user_id', myId);
        }
    }

    // Поддержка ссылки приглашения через query (?refererId=) и Telegram start_param
    const params = new URLSearchParams(window.location.search);
    let refererId = params.get('refererId') || '';
    const startParam = (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) ? tg.initDataUnsafe.start_param : '';
    if(!refererId && startParam && /^\d+$/.test(startParam)){
        refererId = startParam;
    }
    // Базовый URL для API (совместимо с Live Server на 5500 и PHP на 8001)
    const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
      ? window.API_BASE
      : (location && location.port === '5500' ? 'http://127.0.0.1:8001/' : './');

    if(myId){
        const body = new URLSearchParams();
        body.append('telegramId', myId);
        if(refererId) body.append('refererId', refererId);
        // Пробрасываем профиль пользователя (для отображения в друзьях)
        const u = tg?.initDataUnsafe?.user || {};
        if(u.first_name) body.append('name', u.first_name);
        if(u.last_name)  body.append('surname', u.last_name);
        if(u.username)   body.append('username', u.username);
        if(u.photo_url)  body.append('profile_photo', u.photo_url);
        // register (idempotent)
        fetch(`${API_BASE}api/referral_register.php`,{method:'POST',body})
          .finally(refreshReferralCount);
    }

    async function refreshReferralCount(){
      try{
        if(!myId) return;
        const r = await fetch(`${API_BASE}api/get_referral_stats.php?telegramId=${myId}`);
        let d = null;
        try {
          d = await r.json();
        } catch (parseErr) {
          const text = await r.text();
        }
        if(d.success){
          const refEl = document.getElementById('ref-value');
          if(refEl) refEl.textContent = d.referral_cnt || 0;

          const rbcEl = document.getElementById('rbc-value');
          if(rbcEl) rbcEl.textContent = d.rbc_balance || 0;
          
          // Обновляем отображение наград на кнопке
          const collectRewardBtn = document.getElementById('btn-collect-reward');
          if(collectRewardBtn) {
            const pendingRewards = d.pending_rewards || 0;
            const rewardText = collectRewardBtn.querySelector('span:last-child');
            if(rewardText) {
              rewardText.textContent = `+${pendingRewards}`;
            }
          }
        }
      }catch(e){}
    }

    if(myId) refreshReferralCount();

    /* === Friends panel === */
    const btnFriends = document.getElementById('btn-sound'); // первая кнопка боковой панели
    const friendsPanel = document.getElementById('friends-panel');
    if(btnFriends && friendsPanel){
      const inviteInput = document.getElementById('invite-link');
      const copyBtn     = document.getElementById('btn-copy-link');
      const closeBtn    = document.getElementById('friends-close');
      const friendsCount= document.getElementById('friends-count');
      const friendsList = document.getElementById('friends-list');

      btnFriends.addEventListener('click', () => {
        if (window.showPanelWithAnimation) {
            window.showPanelWithAnimation('friends-panel');
        } else {
        friendsPanel.style.display = 'flex';
        }
        if(inviteInput) {
          inviteInput.value = `https://t.me/BookeCoinBot?start=${myId}`;
          inviteInput.readOnly = true;
          inviteInput.style.cursor = 'pointer';
          if(!inviteInput.dataset.boundShare){
            inviteInput.addEventListener('click', () => {
              const url = inviteInput.value;
              const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Присоединяйся к BOOKE!')}`;
              if(tg && typeof tg.openTelegramLink === 'function'){
                tg.openTelegramLink(shareUrl);
              }else{
                window.open(shareUrl, '_blank');
              }
            });
            inviteInput.dataset.boundShare = '1';
          }
        }
        refreshReferralCount(); // Обновляем награды при открытии панели
        refreshFriendList();
        
        // Подсвечиваем кнопку белым цветом
        if (window.setActiveSideButton) {
            window.setActiveSideButton('btn-sound');
        }
      });
      closeBtn?.addEventListener('click', ()=> {
        if (window.hidePanelWithAnimation) {
            window.hidePanelWithAnimation('friends-panel', () => {
                // Сбрасываем подсветку кнопки
                if (window.clearActiveSideButton) {
                    window.clearActiveSideButton();
                }
            });
        } else {
            friendsPanel.style.display = 'none';
            // Сбрасываем подсветку кнопки
            if (window.clearActiveSideButton) {
                window.clearActiveSideButton();
            }
        }
      });
      
      copyBtn?.addEventListener('click', () => {
        if(inviteInput){
          navigator.clipboard.writeText(inviteInput.value).then(() => {
            // Показываем уведомление о копировании
            const notification = document.createElement('div');
            notification.style.cssText = `
              position: fixed;
              top: 20px;
              left: 50%;
              transform: translateX(-50%);
              background: #4CAF50;
              color: white;
              padding: 12px 24px;
              border-radius: 8px;
              font-size: 14px;
              font-weight: 600;
              z-index: 10000;
              box-shadow: 0 4px 12px rgba(0,0,0,0.3);
              animation: slideIn 0.3s ease-out;
            `;
            notification.textContent = 'Ссылка скопирована в буфер обмена!';
            
            // Добавляем CSS анимацию
            const style = document.createElement('style');
            style.textContent = `
              @keyframes slideIn {
                from {
                  opacity: 0;
                  transform: translateX(-50%) translateY(-20px);
                }
                to {
                  opacity: 1;
                  transform: translateX(-50%) translateY(0);
                }
              }
            `;
            document.head.appendChild(style);
            
            document.body.appendChild(notification);
            
            // Удаляем уведомление через 3 секунды
            setTimeout(() => {
              notification.style.animation = 'slideOut 0.3s ease-in';
              notification.style.opacity = '0';
              setTimeout(() => {
                document.body.removeChild(notification);
                document.head.removeChild(style);
              }, 300);
            }, 3000);
          }).catch(err => {
            console.error('Ошибка копирования:', err);
            alert('Ошибка при копировании ссылки');
          });
        }
      });
      
      // Collect reward button handler
      const collectRewardBtn = document.getElementById('btn-collect-reward');
      collectRewardBtn?.addEventListener('click', async () => {
        try {
          if(!myId) {
            alert('Ошибка: не удалось определить пользователя');
            return;
          }
          
          // Получаем статистику рефералов
          const r = await fetch(`${API_BASE}api/get_referral_stats.php?telegramId=${myId}`);
          let d = null;
          try {
            d = await r.json();
          } catch (parseErr) {
            const text = await r.text();
          }
          
          if(d.success) {
            const pendingRewards = d.pending_rewards || 0;
            
            if(pendingRewards <= 0) {
              alert('У вас нет накопившихся наград для получения');
              return;
            }
            
            // Запрашиваем начисление наград
            const rewardBody = new URLSearchParams();
            rewardBody.append('telegramId', myId);
            
            const rewardResponse = await fetch(`${API_BASE}api/collect_referral_rewards.php`, {
              method: 'POST',
              body: rewardBody
            });
            
            let rewardData = null;
            try {
              rewardData = await rewardResponse.json();
            } catch (parseErr) {
              const text = await rewardResponse.text();
            }
            
            if(rewardData.success) {
              alert(`Награда успешно начислена! Получено: ${pendingRewards} RBC`);
              
              // Обновляем отображение наград
              const rewardText = collectRewardBtn.querySelector('span:last-child');
              if(rewardText) {
                rewardText.textContent = '+0';
              }
              
              // Обновляем статистику
              refreshReferralCount();
              refreshFriendList();
            } else {
              alert('Ошибка при получении награды: ' + (rewardData.message || 'Неизвестная ошибка'));
            }
          } else {
            alert('Ошибка при получении статистики рефералов');
          }
        } catch(e) {
          alert('Ошибка при получении награды');
        }
      });
      
      const shareBtn = document.getElementById('btn-share-link');
      shareBtn?.addEventListener('click', ()=>{
          if(!inviteInput) return;
          const url = inviteInput.value;
          const shareUrl = `https://telegram.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent('Присоединяйся к Booke!')}`;
          window.open(shareUrl,'_blank');
      });

      async function refreshFriendList(){
        try{
          const r = await fetch(`${API_BASE}api/get_my_friends.php?telegramId=${myId}`);
          let d = null;
          try {
            d = await r.json();
          } catch (parseErr) {
            const text = await r.text();
          }
          if(d.success){
             const all = Array.isArray(d.friends) ? d.friends : [];
             const directFriends = all.filter(f => !("is_inviter" in f) || parseInt(f.is_inviter) !== 1);
             friendsCount.textContent = directFriends.length;
             friendsList.innerHTML = '';
             all.forEach(f=>{
               const item = document.createElement('div');
               item.style.cssText = `
                 background:#fff;
                 border-radius:12px;
                 padding:12px;
                 display:flex;
                 align-items:center;
                 gap:12px;
                 position:relative;
                 box-shadow:0 2px 4px rgba(0,0,0,.1);
               `;

               // Avatar placeholder
               const ava = document.createElement('div');
               ava.style.cssText = `
                 width:40px;
                 height:40px;
                 background:#ccc;
                 border-radius:8px;
                 flex-shrink:0;
               `;
               item.appendChild(ava);

               // Friend info
               const info = document.createElement('div');
               info.style.cssText = `
                 flex:1;
                 display:flex;
                 flex-direction:column;
                 gap:4px;
               `;

               // Name and username
               const name = document.createElement('div');
               name.style.cssText = `
                 font-size:14px;
                 font-weight:600;
                 color:#2d2d2d;
               `;
               name.textContent = `${f.name || ''} ${f.surname || ''}`.trim();
               if(f.username) name.textContent += ` (${f.username})`;
               info.appendChild(name);

               // Join date and reward info
               const joinDate = new Date(f.joinDate);
               const balance = document.createElement('div');
               balance.style.cssText = `
                 font-size:12px;
                 color:#666;
               `;
               balance.textContent = `Присоединился: ${joinDate.toLocaleDateString('ru-RU')}`;
               info.appendChild(balance);

               item.appendChild(info);

               // New badge (if reward not claimed)
               if(parseInt(f.reward_claimed) === 0){
                  const badge = document.createElement('div');
                  badge.style.cssText = `
                    position:absolute;
                    top:8px;
                    left:8px;
                    background:#000;
                    color:#fff;
                    font-size:10px;
                    font-weight:600;
                    padding:2px 6px;
                    border-radius:4px;
                    z-index:1;
                  `;
                  badge.textContent = 'New!';
                  item.appendChild(badge);
               }

               // Reward icon (10 RBC for direct referral)
               const reward = document.createElement('div');
               reward.style.cssText = `
                 display:flex;
                 align-items:center;
                 gap:4px;
                 font-size:12px;
                 font-weight:600;
                 color:#2d2d2d;
               `;
               reward.innerHTML = '<span style="font-size:16px;">🎯</span> +10';
               item.appendChild(reward);

               friendsList.appendChild(item);
             });
          }
        }catch(e){}  
      }
    }

    // expose global for manual refresh if needed
    window.refreshReferralCount = refreshReferralCount;
    
    referralInitialized = true;
  });
})(); 