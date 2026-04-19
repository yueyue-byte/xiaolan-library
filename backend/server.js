// 后端服务器代码 - 小懒图书馆
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const port = 3000;

// 允许前端访问
app.use(cors());
// 让服务器能读懂 JSON 格式的数据
app.use(express.json());

// ---------- 连接数据库 ----------
const db = new sqlite3.Database('./library.db');

// ---------- 创建数据表（如果不存在）----------
db.serialize(() => {
    // 图书表
    db.run(`
        CREATE TABLE IF NOT EXISTS books (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            author TEXT NOT NULL,
            isbn TEXT,
            status TEXT DEFAULT 'available',
            borrower TEXT DEFAULT ''
        )
    `);
    
    // 借阅记录表
    db.run(`
        CREATE TABLE IF NOT EXISTS borrow_records (
            id TEXT PRIMARY KEY,
            book_id TEXT,
            book_title TEXT,
            borrower_name TEXT,
            borrow_date TEXT,
            return_date TEXT
        )
    `);
    
    // 插入一些示例图书（如果表是空的）
    db.get(`SELECT COUNT(*) as count FROM books`, (err, row) => {
        if (row.count === 0) {
            const sampleBooks = [
                ['book1', '深入理解计算机系统', 'Randal E. Bryant', '9787111544937', 'available', ''],
                ['book2', '你当像鸟飞往你的山', '塔拉·韦斯特弗', '9787544291165', 'available', ''],
                ['book3', '百年孤独', '加西亚·马尔克斯', '9787544253995', 'available', ''],
                ['book4', 'JavaScript高级程序设计', 'Nicholas C. Zakas', '9787115275790', 'available', ''],
                ['book5', '三体：黑暗森林', '刘慈欣', '9787229043353', 'available', '']
            ];
            const stmt = db.prepare(`INSERT INTO books (id, title, author, isbn, status, borrower) VALUES (?, ?, ?, ?, ?, ?)`);
            sampleBooks.forEach(book => stmt.run(book));
            stmt.finalize();
            console.log('✅ 已添加示例图书');
        }
    });
});

// ---------- API 接口 ----------

// 1. 获取所有图书
app.get('/api/books', (req, res) => {
    db.all(`SELECT * FROM books`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 2. 添加图书
app.post('/api/books', (req, res) => {
    const { id, title, author, isbn } = req.body;
    db.run(
        `INSERT INTO books (id, title, author, isbn, status, borrower) VALUES (?, ?, ?, ?, 'available', '')`,
        [id, title, author, isbn],
        function(err) {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true, message: '图书添加成功' });
        }
    );
});

// 3. 删除图书
app.delete('/api/books/:id', (req, res) => {
    const { id } = req.params;
    db.run(`DELETE FROM books WHERE id = ?`, [id], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json({ success: true });
    });
});

// 4. 借阅图书
app.put('/api/books/:id/borrow', (req, res) => {
    const { id } = req.params;
    const { borrowerName, borrowDate } = req.body;
    
    db.run(`UPDATE books SET status = 'borrowed', borrower = ? WHERE id = ?`, [borrowerName, id], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        db.get(`SELECT title FROM books WHERE id = ?`, [id], (err, book) => {
            const recordId = Date.now() + '-' + Math.random().toString(36);
            db.run(
                `INSERT INTO borrow_records (id, book_id, book_title, borrower_name, borrow_date, return_date) VALUES (?, ?, ?, ?, ?, NULL)`,
                [recordId, id, book.title, borrowerName, borrowDate],
                (err) => {
                    if (err) {
                        res.status(500).json({ error: err.message });
                        return;
                    }
                    res.json({ success: true });
                }
            );
        });
    });
});

// 5. 归还图书
app.put('/api/books/:id/return', (req, res) => {
    const { id } = req.params;
    const { returnDate } = req.body;
    
    db.run(`UPDATE books SET status = 'available', borrower = '' WHERE id = ?`, [id], (err) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        db.run(`UPDATE borrow_records SET return_date = ? WHERE book_id = ? AND return_date IS NULL`, [returnDate, id], (err) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }
            res.json({ success: true });
        });
    });
});

// 6. 获取所有借阅记录
app.get('/api/records', (req, res) => {
    db.all(`SELECT * FROM borrow_records ORDER BY borrow_date DESC`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 7. 获取某个学生的借阅记录
app.get('/api/records/:studentName', (req, res) => {
    const { studentName } = req.params;
    db.all(`SELECT * FROM borrow_records WHERE borrower_name = ? ORDER BY borrow_date DESC`, [studentName], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
            return;
        }
        res.json(rows);
    });
});

// 8. 登录验证
app.post('/api/login', (req, res) => {
    const { username, password, role } = req.body;
    if (role === 'student' && username === 'student' && password === '123456') {
        res.json({ success: true, role: 'student', displayName: '小懒同学' });
    } else if (role === 'admin' && username === 'admin' && password === 'admin123') {
        res.json({ success: true, role: 'admin', displayName: '小懒管理员' });
    } else {
        res.json({ success: false, message: '账号或密码错误' });
    }
});

// 启动服务器
app.listen(port, () => {
    console.log(`
    ╔══════════════════════════════════════╗
    ║   🎉 小懒图书馆后端启动成功！        ║
    ║                                      ║
    ║   地址: http://localhost:${port}      ║
    ║                                      ║
    ║   按 Ctrl+C 可以停止服务器           ║
    ╚══════════════════════════════════════╝
    `);
});