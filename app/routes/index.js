// TODO: Definisikan semua jalur (Route) aplikasi kalian disini (GET, POST, PUT, DELETE)
const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Helper function for authentication
const isAuthenticated = (req, res, next) => {
    if (req.session && req.session.userId) {
        return next();
    }
    res.redirect('/login');
};

const isAdmin = (req, res, next) => {
    if (req.session && req.session.role === 'admin') {
        return next();
    }
    res.status(403).render('error', {
        title: 'Access Denied',
        error: 'You need admin privileges to access this page.',
        user: getCurrentUser(req)
    });
};

// Helper untuk mendapatkan user dari session
const getCurrentUser = (req) => {
    if (req.session && req.session.userId) {
        return {
            id: req.session.userId,
            username: req.session.username || 'User',
            role: req.session.role || 'user',
            email: req.session.email || ''
        };
    }
    return null;
};

// ==================== HOMEPAGE ====================
router.get('/', async (req, res) => {
    try {
        const jobs = await db.query(`
            SELECT j.*, k.category_name 
            FROM jobs j 
            JOIN kategori k ON j.category_id = k.id 
            WHERE j.status = 'Open'
            ORDER BY j.deadline ASC
            LIMIT 6
        `);
        
        res.render('index', { 
            jobs, 
            title: 'HustLink - Portal Karir Terpadu',
            user: getCurrentUser(req)
        });
    } catch (error) {
        console.error('Homepage error:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            error: 'Failed to load homepage. Please try again later.',
            user: getCurrentUser(req)
        });
    }
});

// ==================== LOGIN ====================
router.get('/login', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('login', { 
        title: 'Login - HustLink',
        error: req.query.error || null,
        success: req.query.success || null,
        user: null
    });
});

router.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.render('login', {
            title: 'Login - HustLink',
            error: 'Username and password are required!',
            user: null
        });
    }
    
    try {
        const users = await db.query(
            'SELECT * FROM user WHERE username = ? AND password = ?',
            [username, password]
        );
        
        if (users.length > 0) {
            req.session.userId = users[0].id;
            req.session.username = users[0].username;
            req.session.role = users[0].role;
            req.session.email = users[0].email;
            
            console.log(`✅ User logged in: ${users[0].username} (${users[0].role})`);
            res.redirect('/dashboard');
        } else {
            res.render('login', { 
                title: 'Login - HustLink',
                error: 'Invalid username or password!',
                user: null
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', {
            title: 'Login - HustLink',
            error: 'Login failed. Please try again.',
            user: null
        });
    }
});

// ==================== LOGOUT ====================
router.get('/logout', (req, res) => {
    if (req.session) {
        console.log(`👋 User logged out: ${req.session.username || 'Unknown'}`);
        req.session.destroy();
    }
    res.redirect('/');
});

// ==================== REGISTER ====================
router.get('/register', (req, res) => {
    if (req.session.userId) {
        return res.redirect('/dashboard');
    }
    res.render('register', { 
        title: 'Register - HustLink',
        error: null,
        user: null
    });
});

router.post('/register', async (req, res) => {
    const { username, password, email, alamat } = req.body;
    
    // Validation
    if (!username || !password || !email) {
        return res.render('register', {
            title: 'Register - HustLink',
            error: 'Username, password, and email are required!',
            user: null
        });
    }
    
    if (password.length < 3) {
        return res.render('register', {
            title: 'Register - HustLink',
            error: 'Password must be at least 3 characters!',
            user: null
        });
    }
    
    try {
        // Check if username or email already exists
        const existingUsers = await db.query(
            'SELECT id FROM user WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existingUsers.length > 0) {
            return res.render('register', {
                title: 'Register - HustLink',
                error: 'Username or email already exists!',
                user: null
            });
        }
        
        // Insert new user
        await db.query(
            'INSERT INTO user (username, password, email, Alamat, role) VALUES (?, ?, ?, ?, "user")',
            [username, password, email, alamat || '']
        );
        
        console.log(`✅ New user registered: ${username}`);
        res.redirect('/login?success=Registration successful! Please login.');
        
    } catch (error) {
        console.error('Registration error:', error);
        res.render('register', {
            title: 'Register - HustLink',
            error: 'Registration failed. Please try again.',
            user: null
        });
    }
});

// ==================== DASHBOARD ====================
router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const user = getCurrentUser(req);
        
        if (user.role === 'admin') {
            // Admin Dashboard
            const [jobs, applicants, categories] = await Promise.all([
                db.query(`
                    SELECT j.*, k.category_name 
                    FROM jobs j 
                    JOIN kategori k ON j.category_id = k.id 
                    ORDER BY j.created_at DESC
                `),
                db.query(`
                    SELECT a.*, u.username, u.email, k.category_name 
                    FROM applicant a 
                    JOIN user u ON a.Id_User = u.id
                    JOIN kategori k ON a.id_kategori = k.id
                    ORDER BY a.Date DESC
                `),
                db.query('SELECT * FROM kategori ORDER BY category_name')
            ]);
            
            res.render('admin/dashboard', {
                jobs,
                applicants,
                categories,
                user,
                title: 'Admin Dashboard - HustLink',
                success: req.query.success,
                error: req.query.error
            });
            
        } else {
            // User Dashboard
            const [jobs, applications] = await Promise.all([
                db.query(`
                    SELECT j.*, k.category_name 
                    FROM jobs j 
                    JOIN kategori k ON j.category_id = k.id 
                    WHERE j.status = 'Open'
                    ORDER BY j.created_at DESC
                    LIMIT 10
                `),
                db.query(`
                    SELECT a.*, k.category_name 
                    FROM applicant a 
                    JOIN kategori k ON a.id_kategori = k.id
                    WHERE a.Id_User = ?
                    ORDER BY a.Date DESC
                `, [user.id])
            ]);
            
            res.render('user/dashboard', {
                jobs,
                applications,
                user,
                title: 'My Dashboard - HustLink',
                success: req.query.success,
                error: req.query.error
            });
        }
    } catch (error) {
        console.error('Dashboard error:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            error: 'Failed to load dashboard.',
            user: getCurrentUser(req)
        });
    }
});

// ==================== JOBS ====================
// List all jobs
router.get('/jobs', async (req, res) => {
    try {
        const jobs = await db.query(`
            SELECT j.*, k.category_name 
            FROM jobs j 
            JOIN kategori k ON j.category_id = k.id 
            ORDER BY j.created_at DESC
        `);
        
        res.render('jobs/list', {
            jobs,
            title: 'All Jobs - HustLink',
            user: getCurrentUser(req)
        });
    } catch (error) {
        console.error('Jobs list error:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            error: 'Failed to load jobs.',
            user: getCurrentUser(req)
        });
    }
});

// Job detail
router.get('/jobs/:id', async (req, res) => {
    try {
        const jobs = await db.query(`
            SELECT j.*, k.category_name 
            FROM jobs j 
            JOIN kategori k ON j.category_id = k.id 
            WHERE j.id = ?
        `, [req.params.id]);
        
        if (jobs.length === 0) {
            return res.status(404).render('404', {
                title: 'Job Not Found',
                user: getCurrentUser(req)
            });
        }
        
        res.render('jobs/detail', {
            job: jobs[0],
            title: `${jobs[0].title} - HustLink`,
            user: getCurrentUser(req)
        });
    } catch (error) {
        console.error('Job detail error:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            error: 'Failed to load job details.',
            user: getCurrentUser(req)
        });
    }
});

// ==================== CREATE JOB (Admin) ====================
router.get('/jobs/create', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const categories = await db.query('SELECT * FROM kategori ORDER BY category_name');
        
        res.render('jobs/create', {
            categories,
            title: 'Create New Job - HustLink',
            user: getCurrentUser(req)
        });
    } catch (error) {
        console.error('Create job form error:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            error: 'Failed to load create job form.',
            user: getCurrentUser(req)
        });
    }
});

router.post('/jobs/create', isAuthenticated, isAdmin, async (req, res) => {
    const { title, description, requirement, deadline, category_id, status = 'Open' } = req.body;
    
    if (!title || !description || !requirement || !deadline || !category_id) {
        return res.render('jobs/create', {
            categories: await db.query('SELECT * FROM kategori ORDER BY category_name'),
            title: 'Create New Job - HustLink',
            user: getCurrentUser(req),
            error: 'All fields are required!'
        });
    }
    
    try {
        await db.query(
            'INSERT INTO jobs (title, description, requirement, deadline, category_id, status) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, requirement, deadline, category_id, status]
        );
        
        res.redirect('/dashboard?success=Job created successfully!');
    } catch (error) {
        console.error('Create job error:', error);
        res.render('jobs/create', {
            categories: await db.query('SELECT * FROM kategori ORDER BY category_name'),
            title: 'Create New Job - HustLink',
            user: getCurrentUser(req),
            error: 'Failed to create job. Please try again.'
        });
    }
});

// ==================== EDIT JOB (Admin) ====================
router.get('/jobs/:id/edit', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const [job] = await db.query('SELECT * FROM jobs WHERE id = ?', [req.params.id]);
        const categories = await db.query('SELECT * FROM kategori ORDER BY category_name');
        
        if (!job) {
            return res.status(404).render('404', {
                title: 'Job Not Found',
                user: getCurrentUser(req)
            });
        }
        
        res.render('jobs/edit', {
            job,
            categories,
            title: 'Edit Job - HustLink',
            user: getCurrentUser(req)
        });
    } catch (error) {
        console.error('Edit job form error:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            error: 'Failed to load edit form.',
            user: getCurrentUser(req)
        });
    }
});

router.post('/jobs/:id/update', isAuthenticated, isAdmin, async (req, res) => {
    const { title, description, requirement, deadline, status, category_id } = req.body;
    
    try {
        await db.query(
            'UPDATE jobs SET title = ?, description = ?, requirement = ?, deadline = ?, status = ?, category_id = ? WHERE id = ?',
            [title, description, requirement, deadline, status, category_id, req.params.id]
        );
        
        res.redirect('/dashboard?success=Job updated successfully!');
    } catch (error) {
        console.error('Update job error:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            error: 'Failed to update job.',
            user: getCurrentUser(req)
        });
    }
});

// ==================== DELETE JOB (Admin) ====================
router.post('/jobs/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM jobs WHERE id = ?', [req.params.id]);
        res.redirect('/dashboard?success=Job deleted successfully!');
    } catch (error) {
        console.error('Delete job error:', error);
        res.redirect('/dashboard?error=Failed to delete job');
    }
});

// ==================== APPLY FOR JOB (User) ====================
router.post('/apply/:job_id', isAuthenticated, async (req, res) => {
    const user = getCurrentUser(req);
    
    if (user.role === 'admin') {
        return res.status(403).render('error', {
            title: 'Access Denied',
            error: 'Admins cannot apply for jobs.',
            user
        });
    }
    
    try {
        // Check if job exists and is open
        const [job] = await db.query(
            'SELECT * FROM jobs WHERE id = ? AND status = "Open"',
            [req.params.job_id]
        );
        
        if (!job) {
            return res.status(404).render('error', {
                title: 'Job Not Found',
                error: 'Job not found or no longer accepting applications.',
                user
            });
        }
        
        // Check if already applied
        const existingApplication = await db.query(`
            SELECT a.* 
            FROM applicant a 
            JOIN jobs j ON a.id_kategori = j.category_id 
            WHERE a.Id_User = ? AND j.id = ?
        `, [user.id, req.params.job_id]);
        
        if (existingApplication.length > 0) {
            return res.redirect('/dashboard?error=You have already applied for this job');
        }
        
        // Apply for job
        await db.query(
            'INSERT INTO applicant (Id_User, id_kategori, Date) VALUES (?, ?, NOW())',
            [user.id, job.category_id]
        );
        
        res.redirect('/dashboard?success=Application submitted successfully!');
    } catch (error) {
        console.error('Apply job error:', error);
        res.redirect('/dashboard?error=Failed to apply for job');
    }
});

// ==================== WITHDRAW APPLICATION (User) ====================
router.post('/applications/:id/withdraw', isAuthenticated, async (req, res) => {
    try {
        const user = getCurrentUser(req);
        
        await db.query(
            'DELETE FROM applicant WHERE id = ? AND Id_User = ?',
            [req.params.id, user.id]
        );
        
        res.redirect('/dashboard?success=Application withdrawn successfully!');
    } catch (error) {
        console.error('Withdraw application error:', error);
        res.redirect('/dashboard?error=Failed to withdraw application');
    }
});

// ==================== PROFILE ====================
router.get('/profile', isAuthenticated, async (req, res) => {
    try {
        const [userData] = await db.query('SELECT * FROM user WHERE id = ?', [req.session.userId]);
        
        if (!userData) {
            req.session.destroy();
            return res.redirect('/login');
        }
        
        res.render('profile', {
            user: userData,
            title: 'My Profile - HustLink',
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            error: 'Failed to load profile.',
            user: getCurrentUser(req)
        });
    }
});

router.post('/profile/update', isAuthenticated, async (req, res) => {
    const { username, email, alamat } = req.body;
    const userId = req.session.userId;
    
    if (!username || !email) {
        return res.redirect('/profile?error=Username and email are required');
    }
    
    try {
        await db.query(
            'UPDATE user SET username = ?, email = ?, Alamat = ? WHERE id = ?',
            [username, email, alamat || '', userId]
        );
        
        // Update session
        req.session.username = username;
        req.session.email = email;
        
        res.redirect('/profile?success=Profile updated successfully!');
    } catch (error) {
        console.error('Update profile error:', error);
        res.redirect('/profile?error=Failed to update profile');
    }
});

// ==================== ADMIN CATEGORIES ====================
router.get('/categories', isAuthenticated, isAdmin, async (req, res) => {
    try {
        const categories = await db.query('SELECT * FROM kategori ORDER BY category_name');
        
        res.render('admin/categories', {
            categories,
            title: 'Manage Categories - HustLink',
            user: getCurrentUser(req),
            success: req.query.success,
            error: req.query.error
        });
    } catch (error) {
        console.error('Categories error:', error);
        res.status(500).render('error', {
            title: 'Server Error',
            error: 'Failed to load categories.',
            user: getCurrentUser(req)
        });
    }
});

router.post('/categories/add', isAuthenticated, isAdmin, async (req, res) => {
    const { category_name } = req.body;
    
    if (!category_name || category_name.trim().length === 0) {
        return res.redirect('/categories?error=Category name is required');
    }
    
    try {
        await db.query(
            'INSERT INTO kategori (category_name) VALUES (?)',
            [category_name.trim()]
        );
        
        res.redirect('/categories?success=Category added successfully!');
    } catch (error) {
        console.error('Add category error:', error);
        res.redirect('/categories?error=Failed to add category');
    }
});

router.post('/categories/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
    try {
        // Check if category is being used
        const jobsUsingCategory = await db.query(
            'SELECT id FROM jobs WHERE category_id = ? LIMIT 1',
            [req.params.id]
        );
        
        if (jobsUsingCategory.length > 0) {
            return res.redirect('/categories?error=Cannot delete category that is being used by jobs');
        }
        
        await db.query('DELETE FROM kategori WHERE id = ?', [req.params.id]);
        res.redirect('/categories?success=Category deleted successfully!');
    } catch (error) {
        console.error('Delete category error:', error);
        res.redirect('/categories?error=Failed to delete category');
    }
});

// ==================== ADMIN APPLICATIONS ====================
router.post('/admin/applications/:id/delete', isAuthenticated, isAdmin, async (req, res) => {
    try {
        await db.query('DELETE FROM applicant WHERE id = ?', [req.params.id]);
        res.redirect('/dashboard?success=Application deleted successfully!');
    } catch (error) {
        console.error('Delete application error:', error);
        res.redirect('/dashboard?error=Failed to delete application');
    }
});

// ==================== ABOUT PAGE ====================
router.get('/about', (req, res) => {
    res.render('about', {
        title: 'About HustLink - Portal Karir Terpadu',
        user: getCurrentUser(req)
    });
});

// ==================== CONTACT PAGE ====================
router.get('/contact', (req, res) => {
    res.render('contact', {
        title: 'Contact Us - HustLink',
        user: getCurrentUser(req)
    });
});

module.exports = router;