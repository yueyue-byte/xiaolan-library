const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = new Database('/tmp/library.db');

// ------------------- 创建表 -------------------
// 图书表
db.exec(`
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
db.exec(`
    CREATE TABLE IF NOT EXISTS borrow_records (
        id TEXT PRIMARY KEY,
        book_id TEXT,
        book_title TEXT,
        borrower_name TEXT,
        borrow_date TEXT,
        return_date TEXT
    )
`);

// 用户表
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT,
        role TEXT DEFAULT 'student',
        created_at TEXT
    )
`);

// ------------------- 初始化数据 -------------------
// 默认用户（如果不存在）
const adminExists = db.prepare(`SELECT * FROM users WHERE username = 'admin'`).get();
if (!adminExists) {
    const insertUser = db.prepare(`INSERT INTO users (id, username, password, nickname, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
    insertUser.run('user_admin', 'admin', 'admin123', '系统管理员', 'admin', new Date().toISOString());
    insertUser.run('user_student', 'student', '123456', '小懒同学', 'student', new Date().toISOString());
    console.log('✅ 已添加默认用户: admin / student');
}

// 示例图书（如果表为空）
const bookCount = db.prepare(`SELECT COUNT(*) as count FROM books`).get();
if (bookCount.count === 0) {
    const insertBook = db.prepare(`INSERT INTO books (id, title, author, isbn, status, borrower) VALUES (?, ?, ?, ?, ?, ?)`);
    // 这里为了节省篇幅，只列出前几本作为示例，实际运行时您可以使用之前150本的完整数组。
    // 为了确保代码可运行，此处先插入少量图书，您也可以自行替换为完整150本数组。
    const sampleBooks = [
        ['book1', '深入理解计算机系统', 'Randal E. Bryant', '9787111544937', 'available', ''],
        ['book2', '你当像鸟飞往你的山', '塔拉·韦斯特弗', '9787544291165', 'available', ''],
        ['book3', '百年孤独', '加西亚·马尔克斯', '9787544253995', 'available', ''],
        ['book4', 'JavaScript高级程序设计', 'Nicholas C. Zakas', '9787115275790', 'available', ''],
        ['book5', '三体：黑暗森林', '刘慈欣', '9787229043353', 'available', '']
    ];
    sampleBooks.forEach(book => insertBook.run(book));
    console.log('✅ 已添加示例图书（可自行扩展至150本）');
}

// ------------------- API 路由 -------------------

// 1. 获取所有图书
app.get('/api/books', (req, res) => {
    const rows = db.prepare(`SELECT * FROM books`).all();
    res.json(rows);
});

// 2. 添加图书（管理员）
app.post('/api/books', (req, res) => {
    const { id, title, author, isbn } = req.body;
    db.prepare(`INSERT INTO books (id, title, author, isbn, status, borrower) VALUES (?, ?, ?, ?, 'available', '')`).run(id, title, author, isbn);
    res.json({ success: true });
});

// 3. 删除图书（管理员）
app.delete('/api/books/:id', (req, res) => {
    db.prepare(`DELETE FROM books WHERE id = ?`).run(req.params.id);
    res.json({ success: true });
});

// 4. 借阅图书（限制每人最多4本）
app.put('/api/books/:id/borrow', (req, res) => {
    const { id } = req.params;
    const { borrowerName, borrowDate } = req.body;

    const book = db.prepare(`SELECT * FROM books WHERE id = ?`).get(id);
    if (!book || book.status !== 'available') {
        return res.status(400).json({ error: '图书不可借' });
    }

    const borrowedCount = db.prepare(
        `SELECT COUNT(*) as count FROM borrow_records WHERE borrower_name = ? AND return_date IS NULL`
    ).get(borrowerName).count;

    if (borrowedCount >= 4) {
        return res.status(400).json({ error: '每人最多同时借阅4本书，请先归还部分图书' });
    }

    db.prepare(`UPDATE books SET status = 'borrowed', borrower = ? WHERE id = ?`).run(borrowerName, id);
    const recordId = Date.now() + '-' + Math.random().toString(36);
    db.prepare(`INSERT INTO borrow_records (id, book_id, book_title, borrower_name, borrow_date, return_date) VALUES (?, ?, ?, ?, ?, NULL)`)
        .run(recordId, id, book.title, borrowerName, borrowDate);

    res.json({ success: true });
});

// 5. 归还图书
app.put('/api/books/:id/return', (req, res) => {
    const { id } = req.params;
    const { returnDate } = req.body;
    const book = db.prepare(`SELECT * FROM books WHERE id = ?`).get(id);
    if (!book || book.status !== 'borrowed') {
        return res.status(400).json({ error: '图书未借出' });
    }
    db.prepare(`UPDATE books SET status = 'available', borrower = '' WHERE id = ?`).run(id);
    db.prepare(`UPDATE borrow_records SET return_date = ? WHERE book_id = ? AND return_date IS NULL`).run(returnDate, id);
    res.json({ success: true });
});

// 6. 获取所有借阅记录（管理员）
app.get('/api/records', (req, res) => {
    const rows = db.prepare(`SELECT * FROM borrow_records ORDER BY borrow_date DESC`).all();
    res.json(rows);
});

// 7. 获取某个用户的借阅记录
app.get('/api/records/:username', (req, res) => {
    const rows = db.prepare(`SELECT * FROM borrow_records WHERE borrower_name = ? ORDER BY borrow_date DESC`).all(req.params.username);
    res.json(rows);
});

// 8. 登录验证（查用户表）
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare(`SELECT * FROM users WHERE username = ? AND password = ?`).get(username, password);
    if (user) {
        res.json({ success: true, role: user.role, displayName: user.nickname || user.username, username: user.username });
    } else {
        res.json({ success: false, message: '账号或密码错误' });
    }
});

// 9. 用户注册
app.post('/api/register', (req, res) => {
    const { username, password, nickname } = req.body;
    if (!username || !password) {
        return res.json({ success: false, message: '用户名和密码不能为空' });
    }
    const existing = db.prepare(`SELECT * FROM users WHERE username = ?`).get(username);
    if (existing) {
        return res.json({ success: false, message: '用户名已存在' });
    }
    const id = 'user_' + Date.now() + '_' + Math.random().toString(36);
    const createdAt = new Date().toISOString();
    const stmt = db.prepare(`INSERT INTO users (id, username, password, nickname, role, created_at) VALUES (?, ?, ?, ?, 'student', ?)`);
    stmt.run(id, username, password, nickname || '', createdAt);
    res.json({ success: true, message: '注册成功，请登录' });
});

// 10. 获取所有用户（管理员）
app.get('/api/users', (req, res) => {
    const rows = db.prepare(`SELECT id, username, nickname, role, created_at FROM users`).all();
    res.json(rows);
});

// 11. 重置用户密码（管理员）
app.put('/api/users/:username/reset', (req, res) => {
    const { username } = req.params;
    const { newPassword } = req.body;
    db.prepare(`UPDATE users SET password = ? WHERE username = ?`).run(newPassword, username);
    res.json({ success: true });
});

// 12. 删除用户（管理员，不能删除admin）
app.delete('/api/users/:username', (req, res) => {
    const { username } = req.params;
    if (username === 'admin') {
        return res.status(403).json({ error: '不能删除管理员账户' });
    }
    db.prepare(`DELETE FROM users WHERE username = ?`).run(username);
    res.json({ success: true });
});

app.listen(port, () => console.log(`✅ 小懒图书馆后端启动成功！端口: ${port}`));