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

// 检查并插入示例数据
const count = db.prepare(`SELECT COUNT(*) as count FROM books`).get();
if (count.count === 0) {
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

// API 路由
app.get('/api/books', (req, res) => {
    const rows = db.prepare(`SELECT * FROM books`).all();
    res.json(rows);
});

app.post('/api/books', (req, res) => {
    const { id, title, author, isbn } = req.body;
    const stmt = db.prepare(`INSERT INTO books (id, title, author, isbn, status, borrower) VALUES (?, ?, ?, ?, 'available', '')`);
    stmt.run(id, title, author, isbn);
    res.json({ success: true });
});

app.delete('/api/books/:id', (req, res) => {
    const { id } = req.params;
    db.prepare(`DELETE FROM books WHERE id = ?`).run(id);
    res.json({ success: true });
});

app.put('/api/books/:id/borrow', (req, res) => {
    const { id } = req.params;
    const { borrowerName, borrowDate } = req.body;
    db.prepare(`UPDATE books SET status = 'borrowed', borrower = ? WHERE id = ?`).run(borrowerName, id);
    const book = db.prepare(`SELECT title FROM books WHERE id = ?`).get(id);
    const recordId = Date.now() + '-' + Math.random().toString(36);
    db.prepare(`INSERT INTO borrow_records (id, book_id, book_title, borrower_name, borrow_date, return_date) VALUES (?, ?, ?, ?, ?, NULL)`).run(recordId, id, book.title, borrowerName, borrowDate);
    res.json({ success: true });
});

app.put('/api/books/:id/return', (req, res) => {
    const { id } = req.params;
    const { returnDate } = req.body;
    db.prepare(`UPDATE books SET status = 'available', borrower = '' WHERE id = ?`).run(id);
    db.prepare(`UPDATE borrow_records SET return_date = ? WHERE book_id = ? AND return_date IS NULL`).run(returnDate, id);
    res.json({ success: true });
});

app.get('/api/records', (req, res) => {
    const rows = db.prepare(`SELECT * FROM borrow_records ORDER BY borrow_date DESC`).all();
    res.json(rows);
});

app.get('/api/records/:studentName', (req, res) => {
    const { studentName } = req.params;
    const rows = db.prepare(`SELECT * FROM borrow_records WHERE borrower_name = ? ORDER BY borrow_date DESC`).all(studentName);
    res.json(rows);
});

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

app.listen(port, () => {
    console.log(`✅ 小懒图书馆后端启动成功！端口: ${port}`);
});