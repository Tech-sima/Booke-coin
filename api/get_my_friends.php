<?php
require_once __DIR__ . '/referral_db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$uid = isset($_GET['telegramId']) ? intval($_GET['telegramId']) : 0;
if(!$uid){echo json_encode(['success'=>false,'error'=>'telegramId required']);exit();}
try{
    $pdo=getPDO();

    // проверяем, существует ли таблица Refs2, чтобы присоединить имена
    $sql = 'SELECT u.userId, u.joinDate, u.reward_claimed,
                   COALESCE(d.name, "")   AS name,
                   COALESCE(d.surname, "") AS surname,
                   COALESCE(d.username, "") AS username,
                   COALESCE(d.profile_photo, "") AS profile_photo,
                   0 AS is_inviter
            FROM users u
            LEFT JOIN users_data d ON u.userId = d.user_id
            WHERE u.referredBy = ?
            ORDER BY u.joinDate';
    $st=$pdo->prepare($sql);
    $st->execute([$uid]);
    $friends = $st->fetchAll(PDO::FETCH_ASSOC);

    // Добавляем пригласившего пользователя в список (как "друга")
    $sqlInv = 'SELECT u2.userId, u2.joinDate, u2.reward_claimed,
                      COALESCE(d2.name, "")   AS name,
                      COALESCE(d2.surname, "") AS surname,
                      COALESCE(d2.username, "") AS username,
                      COALESCE(d2.profile_photo, "") AS profile_photo,
                      1 AS is_inviter
               FROM users u
               JOIN users u2 ON u.referredBy = u2.userId
               LEFT JOIN users_data d2 ON u2.userId = d2.user_id
               WHERE u.userId = ?
               LIMIT 1';
    $stInv=$pdo->prepare($sqlInv);
    $stInv->execute([$uid]);
    $inviter = $stInv->fetch(PDO::FETCH_ASSOC);
    if($inviter){
        array_unshift($friends, $inviter);
    }

    echo json_encode(['success'=>true,'friends'=>$friends]);
}catch(Throwable $e){
    echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
} 