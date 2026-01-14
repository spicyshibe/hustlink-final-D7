// TODO: Ini adalah titik masuk aplikasi, setup Express, Middleware, dan Server Listener disini
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const db = require('./config/database');

const app = express();
const port = process.env.APP_PORT || 3000;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'hustlink-secret-key-2024',
    resave: false,
    saveUninitialized: true,
    cookie: { 
        secure: false, // Set true if using HTTPS
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Set view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'view'));

// Routes
const routes = require('./routes');
app.use('/', routes);

// 404 Error handler
app.use((req, res) => {
    res.status(404).render('404', { 
        title: 'Page Not Found',
        user: req.session.userId ? { 
            id: req.session.userId, 
            role: req.session.role,
            username: req.session.username 
        } : null
    });
});

// Global error handler
app.use((err, req, res, next) => {
    console.error('Error:', err.stack);
    res.status(500).render('error', { 
        title: 'Server Error',
        error: err.message,
        user: req.session.userId ? { 
            id: req.session.userId, 
            role: req.session.role,
            username: req.session.username 
        } : null
    });
});

// Start server
const startServer = async () => {
    try {
        // Test database connection
        const isConnected = await db.testConnection();
        
        if (isConnected) {
            app.listen(port, '0.0.0.0', () => {
                console.log(`=================================`);
                console.log(`🚀 HustLink Server is running!`);
                console.log(`📍 Port: ${port}`);
                console.log(`📁 Environment: ${process.env.NODE_ENV || 'development'}`);
                console.log(`=================================`);
            });
        } else {
            console.error('❌ Failed to connect to database. Server not started.');
            process.exit(1);
        }
    } catch (error) {
        console.error('❌ Error starting server:', error.message);
        process.exit(1);
    }
};

startServer();

module.exports = app;