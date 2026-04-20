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
        ['book5', '三体：黑暗森林', '刘慈欣', '9787229043353', 'available', ''],
        ['book6', '三体', '刘慈欣', '9787229043350', 'available', ''],
        ['book7', '三体3：死神永生', '刘慈欣', '9787229043351', 'available', ''],
        ['book8', '流浪地球', '刘慈欣', '9787536692930', 'available', ''],
        ['book9', '白夜行', '东野圭吾', '9787544258600', 'available', ''],
        ['book10', '解忧杂货店', '东野圭吾', '9787544270870', 'available', ''],
        ['book11', '挪威的森林', '村上春树', '9787532725728', 'available', ''],
        ['book12', '海边的卡夫卡', '村上春树', '9787532733419', 'available', ''],
        ['book13', '1984', '乔治·奥威尔', '9787544253993', 'available', ''],
        ['book14', '动物农场', '乔治·奥威尔', '9787544253994', 'available', ''],
        ['book15', '围城', '钱钟书', '9787020030006', 'available', ''],
        ['book16', '活着', '余华', '9787530211304', 'available', ''],
        ['book17', '许三观卖血记', '余华', '9787530211311', 'available', ''],
        ['book18', '平凡的世界', '路遥', '9787020049298', 'available', ''],
        ['book19', '白鹿原', '陈忠实', '9787020029284', 'available', ''],
        ['book20', '黄金时代', '王小波', '9787020036084', 'available', ''],
        ['book21', '沉默的大多数', '王小波', '9787020036091', 'available', ''],
        ['book22', '人类简史', '尤瓦尔·赫拉利', '9787508647351', 'available', ''],
        ['book23', '未来简史', '尤瓦尔·赫拉利', '9787508670732', 'available', ''],
        ['book24', '今日简史', '尤瓦尔·赫拉利', '9787508681652', 'available', ''],
        ['book25', '时间简史', '史蒂芬·霍金', '9787535733230', 'available', ''],
        ['book26', '果壳中的宇宙', '史蒂芬·霍金', '9787535736071', 'available', ''],
        ['book27', '万物简史', '比尔·布莱森', '9787544700892', 'available', ''],
        ['book28', '自私的基因', '理查德·道金斯', '9787508634269', 'available', ''],
        ['book29', '基因传', '悉达多·穆克吉', '9787521702051', 'available', ''],
        ['book30', '癌症传', '悉达多·穆克吉', '9787521702068', 'available', ''],
        ['book31', '从一到无穷大', '乔治·伽莫夫', '9787535762520', 'available', ''],
        ['book32', '上帝掷骰子吗', '曹天元', '9787535731168', 'available', ''],
        ['book33', '浪潮之巅', '吴军', '9787115361400', 'available', ''],
        ['book34', '数学之美', '吴军', '9787115384300', 'available', ''],
        ['book35', '文明之光', '吴军', '9787115404916', 'available', ''],
        ['book36', '智能时代', '吴军', '9787121324006', 'available', ''],
        ['book37', '编程珠玑', 'Jon Bentley', '9787115140999', 'available', ''],
        ['book38', '算法导论', 'Thomas H. Cormen', '9787115092786', 'available', ''],
        ['book39', '设计数据密集型应用', 'Martin Kleppmann', '9787115486585', 'available', ''],
        ['book40', '重构', 'Martin Fowler', '9787115219602', 'available', ''],
        ['book41', '代码大全', 'Steve McConnell', '9787121111415', 'available', ''],
        ['book42', '人月神话', 'Frederick P. Brooks', '9787111123941', 'available', ''],
        ['book43', '黑客与画家', 'Paul Graham', '9787115210456', 'available', ''],
        ['book44', '浪潮之巅', '吴军', '9787115361400', 'available', ''],
        ['book45', 'Unix编程艺术', 'Eric S. Raymond', '9787121006094', 'available', ''],
        ['book46', 'Linux内核设计与实现', 'Robert Love', '9787111216742', 'available', ''],
        ['book47', 'TCP/IP详解', 'W. Richard Stevens', '9787111113904', 'available', ''],
        ['book48', 'HTTP权威指南', 'David Gourley', '9787115252319', 'available', ''],
        ['book49', 'JavaScript语言精粹', 'Douglas Crockford', '9787121091250', 'available', ''],
        ['book50', '你不知道的JavaScript', 'Kyle Simpson', '9787115426646', 'available', ''],
        ['book51', 'CSS权威指南', 'Eric A. Meyer', '9787115275738', 'available', ''],
        ['book52', 'HTML5权威指南', 'Adam Freeman', '9787115335784', 'available', ''],
        ['book53', 'React进阶之路', '徐超', '9787121324952', 'available', ''],
        ['book54', 'Vue.js实战', '梁灏', '9787302491709', 'available', ''],
        ['book55', 'Node.js实战', 'Mike Cantelon', '9787115304957', 'available', ''],
        ['book56', 'Python编程从入门到实践', 'Eric Matthes', '9787115428022', 'available', ''],
        ['book57', '流畅的Python', 'Luciano Ramalho', '9787115344618', 'available', ''],
        ['book58', '利用Python进行数据分析', 'Wes McKinney', '9787115392329', 'available', ''],
        ['book59', '机器学习实战', 'Peter Harrington', '9787115326542', 'available', ''],
        ['book60', '深度学习', 'Ian Goodfellow', '9787115462767', 'available', ''],
        ['book61', '统计学习导论', 'Gareth James', '9787115406101', 'available', ''],
        ['book62', '西瓜书：机器学习', '周志华', '9787302423281', 'available', ''],
        ['book63', '统计学习方法', '李航', '9787302275958', 'available', ''],
        ['book64', 'Python核心编程', 'Wesley Chun', '9787115363817', 'available', ''],
        ['book65', 'Effective Python', 'Brett Slatkin', '9787115412997', 'available', ''],
        ['book66', 'Django企业开发实战', '胡阳', '9787121344110', 'available', ''],
        ['book67', 'Flask Web开发', 'Miguel Grinberg', '9787115375025', 'available', ''],
        ['book68', 'Spring实战', 'Craig Walls', '9787115406248', 'available', ''],
        ['book69', 'Java编程思想', 'Bruce Eckel', '9787111213826', 'available', ''],
        ['book70', 'Effective Java', 'Joshua Bloch', '9787111314660', 'available', ''],
        ['book71', '深入理解Java虚拟机', '周志明', '9787121245622', 'available', ''],
        ['book72', 'Java并发编程实战', 'Brian Goetz', '9787115301789', 'available', ''],
        ['book73', 'Go程序设计语言', 'Alan A. A. Donovan', '9787115503336', 'available', ''],
        ['book74', 'Go语言实战', 'William Kennedy', '9787121301137', 'available', ''],
        ['book75', 'Rust编程', 'Jim Blandy', '9787115468707', 'available', ''],
        ['book76', '汇编语言', '王爽', '9787302227254', 'available', ''],
        ['book77', '计算机组成与设计', 'David A. Patterson', '9787115297952', 'available', ''],
        ['book78', '操作系统概念', 'Abraham Silberschatz', '9787115148209', 'available', ''],
        ['book79', '现代操作系统', 'Andrew S. Tanenbaum', '9787115174109', 'available', ''],
        ['book80', '数据库系统概念', 'Abraham Silberschatz', '9787115166470', 'available', ''],
        ['book81', 'SQL必知必会', 'Ben Forta', '9787115301659', 'available', ''],
        ['book82', '高性能MySQL', 'Baron Schwartz', '9787115352477', 'available', ''],
        ['book83', 'Redis设计与实现', '黄健宏', '9787115360380', 'available', ''],
        ['book84', 'Kafka权威指南', 'Neha Narkhede', '9787115429784', 'available', ''],
        ['book85', 'Docker实战', 'Jeff Nickoloff', '9787115388131', 'available', ''],
        ['book86', 'Kubernetes in Action', 'Marko Lukša', '9787115451631', 'available', ''],
        ['book87', '微服务设计', 'Sam Newman', '9787115375100', 'available', ''],
        ['book88', '架构整洁之道', 'Robert C. Martin', '9787115405739', 'available', ''],
        ['book89', '领域驱动设计', 'Eric Evans', '9787115219848', 'available', ''],
        ['book90', '实现领域驱动设计', 'Vaughn Vernon', '9787121264135', 'available', ''],
        ['book91', '软技能', 'John Sonmez', '9787115385901', 'available', ''],
        ['book92', '程序员修炼之道', 'David Thomas', '9787121084474', 'available', ''],
        ['book93', '代码整洁之道', 'Robert C. Martin', '9787115216878', 'available', ''],
        ['book94', '设计模式', 'Erich Gamma', '9787111075745', 'available', ''],
        ['book95', 'Head First设计模式', 'Eric Freeman', '9787121111392', 'available', ''],
        ['book96', '人件', 'Tom DeMarco', '9787115123329', 'available', ''],
        ['book97', '持续交付', 'Jez Humble', '9787115320236', 'available', ''],
        ['book98', 'DevOps实践指南', 'Gene Kim', '9787121344349', 'available', ''],
        ['book99', 'SRE：Google运维解密', 'Betsy Beyer', '9787115433026', 'available', ''],
        ['book100', '凤凰项目', 'Gene Kim', '9787115465935', 'available', ''],
        ['book101', '刻意练习', 'Anders Ericsson', '9787115483720', 'available', ''],
        ['book102', '学会提问', 'Neil Browne', '9787111415436', 'available', ''],
        ['book103', '思考快与慢', '丹尼尔·卡尼曼', '9787508614872', 'available', ''],
        ['book104', '穷查理宝典', '查理·芒格', '9787201088514', 'available', ''],
        ['book105', '原则', '瑞·达利欧', '9787508680648', 'available', ''],
        ['book106', '纳瓦尔宝典', '埃里克·乔根森', '9787521703669', 'available', ''],
        ['book107', '影响力', '罗伯特·西奥迪尼', '9787566102254', 'available', ''],
        ['book108', '非暴力沟通', '马歇尔·卢森堡', '9787115408921', 'available', ''],
        ['book109', '亲密关系', '罗兰·米勒', '9787115408938', 'available', ''],
        ['book110', '社会心理学', '戴维·迈尔斯', '9787115278654', 'available', ''],
        ['book111', '乌合之众', '古斯塔夫·勒庞', '9787544248691', 'available', ''],
        ['book112', '娱乐至死', '尼尔·波兹曼', '9787561336799', 'available', ''],
        ['book113', '乡土中国', '费孝通', '9787544291172', 'available', ''],
        ['book114', '江村经济', '费孝通', '9787544291189', 'available', ''],
        ['book115', '中国历代政治得失', '钱穆', '9787108032210', 'available', ''],
        ['book116', '国史大纲', '钱穆', '9787108032227', 'available', ''],
        ['book117', '万历十五年', '黄仁宇', '9787108005825', 'available', ''],
        ['book118', '明朝那些事儿', '当年明月', '9787213053937', 'available', ''],
        ['book119', '人类群星闪耀时', '斯蒂芬·茨威格', '9787544256811', 'available', ''],
        ['book120', '枪炮病菌与钢铁', '贾雷德·戴蒙德', '9787544246376', 'available', ''],
        ['book121', '崩溃', '贾雷德·戴蒙德', '9787544246383', 'available', ''],
        ['book122', '第三种黑猩猩', '贾雷德·戴蒙德', '9787544246390', 'available', ''],
        ['book123', '万物简史', '比尔·布莱森', '9787544700892', 'available', ''],
        ['book124', '人类简史', '尤瓦尔·赫拉利', '9787508647351', 'available', ''],
        ['book125', '未来简史', '尤瓦尔·赫拉利', '9787508670732', 'available', ''],
        ['book126', '今日简史', '尤瓦尔·赫拉利', '9787508681652', 'available', ''],
        ['book127', '全球通史', '斯塔夫里阿诺斯', '9787301129647', 'available', ''],
        ['book128', '丝绸之路', '彼得·弗兰科潘', '9787301301046', 'available', ''],
        ['book129', '棉花帝国', '斯文·贝克特', '9787301310567', 'available', ''],
        ['book130', '大国的兴衰', '保罗·肯尼迪', '9787508620392', 'available', ''],
        ['book131', '论中国', '亨利·基辛格', '9787508627568', 'available', ''],
        ['book132', '世界秩序', '亨利·基辛格', '9787508627575', 'available', ''],
        ['book133', '李光耀观天下', '李光耀', '9787301222867', 'available', ''],
        ['book134', '邓小平时代', '傅高义', '9787544265128', 'available', ''],
        ['book135', '变革中国', '罗纳德·科斯', '9787544265142', 'available', ''],
        ['book136', '中国的经济制度', '张五常', '9787544265159', 'available', ''],
        ['book137', '货币银行学', '易纲', '9787301030625', 'available', ''],
        ['book138', '经济学原理', 'N.格里高利·曼昆', '9787301165188', 'available', ''],
        ['book139', '国富论', '亚当·斯密', '9787544244068', 'available', ''],
        ['book140', '资本论', '卡尔·马克思', '9787544244075', 'available', ''],
        ['book141', '就业利息和货币通论', '约翰·凯恩斯', '9787544244082', 'available', ''],
        ['book142', '穷爸爸富爸爸', '罗伯特·清崎', '9787564401485', 'available', ''],
        ['book143', '小狗钱钱', '博多·舍费尔', '9787513309941', 'available', ''],
        ['book144', '财务自由之路', '博多·舍费尔', '9787513309958', 'available', ''],
        ['book145', '投资最重要的事', '霍华德·马克斯', '9787508648839', 'available', ''],
        ['book146', '聪明的投资者', '本杰明·格雷厄姆', '9787508648846', 'available', ''],
        ['book147', '证券分析', '本杰明·格雷厄姆', '9787508648853', 'available', ''],
        ['book148', '漫步华尔街', '伯顿·马尔基尔', '9787111414170', 'available', ''],
        ['book149', '黑天鹅', '纳西姆·塔勒布', '9787508636348', 'available', ''],
        ['book150', '反脆弱', '纳西姆·塔勒布', '9787508636355', 'available', '']
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