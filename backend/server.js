const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 连接数据库（better-sqlite3 是同步的）
const db = new Database('/tmp/library.db');

// 创建表
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

// 检查并插入默认管理员和学生（如果不存在）
const adminExists = db.prepare(`SELECT * FROM users WHERE username = 'admin'`).get();
if (!adminExists) {
    const insert = db.prepare(`INSERT INTO users (id, username, password, nickname, role, created_at) VALUES (?, ?, ?, ?, ?, ?)`);
    insert.run('user1', 'admin', 'admin123', '系统管理员', 'admin', new Date().toISOString());
    insert.run('user2', 'student', '123456', '小懒同学', 'student', new Date().toISOString());
    console.log('✅ 已添加默认用户: admin / student');
}

// 检查并插入示例图书（如果表是空的）
const bookCount = db.prepare(`SELECT COUNT(*) as count FROM books`).get();
if (bookCount.count === 0) {
    const insert = db.prepare(`INSERT INTO books (id, title, author, isbn, status, borrower) VALUES (?, ?, ?, ?, ?, ?)`);
    const sampleBooks = [
        ['book1', '深入理解计算机系统', 'Randal E. Bryant', '9787111544937', 'available', ''],
        ['book2', '你当像鸟飞往你的山', '塔拉·韦斯特弗', '9787544291165', 'available', ''],
        ['book3', '百年孤独', '加西亚·马尔克斯', '9787544253995', 'available', ''],
        ['book4', 'JavaScript高级程序设计', 'Nicholas C. Zakas', '9787115275790', 'available', ''],
        ['book5', '三体：黑暗森林', '刘慈欣', '9787229043353', 'available', '']
    ];
    sampleBooks.forEach(book => insert.run(book));
    console.log('✅ 已添加示例图书');
}

// ---------- API 接口 ----------

// 1. 获取所有图书
app.get('/api/books', (req, res) => {
    const rows = db.prepare(`SELECT * FROM books`).all();
    res.json(rows);
});

// 2. 添加图书
app.post('/api/books', (req, res) => {
    const { id, title, author, isbn } = req.body;
    const stmt = db.prepare(`INSERT INTO books (id, title, author, isbn, status, borrower) VALUES (?, ?, ?, ?, 'available', '')`);
    stmt.run(id, title, author, isbn);
    res.json({ success: true });
});

// 3. 删除图书
app.delete('/api/books/:id', (req, res) => {
    const { id } = req.params;
    db.prepare(`DELETE FROM books WHERE id = ?`).run(id);
    res.json({ success: true });
});

// 4. 借阅图书
app.put('/api/books/:id/borrow', (req, res) => {
    const { id } = req.params;
    const { borrowerName, borrowDate } = req.body;
    const book = db.prepare(`SELECT * FROM books WHERE id = ?`).get(id);
    if (!book || book.status !== 'available') {
        return res.status(400).json({ error: '图书不可借' });
    }
    db.prepare(`UPDATE books SET status = 'borrowed', borrower = ? WHERE id = ?`).run(borrowerName, id);
    const recordId = Date.now() + '-' + Math.random().toString(36);
    db.prepare(`INSERT INTO borrow_records (id, book_id, book_title, borrower_name, borrow_date, return_date) VALUES (?, ?, ?, ?, ?, NULL)`).run(recordId, id, book.title, borrowerName, borrowDate);
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

// 6. 获取所有借阅记录
app.get('/api/records', (req, res) => {
    const rows = db.prepare(`SELECT * FROM borrow_records ORDER BY borrow_date DESC`).all();
    res.json(rows);
});

// 7. 获取某个用户的借阅记录
app.get('/api/records/:username', (req, res) => {
    const { username } = req.params;
    const rows = db.prepare(`SELECT * FROM borrow_records WHERE borrower_name = ? ORDER BY borrow_date DESC`).all(username);
    res.json(rows);
});

// 8. 登录验证
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare(`SELECT * FROM users WHERE username = ? AND password = ?`).get(username, password);
    if (user) {
        res.json({ success: true, role: user.role, displayName: user.nickname || user.username, username: user.username });
    } else {
        res.json({ success: false, message: '账号或密码错误' });
    }
});

// 9. 注册新用户
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

// 12. 删除用户（管理员）
app.delete('/api/users/:username', (req, res) => {
    const { username } = req.params;
    if (username === 'admin') {
        return res.status(403).json({ error: '不能删除管理员账户' });
    }
    db.prepare(`DELETE FROM users WHERE username = ?`).run(username);
    res.json({ success: true });
});

app.listen(port, () => {
    console.log(`✅ 小懒图书馆后端启动成功！端口: ${port}`);
});