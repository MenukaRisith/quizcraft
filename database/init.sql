-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS 
  access_tokens, audit_logs, leaderboard, submissions, questions, 
  quiz_coordinators, quizzes, teams, users, settings;

-- 1. Teams
CREATE TABLE teams (
  id INT AUTO_INCREMENT PRIMARY KEY,
  team_name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_locked TINYINT(1) DEFAULT 0,
  quiz_id INT DEFAULT NULL,
  violation_count INT DEFAULT 0
);

-- 2. Users
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash TEXT,
  role ENUM('admin','coordinator','participant') DEFAULT 'participant',
  team_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- 3. Quizzes
CREATE TABLE quizzes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  is_active TINYINT(1) DEFAULT 0,
  allow_team_participation TINYINT(1) DEFAULT 0,
  start_time DATETIME,
  end_time DATETIME,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_published TINYINT(1) DEFAULT 0,
  registration_deadline DATETIME DEFAULT NULL,
  max_team_members INT DEFAULT NULL,
  cheat_threshold INT DEFAULT 3,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- 4. Questions
CREATE TABLE questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  encrypted_question TEXT NOT NULL,
  options_json TEXT NOT NULL,
  correct_option_index INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

-- 5. Submissions
CREATE TABLE submissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  team_id INT DEFAULT NULL,
  answers_json TEXT NOT NULL,
  score INT DEFAULT 0,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_submission (quiz_id, user_id, team_id),
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

-- 6. Leaderboard
CREATE TABLE leaderboard (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  team_id INT DEFAULT NULL,
  score INT NOT NULL,
  rank INT DEFAULT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (team_id) REFERENCES teams(id)
);

-- 7. Audit Logs
CREATE TABLE audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  team_id INT NOT NULL,
  event_type VARCHAR(100),
  event_data LONGTEXT CHARACTER SET utf8mb4 COLLATE utf8mb4_bin CHECK (json_valid(event_data)),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Access Tokens
CREATE TABLE access_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(64) NOT NULL UNIQUE,
  quiz_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  team_id INT DEFAULT NULL,
  is_used TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL
);

-- 9. Quiz Coordinators
CREATE TABLE quiz_coordinators (
  id INT AUTO_INCREMENT PRIMARY KEY,
  quiz_id INT NOT NULL,
  user_id INT NOT NULL,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- 10. Settings
CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  platform_name VARCHAR(100) DEFAULT 'QuizCraft',
  logo_url TEXT,
  theme_color VARCHAR(20) DEFAULT '#1e40af',
  footer_text VARCHAR(255) DEFAULT 'Built by Menuka Risith',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
