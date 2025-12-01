<?php
require_once __DIR__ . '/referral_db.php';

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { echo json_encode(['success'=>false,'error'=>'POST only']); exit(); }

$me      = isset($_POST['telegramId']) ? intval($_POST['telegramId']) : 0;
$referer = isset($_POST['refererId'])  ? intval($_POST['refererId'])  : 0;
// Профиль пользователя из Telegram (если доступен)
$name    = isset($_POST['name']) ? trim($_POST['name']) : '';
$surname = isset($_POST['surname']) ? trim($_POST['surname']) : '';
$username= isset($_POST['username']) ? trim($_POST['username']) : '';
$photo   = isset($_POST['profile_photo']) ? trim($_POST['profile_photo']) : '';
if ($me<=0) { echo json_encode(['success'=>false,'error'=>'telegramId required']); exit(); }

try{
    $pdo = getPDO();
    $pdo->beginTransaction();
    $stmt=$pdo->prepare('SELECT referredBy FROM users WHERE userId=? LIMIT 1');
    $stmt->execute([$me]);
    $exists=$stmt->fetch(PDO::FETCH_ASSOC);
    if(!$exists){
        $pdo->prepare('INSERT INTO users(userId, referredBy) VALUES(?, ?)')->execute([$me, $referer ?: null]);
    }

    // Обновляем/вставляем профиль для аватарки/имени
    if($name || $surname || $username || $photo){
        $pdo->prepare('INSERT INTO users_data(user_id, name, surname, username, profile_photo) VALUES(?,?,?,?,?)
                       ON DUPLICATE KEY UPDATE name=VALUES(name), surname=VALUES(surname), username=VALUES(username), profile_photo=VALUES(profile_photo)')
            ->execute([$me, $name, $surname, $username, $photo]);
    }

    // Начисляем награду за прямую регистрацию по приглашению: 200000 обоим
    if($referer && $referer!=$me){
        $pdo->prepare('UPDATE users SET rbc_balance = rbc_balance + 200000 WHERE userId IN (?, ?)')
            ->execute([$referer, $me]);
        // Увеличиваем счетчик рефералов пригласившему
        $pdo->prepare('UPDATE users SET referral_cnt = referral_cnt + 1 WHERE userId=?')
            ->execute([$referer]);
    }
    $pdo->commit();
    echo json_encode(['success'=>true]);
}catch(Throwable $e){
    if($pdo->inTransaction()) $pdo->rollBack();
    echo json_encode(['success'=>false,'error'=>$e->getMessage()]);
} 