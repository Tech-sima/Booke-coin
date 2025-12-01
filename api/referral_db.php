<?php
function getPDO(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        // Попытка подключения к MySQL
        try {
            $pdo = new PDO('mysql:host=localhost;dbname=users;charset=utf8mb4', 'booke_user', 'Nikitos_2020');
            $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $pdo->setAttribute(PDO::ATTR_TIMEOUT, 5);
        } catch (PDOException $mysqlException) {
            // Фолбэк на SQLite для локальной разработки
            try {
                $dbPath = __DIR__ . DIRECTORY_SEPARATOR . 'referrals.sqlite';
                $pdo = new PDO('sqlite:' . $dbPath);
                $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                $pdo->exec('PRAGMA foreign_keys = ON');
                $pdo->exec('PRAGMA journal_mode = WAL');
                $pdo->exec('PRAGMA synchronous = NORMAL');
            } catch (PDOException $sqliteException) {
                error_log('Database connection failed (MySQL and SQLite): ' . $mysqlException->getMessage() . ' | ' . $sqliteException->getMessage());
                throw new Exception('Database connection failed: ' . $mysqlException->getMessage());
            }
        }
    }
    return $pdo;
}

// Создание таблиц, если их нет (учет драйвера БД)
try {
    $pdo = getPDO();
    $driver = $pdo->getAttribute(PDO::ATTR_DRIVER_NAME);

    if ($driver === 'mysql') {
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId BIGINT NOT NULL UNIQUE,
            referredBy BIGINT NULL,
            joinDate DATETIME DEFAULT CURRENT_TIMESTAMP,
            referral_cnt INT DEFAULT 0,
            rbc_balance INT DEFAULT 0,
            reward_claimed TINYINT DEFAULT 0,
            INDEX(referredBy)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        $pdo->exec("CREATE TABLE IF NOT EXISTS users_data (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id BIGINT UNIQUE,
            name VARCHAR(255),
            surname VARCHAR(255),
            username VARCHAR(255),
            profile_photo TEXT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");

        $pdo->exec("CREATE TABLE IF NOT EXISTS referral_rewards_history (
            id INT AUTO_INCREMENT PRIMARY KEY,
            telegram_id BIGINT NOT NULL,
            amount BIGINT NOT NULL,
            collected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX(telegram_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;");
    } else {
        // SQLite схемы
        $pdo->exec("CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            userId INTEGER NOT NULL UNIQUE,
            referredBy INTEGER NULL,
            joinDate TEXT DEFAULT (datetime('now')),
            referral_cnt INTEGER DEFAULT 0,
            rbc_balance INTEGER DEFAULT 0,
            reward_claimed INTEGER DEFAULT 0
        );
        CREATE INDEX IF NOT EXISTS idx_users_referredBy ON users(referredBy);
        ");

        $pdo->exec("CREATE TABLE IF NOT EXISTS users_data (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER UNIQUE,
            name TEXT,
            surname TEXT,
            username TEXT,
            profile_photo TEXT
        );
        ");

        $pdo->exec("CREATE TABLE IF NOT EXISTS referral_rewards_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            telegram_id INTEGER NOT NULL,
            amount INTEGER NOT NULL,
            collected_at TEXT DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_rewards_telegram_id ON referral_rewards_history(telegram_id);
        ");
    }
} catch (Throwable $e) {
    error_log('Table creation failed: ' . $e->getMessage());
}
?>