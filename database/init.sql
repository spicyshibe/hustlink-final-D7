-- TODO: Tulis query SQL kalian di sini (CREATE TABLE & INSERT) untuk inisialisasi database otomatis
-- Create database if not exists
CREATE DATABASE IF NOT EXISTS hustlink_db;
USE hustlink_db;

-- Table 1: Kategori (Categories)
CREATE TABLE IF NOT EXISTS kategori (
    id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 2: User
CREATE TABLE IF NOT EXISTS user (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    Alamat TEXT,
    role ENUM('admin', 'user') DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table 3: Jobs (Main table)
CREATE TABLE IF NOT EXISTS jobs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    requirement TEXT NOT NULL,
    deadline DATE NOT NULL,
    status ENUM('Open', 'Closed') DEFAULT 'Open',
    category_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES kategori(id) ON DELETE SET NULL
);

-- Table 4: Applicant
CREATE TABLE IF NOT EXISTS applicant (
    id INT PRIMARY KEY AUTO_INCREMENT,
    Id_User INT,
    id_kategori INT,
    Date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (Id_User) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (id_kategori) REFERENCES kategori(id) ON DELETE CASCADE
);

-- Insert initial data
INSERT INTO kategori (category_name) VALUES 
('Technology'),
('Marketing'),
('Finance'),
('Human Resources'),
('Operations');

INSERT INTO user (username, password, email, Alamat, role) VALUES 
('admin', 'admin123', 'admin@hustlink.com', 'Yogyakarta', 'admin'),
('user1', 'user123', 'user1@email.com', 'Jakarta', 'user');

INSERT INTO jobs (title, description, requirement, deadline, category_id, status) VALUES 
('Frontend Developer', 'Develop user interfaces for web applications', 'React, HTML/CSS, JavaScript', '2024-12-31', 1, 'Open'),
('Digital Marketing Specialist', 'Manage social media and online campaigns', '2+ years experience, SEO knowledge', '2024-11-30', 2, 'Open'),
('Financial Analyst', 'Analyze financial data and prepare reports', 'Bachelor in Finance, Excel advanced', '2024-10-31', 3, 'Open');