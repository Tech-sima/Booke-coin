<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

// Включаем отображение ошибок для отладки
error_reporting(E_ALL);
ini_set('display_errors', 1);

try {
    require_once 'referral_db.php';

    if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
        exit;
    }

    if (!isset($_GET['userId'])) {
        http_response_code(400);
        echo json_encode(['error' => 'Missing userId parameter']);
        exit;
    }

    $userId = (int)$_GET['userId'];

    try {
        $pdo = getPDO();
        
        // Получаем информацию о пользователе из таблицы users
        $stmt = $pdo->prepare("SELECT userId, joinDate FROM users WHERE userId = ?");
        $stmt->execute([$userId]);
        $userResult = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // Получаем никнейм из таблицы users_data
        $stmt = $pdo->prepare("SELECT username FROM users_data WHERE user_id = ?");
        $stmt->execute([$userId]);
        $nicknameResult = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($userResult) {
            echo json_encode([
                'success' => true,
                'userId' => $userResult['userId'],
                'nickname' => $nicknameResult ? $nicknameResult['username'] : null,
                'joinDate' => $userResult['joinDate']
            ]);
        } else {
            // Если пользователь не найден, создаем новую запись
            $stmt = $pdo->prepare("INSERT INTO users (userId, joinDate) VALUES (?, NOW())");
            $stmt->execute([$userId]);
            
            echo json_encode([
                'success' => true,
                'userId' => $userId,
                'nickname' => null,
                'joinDate' => date('Y-m-d H:i:s')
            ]);
        }
    } catch (PDOException $e) {
        // Если база данных недоступна, возвращаем fallback значение
        error_log("Database error in get_user_info.php: " . $e->getMessage());
        echo json_encode([
            'success' => true,
            'userId' => $userId,
            'nickname' => null,
            'joinDate' => date('Y-m-d H:i:s')
        ]);
    }
    
} catch (Exception $e) {
    // Если что-то пошло не так, возвращаем fallback значение
    error_log("General error in get_user_info.php: " . $e->getMessage());
    echo json_encode([
        'success' => true,
        'userId' => $userId ?? 0,
        'nickname' => null,
        'joinDate' => date('Y-m-d H:i:s')
    ]);
}
?> 