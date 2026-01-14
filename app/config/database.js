// TODO: Buat koneksi pool MySQL disini menggunakan Environment Variable (process.env)
const mysql = require('mysql2');
require('dotenv').config();

// Create connection pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'db_service',
    user: process.env.DB_USER || 'hustlink_user',
    password: process.env.DB_PASS || 'hustlink_pass',
    database: process.env.DB_NAME || 'hustlink_db',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
});

// Test connection function
const testConnection = async () => {
    try {
        const connection = await pool.promise().getConnection();
        console.log('✅ Database connected successfully!');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ Database connection failed:', error.message);
        
        // Provide helpful error message
        if (error.code === 'ECONNREFUSED') {
            console.error('💡 Tip: Check if MySQL service is running and credentials are correct.');
            console.error('💡 Database Host:', process.env.DB_HOST || 'db_service');
            console.error('💡 Database User:', process.env.DB_USER || 'hustlink_user');
        }
        
        return false;
    }
};

// Helper function for executing queries
const query = async (sql, params = []) => {
    try {
        const [rows] = await pool.promise().execute(sql, params);
        return rows;
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
};

// Helper function for executing queries with fields
const queryWithFields = async (sql, params = []) => {
    try {
        const [rows, fields] = await pool.promise().execute(sql, params);
        return { rows, fields };
    } catch (error) {
        console.error('Database query error:', error.message);
        throw error;
    }
};

module.exports = {
    pool: pool.promise(),
    testConnection,
    query,
    queryWithFields
};