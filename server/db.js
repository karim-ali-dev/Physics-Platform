require('dotenv').config();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const isVercel = process.env.VERCEL === '1' || !!process.env.NOW_REGION;
const usePostgres = Boolean(process.env.POSTGRES_URL);

let dataDir = path.join(__dirname, '..', 'data');
if (isVercel) dataDir = '/tmp';
const uploadsDir = path.join(dataDir, 'uploads');
try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch (_) {}
if (!usePostgres) {
  try { fs.mkdirSync(dataDir, { recursive: true }); } catch (_) {}
}

/* ============================================================
   SQLite DDL (node:sqlite — البيئة المحلية)
   ============================================================ */
const SQLITE_DDL = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  grade TEXT NOT NULL DEFAULT 'الصف الثالث الثانوي',
  term TEXT NOT NULL DEFAULT 'الفصل الدراسي الأول',
  description TEXT DEFAULT '',
  icon TEXT DEFAULT '⚛️',
  cover TEXT DEFAULT '',
  price TEXT DEFAULT '',
  featured INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  video_url TEXT DEFAULT '',
  duration TEXT DEFAULT '',
  summary TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL DEFAULT '',
  password_hash TEXT DEFAULT '',
  google_id TEXT DEFAULT '',
  facebook_id TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  reset_token_hash TEXT DEFAULT '',
  reset_expires TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  last_login TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE (student_id, course_id)
);

CREATE TABLE IF NOT EXISTS lesson_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  watched INTEGER DEFAULT 0,
  completed_at TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE (student_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS quizzes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  duration_minutes INTEGER DEFAULT 20,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS questions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  quiz_id INTEGER NOT NULL,
  question TEXT NOT NULL,
  options TEXT NOT NULL DEFAULT '[]',
  correct_index INTEGER DEFAULT 0,
  explanation TEXT DEFAULT '',
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS materials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  grade TEXT NOT NULL DEFAULT 'الكل',
  course_id INTEGER DEFAULT 0,
  file_url TEXT DEFAULT '',
  file_name TEXT DEFAULT '',
  file_size INTEGER DEFAULT 0,
  is_optional INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  quiz_id INTEGER NOT NULL,
  score INTEGER DEFAULT 0,
  total INTEGER DEFAULT 0,
  details TEXT DEFAULT '[]',
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (quiz_id) REFERENCES quizzes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS testimonials (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  client_role TEXT DEFAULT '',
  content TEXT NOT NULL,
  rating INTEGER DEFAULT 5,
  active INTEGER DEFAULT 1,
  image_url TEXT DEFAULT '',
  status TEXT DEFAULT 'approved',
  source TEXT DEFAULT 'admin',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS faqs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0,
  active INTEGER DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT DEFAULT ''
);

CREATE TABLE IF NOT EXISTS schedule_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  grade TEXT NOT NULL,
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL DEFAULT '',
  note TEXT DEFAULT '',
  period TEXT DEFAULT '',
  tag TEXT DEFAULT '',
  tag_active INTEGER DEFAULT 1,
  active INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  parent_name TEXT DEFAULT '',
  parent_phone TEXT DEFAULT '',
  governorate TEXT DEFAULT '',
  academic_year TEXT DEFAULT '',
  grade TEXT DEFAULT '',
  note TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER NOT NULL,
  course_id INTEGER NOT NULL,
  amount REAL NOT NULL DEFAULT 0,
  method TEXT NOT NULL DEFAULT 'vodafone',
  reference TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT DEFAULT '',
  paid_at TEXT DEFAULT '',
  created_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES customers(id) ON DELETE CASCADE,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS help_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_name TEXT DEFAULT '',
  contact TEXT DEFAULT '',
  client_id TEXT DEFAULT '',
  student_id INTEGER DEFAULT 0,
  type TEXT NOT NULL DEFAULT 'text',
  content TEXT DEFAULT '',
  image_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS help_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  help_id INTEGER NOT NULL,
  reply TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (help_id) REFERENCES help_requests(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id INTEGER DEFAULT 0,
  author_name TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'عام',
  image_url TEXT DEFAULT '',
  views INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS community_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id INTEGER NOT NULL,
  student_id INTEGER DEFAULT 0,
  author_name TEXT DEFAULT '',
  content TEXT NOT NULL,
  likes INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS community_reactions (
  post_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  emoji TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (post_id, customer_id, emoji),
  FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS comment_likes (
  comment_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (comment_id, customer_id),
  FOREIGN KEY (comment_id) REFERENCES community_comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_reads (
  notification_id INTEGER NOT NULL,
  customer_id INTEGER NOT NULL,
  read_at TEXT NOT NULL,
  PRIMARY KEY (notification_id, customer_id),
  FOREIGN KEY (notification_id) REFERENCES notifications(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT DEFAULT '',
  email TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  message TEXT NOT NULL,
  is_read INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  user_type TEXT NOT NULL DEFAULT 'admin',
  user_agent TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS login_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL,
  ip TEXT DEFAULT '',
  success INTEGER DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER DEFAULT 0,
  action TEXT NOT NULL,
  detail TEXT DEFAULT '',
  ip TEXT DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_enroll_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_enroll_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_lesson ON lesson_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_progress_student ON lesson_progress(student_id, watched);
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON quiz_attempts(student_id, quiz_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_type, user_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read);
CREATE INDEX IF NOT EXISTS idx_attempts_user ON login_attempts(username, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_customers_oauth ON customers(google_id);
CREATE INDEX IF NOT EXISTS idx_customers_fb ON customers(facebook_id);
CREATE INDEX IF NOT EXISTS idx_schedule_day ON schedule_items(day, sort_order);
CREATE INDEX IF NOT EXISTS idx_help_status ON help_requests(status, created_at);
CREATE INDEX IF NOT EXISTS idx_help_client ON help_requests(client_id);
CREATE INDEX IF NOT EXISTS idx_replies_help ON help_replies(help_id);
CREATE INDEX IF NOT EXISTS idx_posts_status ON community_posts(status, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_post ON community_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post ON community_reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_notifs_date ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notif_reads ON notification_reads(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, created_at);
CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, created_at);
`;

/* ============================================================
   Postgres DDL (pg — بيئة Vercel عبر POSTGRES_URL)
   ============================================================ */
const PG_DDL = [
  `CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    totp_secret TEXT NOT NULL DEFAULT '',
    totp_enabled INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    grade TEXT NOT NULL DEFAULT 'الصف الثالث الثانوي',
    term TEXT NOT NULL DEFAULT 'الفصل الدراسي الأول',
    description TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '⚛️',
    cover TEXT NOT NULL DEFAULT '',
    price TEXT NOT NULL DEFAULT '',
    price_amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    featured INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS lessons (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL DEFAULT '',
    duration TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL DEFAULT '',
    password_hash TEXT NOT NULL DEFAULT '',
    google_id TEXT NOT NULL DEFAULT '',
    facebook_id TEXT NOT NULL DEFAULT '',
    avatar TEXT NOT NULL DEFAULT '',
    reset_token_hash TEXT NOT NULL DEFAULT '',
    reset_expires TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '',
    parent_phone TEXT NOT NULL DEFAULT '',
    governorate TEXT NOT NULL DEFAULT '',
    academic_year TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    last_login TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS enrollments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (student_id, course_id)
  )`,
  `CREATE TABLE IF NOT EXISTS lesson_progress (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    lesson_id INTEGER NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
    watched INTEGER NOT NULL DEFAULT 0,
    completed_at TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    UNIQUE (student_id, lesson_id)
  )`,
  `CREATE TABLE IF NOT EXISTS quizzes (
    id SERIAL PRIMARY KEY,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    duration_minutes INTEGER NOT NULL DEFAULT 20,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    question TEXT NOT NULL,
    options TEXT NOT NULL DEFAULT '[]',
    correct_index INTEGER NOT NULL DEFAULT 0,
    explanation TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    grade TEXT NOT NULL DEFAULT 'الكل',
    course_id INTEGER NOT NULL DEFAULT 0,
    file_url TEXT NOT NULL DEFAULT '',
    file_name TEXT NOT NULL DEFAULT '',
    file_size INTEGER NOT NULL DEFAULT 0,
    is_optional INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS quiz_attempts (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    quiz_id INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
    score INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    details TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS testimonials (
    id SERIAL PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_role TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    rating INTEGER NOT NULL DEFAULT 5,
    active INTEGER NOT NULL DEFAULT 1,
    image_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'approved',
    source TEXT NOT NULL DEFAULT 'admin',
    student_id INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS faqs (
    id SERIAL PRIMARY KEY,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  )`,
  `CREATE TABLE IF NOT EXISTS schedule_items (
    id SERIAL PRIMARY KEY,
    grade TEXT NOT NULL,
    day TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    period TEXT NOT NULL DEFAULT '',
    tag TEXT NOT NULL DEFAULT '',
    tag_active INTEGER NOT NULL DEFAULT 1,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    student_name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    parent_name TEXT NOT NULL DEFAULT '',
    parent_phone TEXT NOT NULL DEFAULT '',
    governorate TEXT NOT NULL DEFAULT '',
    academic_year TEXT NOT NULL DEFAULT '',
    grade TEXT NOT NULL DEFAULT '',
    note TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS payments (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    amount DOUBLE PRECISION NOT NULL DEFAULT 0,
    method TEXT NOT NULL DEFAULT 'vodafone',
    reference TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending',
    admin_note TEXT NOT NULL DEFAULT '',
    paid_at TEXT NOT NULL DEFAULT '',
    payer_phone TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS help_requests (
    id SERIAL PRIMARY KEY,
    student_name TEXT NOT NULL DEFAULT '',
    contact TEXT NOT NULL DEFAULT '',
    client_id TEXT NOT NULL DEFAULT '',
    student_id INTEGER NOT NULL DEFAULT 0,
    type TEXT NOT NULL DEFAULT 'text',
    content TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'new',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS help_replies (
    id SERIAL PRIMARY KEY,
    help_id INTEGER NOT NULL REFERENCES help_requests(id) ON DELETE CASCADE,
    reply TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS community_posts (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL DEFAULT 0,
    author_name TEXT NOT NULL DEFAULT '',
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'عام',
    image_url TEXT NOT NULL DEFAULT '',
    views INTEGER NOT NULL DEFAULT 0,
    likes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS community_comments (
    id SERIAL PRIMARY KEY,
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    student_id INTEGER NOT NULL DEFAULT 0,
    author_name TEXT NOT NULL DEFAULT '',
    content TEXT NOT NULL,
    likes INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS community_reactions (
    post_id INTEGER NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL,
    emoji TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (post_id, customer_id, emoji)
  )`,
  `CREATE TABLE IF NOT EXISTS comment_likes (
    comment_id INTEGER NOT NULL REFERENCES community_comments(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (comment_id, customer_id)
  )`,
  `CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    link TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS notification_reads (
    notification_id INTEGER NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    customer_id INTEGER NOT NULL,
    read_at TEXT NOT NULL,
    PRIMARY KEY (notification_id, customer_id)
  )`,
  `CREATE TABLE IF NOT EXISTS messages (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL DEFAULT '',
    email TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL DEFAULT '',
    message TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    token_hash TEXT NOT NULL UNIQUE,
    user_id INTEGER NOT NULL,
    user_type TEXT NOT NULL DEFAULT 'admin',
    user_agent TEXT NOT NULL DEFAULT '',
    ip TEXT NOT NULL DEFAULT '',
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    ip TEXT NOT NULL DEFAULT '',
    success INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL DEFAULT 0,
    action TEXT NOT NULL,
    detail TEXT NOT NULL DEFAULT '',
    ip TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_lessons_course ON lessons(course_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_enroll_course ON enrollments(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_enroll_student ON enrollments(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_progress_lesson ON lesson_progress(lesson_id)`,
  `CREATE INDEX IF NOT EXISTS idx_progress_student ON lesson_progress(student_id, watched)`,
  `CREATE INDEX IF NOT EXISTS idx_quizzes_course ON quizzes(course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_questions_quiz ON questions(quiz_id, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON quiz_attempts(quiz_id)`,
  `CREATE INDEX IF NOT EXISTS idx_attempts_student ON quiz_attempts(student_id, quiz_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token_hash)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_type, user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(is_read)`,
  `CREATE INDEX IF NOT EXISTS idx_attempts_user ON login_attempts(username, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_oauth ON customers(google_id)`,
  `CREATE INDEX IF NOT EXISTS idx_customers_fb ON customers(facebook_id)`,
  `CREATE INDEX IF NOT EXISTS idx_schedule_day ON schedule_items(day, sort_order)`,
  `CREATE INDEX IF NOT EXISTS idx_help_status ON help_requests(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_help_client ON help_requests(client_id)`,
  `CREATE INDEX IF NOT EXISTS idx_replies_help ON help_replies(help_id)`,
  `CREATE INDEX IF NOT EXISTS idx_posts_status ON community_posts(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_comments_post ON community_comments(post_id)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id)`,
  `CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status, created_at)`
];

const POST_INIT_FIXUPS = [
  "UPDATE testimonials SET status = 'approved' WHERE status IS NULL OR status = ''",
  "UPDATE testimonials SET source = 'admin' WHERE source IS NULL OR source = ''",
  "UPDATE schedule_items SET period = 'الليل' WHERE (period IS NULL OR period = '') AND (start_time LIKE '5:%' OR start_time LIKE '6:%' OR start_time LIKE '7:%')",
  "UPDATE schedule_items SET period = 'النهار' WHERE (period IS NULL OR period = '') AND (start_time LIKE '3:%' OR start_time LIKE '4:%')"
];

const PG_MIGRATIONS = [
  "ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS client_id TEXT NOT NULL DEFAULT ''",
  "ALTER TABLE help_requests ADD COLUMN IF NOT EXISTS student_id INTEGER NOT NULL DEFAULT 0"
];

/* ============================================================
   مشغلات قاعدة البيانات (سائقان)
   ============================================================ */
function convertPlaceholders(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

function pgShim(sql) {
  return sql
    .replace(/CAST\s*\(\s*score\s+AS\s+REAL\s*\)/gi, 'CAST(score AS double precision)')
    .replace(/excluded\./g, 'EXCLUDED.')
    .replace(/ON\s+CONFLICT\s*\(/g, 'ON CONFLICT (');
}

async function initSqlite() {
  const { DatabaseSync } = require('node:sqlite');
  const sqlite = new DatabaseSync(path.join(dataDir, 'physics.db'));
  try {
    sqlite.exec('PRAGMA journal_mode = WAL;');
  } catch (_) {
    try { sqlite.exec('PRAGMA journal_mode = DELETE;'); } catch (_) {}
  }
  sqlite.exec('PRAGMA foreign_keys = ON;');
  return {
    async get(sql, params = []) { return sqlite.prepare(sql).get(...params); },
    async all(sql, params = []) { return sqlite.prepare(sql).all(...params); },
    async run(sql, params = []) {
      const r = sqlite.prepare(sql).run(...params);
      return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) };
    },
    async exec(sql) { return sqlite.exec(sql); },
    raw: sqlite
  };
}

async function initPostgres() {
  const { Pool, types } = require('pg');
  types.setTypeParser(20, (v) => parseInt(v, 10));
  types.setTypeParser(1700, (v) => parseFloat(v));
  const url = process.env.POSTGRES_URL || '';
  const needsSsl = process.env.VERCEL === '1' || /sslmode=require|sslmode=verify-full/.test(url);
  const pool = new Pool({
    connectionString: url,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
  });
  return {
    async get(sql, params = []) {
      const r = await pool.query(convertPlaceholders(pgShim(sql)), params);
      return r.rows[0];
    },
    async all(sql, params = []) {
      const r = await pool.query(convertPlaceholders(pgShim(sql)), params);
      return r.rows;
    },
    async run(sql, params = []) {
      let q = convertPlaceholders(pgShim(sql));
      if (/^\s*INSERT/i.test(q) && !/RETURNING/i.test(q)) q += ' RETURNING id';
      const r = await pool.query(q, params);
      return {
        changes: r.rowCount,
        lastInsertRowid: r.rows && r.rows[0] ? Number(r.rows[0].id) : 0
      };
    },
    async exec(sql) { await pool.query(sql); },
    pool
  };
}

/* ============================================================
   تهيئة سريعة مرة واحدة (خامل)
   ============================================================ */
let underlying = null;
let initPromise = null;

function ensure() {
  if (!initPromise) initPromise = initInternal();
  return initPromise;
}

async function initInternal() {
  if (usePostgres) {
    underlying = await initPostgres();
    for (const stmt of PG_DDL) await underlying.exec(stmt);
    for (const stmt of PG_MIGRATIONS) await underlying.exec(stmt);
  } else {
    underlying = await initSqlite();
    await ensureSqliteColumns();
    await underlying.exec(SQLITE_DDL);
  }
  for (const fix of POST_INIT_FIXUPS) {
    try { await underlying.run(fix); } catch (_) {}
  }
  await seed(underlying);
  return underlying;
}

async function ensureSqliteColumns() {
  const ensureColumn = async (table, column, definition) => {
    const cols = await underlying.all(`PRAGMA table_info(${table})`);
    if (!cols.some((c) => c.name === column)) {
      await underlying.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
    }
  };
  await ensureColumn('users', 'totp_secret', "TEXT DEFAULT ''");
  await ensureColumn('users', 'totp_enabled', 'INTEGER DEFAULT 0');
  await ensureColumn('sessions', 'user_type', "TEXT NOT NULL DEFAULT 'admin'");
await ensureColumn('customers', 'google_id', "TEXT DEFAULT ''");
await ensureColumn('customers', 'facebook_id', "TEXT DEFAULT ''");
await ensureColumn('customers', 'status', "TEXT DEFAULT 'active'");
  await ensureColumn('customers', 'avatar', "TEXT DEFAULT ''");
  await ensureColumn('customers', 'reset_token_hash', "TEXT DEFAULT ''");
  await ensureColumn('customers', 'reset_expires', "TEXT DEFAULT ''");
  await ensureColumn('customers', 'phone', "TEXT DEFAULT ''");
  await ensureColumn('customers', 'parent_phone', "TEXT DEFAULT ''");
  await ensureColumn('customers', 'governorate', "TEXT DEFAULT ''");
  await ensureColumn('customers', 'academic_year', "TEXT DEFAULT ''");
  await ensureColumn('schedule_items', 'period', "TEXT DEFAULT ''");
  await ensureColumn('schedule_items', 'tag', "TEXT DEFAULT ''");
  await ensureColumn('schedule_items', 'tag_active', 'INTEGER DEFAULT 1');
  await ensureColumn('testimonials', 'image_url', "TEXT DEFAULT ''");
  await ensureColumn('testimonials', 'status', "TEXT DEFAULT 'approved'");
  await ensureColumn('testimonials', 'source', "TEXT DEFAULT 'admin'");
  await ensureColumn('testimonials', 'student_id', 'INTEGER DEFAULT 0');
  await ensureColumn('courses', 'price_amount', 'REAL DEFAULT 0');
  await ensureColumn('payments', 'payer_phone', "TEXT DEFAULT ''");
  await ensureColumn('help_requests', 'client_id', "TEXT DEFAULT ''");
  await ensureColumn('help_requests', 'student_id', 'INTEGER DEFAULT 0');
  await ensureColumn('community_comments', 'likes', 'INTEGER DEFAULT 0');
}

/* ============================================================
   البيانات الافتراضية
   ============================================================ */
const DEFAULT_SETTINGS = {
  hero_badge: 'مستر أحمد علي الديب • من رابعة ابتدائي لتالتة ثانوي',
  hero_title: 'افهم الفيزياء مرة واحدة وإلى الأبد',
  hero_subtitle: 'شرح مبسط ومباشر لكل قوانين الفيزياء، مسائل محلولة خطوة بخطوة، واختبارات تحاكي الامتحان الفعلي — كل ده مع مستر أحمد علي الديب.',
  about_title: 'أنا أحمد علي الديب',
  about_text: 'مدرس فيزياء بخبرة أكثر من 15 سنة، بدرّس الطلاب من الصف الرابع الابتدائي لحد الصف الثالث الثانوي، بشغف تبسيط أصعب المفاهيم الفيزيائية وتحويلها لأفكار سهلة وواضحة. من سنين وبساعد آلاف الطلاب يوصلوا للدرجة النهائية في الفيزياء من خلال شرح مبسط، حل مسائل متنوعة، وتدريبات على نمط امتحانات السنوات السابقة.',
  about_quote: 'الفيزياء مش حفظ قوانين.. الفيزياء فهم، والقانون لما تفهمه مش هتنساه.',
  phone: '01016651095',
  whatsapp: '201016651095',
  email: '',
  city: 'مصر',
  youtube: '',
  facebook: '',
  tiktok: '',
  instagram: '',
  show_social: '1',
  show_email: '0',
  footer_tagline: 'علّمهم تفكير الفيزياء، والنتائج هتيجي لوحدها.',
  stats_students: '8500',
  stats_courses: '12',
  stats_years: '15',
  stats_lessons: '300',
  schedule_note: 'مواعيد الحصص الحضورية (أوفلاين) بتتحدث باستمرار من المدرس — لو في أي تغيير هتلاقيه هنا فوراً.',
  schedule_address: 'بنشوف المكان الأقرب ليك عند الحجز — تواصل مع مستر أحمد للتفاصيل.',
  vodafone_cash: '01016651095',
  vodafone_cash_name: 'أحمد علي الديب',
  gemini_api_key: '',
  gemini_model: 'gemini-3.5-flash',
  google_client_id: '',
  google_client_secret: '',
  facebook_app_id: '',
  facebook_app_secret: ''
};

const DEFAULT_COURSES = [
  ['فيزياء الصف الأول الثانوي', 'الصف الأول الثانوي', 'الفصل الدراسي الأول', 'شرح كامل لمنهج الفيزياء للصف الأول الثانوي الترم الأول: القياس، الحركة، والقوى بالتفصيل مع حل مسائل متنوعة.', '🔬', '', 'مجاني', 1, 1, 1],
  ['فيزياء الصف الأول الثانوي', 'الصف الأول الثانوي', 'الفصل الدراسي الثاني', 'منهج الترم الثاني: الشغل والطاقة والقدرة، وكميات التصادم مع تدريبات على امتحانات سابقة.', '⚡', '', 'مجاني', 1, 1, 2],
  ['فيزياء الصف الثاني الثانوي', 'الصف الثاني الثانوي', 'الفصل الدراسي الأول', 'الموجات والحركة الموجية والضوء، بأسلوب مبسط ومسائل محلولة خطوة بخطوة.', '🌊', '', 'مجاني', 1, 1, 3],
  ['فيزياء الصف الثاني الثانوي', 'الصف الثاني الثانوي', 'الفصل الدراسي الثاني', 'الكهربية الاستاتيكية والتيار الكهربي: شرح القوانين مع تطبيقات على نمط الامتحان.', '💡', '', 'مجاني', 1, 1, 4],
  ['فيزياء الصف الثالث الثانوي (الجزء الأول)', 'الصف الثالث الثانوي', 'الفصل الدراسي الأول', 'الكهربية والتيار المتردد: شرح مبسط لأسئلة الامتحان المتكررة مع حل نماذج شاملة.', '⚙️', '', 'مجاني', 1, 1, 5],
  ['فيزياء الصف الثالث الثانوي (الجزء الثاني)', 'الصف الثالث الثانوي', 'الفصل الدراسي الثاني', 'المغناطيسية والفيزياء الحديثة: القسم الأهم في المنهج، بتغطية شاملة ومراجعة نهائية.', '🧲', '', 'مجاني', 1, 1, 6]
];

const DEFAULT_LESSONS = [
  ['مقدمة في القياس وأدوات القياس', 1, 'https://www.youtube.com/embed/', '30 دقيقة', 'أساسيات القياس، الأخطاء، وأدوات القياس المختلفة مع مسائل محلولة.'],
  ['الحركة والموقع والمسافة والإزاحة', 1, 'https://www.youtube.com/embed/', '45 دقيقة', 'مفاهيم الحركة: المسافة مقابل الإزاحة، السرعة مقابل السرعة المتجهة.'],
  ['قوانين نيوتن للحركة', 1, 'https://www.youtube.com/embed/', '50 دقيقة', 'شرح قوانين نيوتن الثلاثة وتطبيقاتها في الحياة اليومية مع مسائل.'],
  ['الشغل والقدرة', 2, 'https://www.youtube.com/embed/', '40 دقيقة', 'تعريف الشغل المبذول، القدرة، ووحداتها مع مسائل امتحانات سابقة.'],
  ['الطاقة وأشكالها', 2, 'https://www.youtube.com/embed/', '35 دقيقة', 'الطاقة الحركية وطاقة الوضع والتحولات بينهما.'],
  ['الموجات وأنواعها', 3, 'https://www.youtube.com/embed/', '45 دقيقة', 'أنواع الموجات وخصائصها وسرعة انتشارها.'],
  ['الضوء وانعكاسه', 3, 'https://www.youtube.com/embed/', '40 دقيقة', 'خصائص الضوء وقوانين الانعكاس والانكسار.'],
  ['الكهربية الاستاتيكية', 4, 'https://www.youtube.com/embed/', '55 دقيقة', 'شحنة الكهربية، قانون كولوم، والمجال الكهربي.'],
  ['التيار الكهربي وقانون أوم', 4, 'https://www.youtube.com/embed/', '45 دقيقة', 'التيار والمقاومة وقانون أوم مع مسائل تطبيقية.'],
  ['التيار المتردد والمكثفات', 5, 'https://www.youtube.com/embed/', '50 دقيقة', 'التيار المتردد، المكثفات، ورنين الدائرة.'],
  ['المغناطيسية', 6, 'https://www.youtube.com/embed/', '55 دقيقة', 'المجال المغناطيسي والقوى المغناطيسية على التيار الكهربي.'],
  ['الفيزياء الحديثة والذرة', 6, 'https://www.youtube.com/embed/', '60 دقيقة', 'الذرة وموديلاتها وتطبيقات الفيزياء الحديثة في الامتحان.']
];

const DEFAULT_QUIZZES = [
  ['مراجعة القياس', 1, 'اختبار قصير على باب القياس — 5 أسئلة اختيار من متعدد.', 10],
  ['مراجعة الحركة', 1, 'اختبار على الحركة والسرعة — 5 أسئلة.', 10],
  ['مراجعة الموجات', 3, 'اختبار على الموجات والضوء — 5 أسئلة.', 10],
  ['مراجعة الكهربية', 4, 'اختبار على الكهربية الاستاتيكية والتيار — 5 أسئلة.', 10],
  ['امتحان شامل (المغناطيسية)', 6, 'امتحان شامل على المغناطيسية والفيزياء الحديثة — 10 أسئلة.', 20]
];

const DEFAULT_QUESTIONS = [
  ['كمية تُعرَّف بأنها المسافة بين نقطتين مقاسة في خط مستقيم مع الاتجاه؟', 'السرعة المتجهة', 'الإزاحة', 'المسافة', 'التسارع', 1, 'الإزاحة كمية متجهة تعبر عن تغير الموقع في اتجاه محدد.', 1],
  ['الوحدة الأساسية لقياس القوة في النظام الدولي هي:', 'الجول', 'النيوتن', 'الواط', 'الباسكال', 1, 'النيوتن هو وحدة القوة في النظام الدولي (1N = 1 kg.m/s²).', 1],
  ['قانون نيوتن الثاني ينص على أن:', 'القوة = الكتلة × التسارع', 'القوة = السرعة × الزمن', 'القوة = الكتلة × السرعة', 'لا شيء مما سبق', 0, 'F = m.a وهذا هو قانون نيوتن الثاني.', 1],
  ['وحدة قياس الشغل في النظام الدولي هي:', 'النيوتن', 'الجول', 'الواط', 'الكيلوجرام', 1, 'الشغل يقاس بالجول (1J = 1 N.m).', 1],
  ['القدرة تُعرف بأنها:', 'المسافة المقطوعة', 'الشغل المبذول في الثانية الواحدة', 'القوة المؤثرة', 'الكتلة', 1, 'القدرة = الشغل ÷ الزمن وتقاس بالواط.', 1],
  ['أي من التالي موجات ميكانيكية؟', 'الضوء', 'الصوت', 'الأشعة السينية', 'الموجات الراديوية', 1, 'الصوت موجة ميكانيكية تحتاج لوسط مادي، أما الضوء في موجات كهرومغناطيسية.', 2],
  ['قانون كولوم يصف القوة بين:', 'كتلتين', 'شحنتين كهربيتين', 'جسمين متحركين', 'مغناطيسين', 1, 'قانون كولوم يصف القوة الكهربية بين شحنتين.', 2],
  ['وحدة قياس المقاومة الكهربية هي:', 'الأمبير', 'الفولت', 'الأوم', 'الواط', 2, 'المقاومة تقاس بالأوم (Ω).', 2],
  ['المجال المغناطيسي الناتج عن سلك مستقيم يمر به تيار يعتمد على:', 'شدة التيار فقط', 'البعد عن السلك فقط', 'شدة التيار والبعد عن السلك', 'لا يعتمد على شيء', 2, 'شدة المجال تتناسب طردياً مع التيار وعكسياً مع البعد عن السلك.', 3],
  ['أي من التالي يعتبر من تطبيقات الفيزياء الحديثة؟', 'الطاقة النووية', 'المولدات الكهربية', 'السيارات', 'الثلاجات', 0, 'الطاقة النووية مبنية على نظرية النسبية واكتشافات الفيزياء الحديثة.', 3]
];

const DEFAULT_TESTIMONIALS = [
  ['أحمد سمير', 'طالب بالصف الثالث الثانوي', 'مستر أحمد بيفسّر الفيزياء بطريقة مختلفة خالص. المغناطيسية كانت كابوس بالنسبة لي وبقت أحلى باب في المنهج.', 5],
  ['سارة محمود', 'طالبة بالصف الثاني الثانوي', 'أسلوب الشرح رايق وبسيط، والمسائل محلولة خطوة بخطوة لحد ما تستوعبها كويس جداً. ربنا يبارك له.', 5],
  ['محمد عادل', 'طالب بالصف الأول الثانوي', 'أول مرة في حياتي أفهم قوانين نيوتن بسهولة كده. شرحه بيخليك تحب الفيزياء مش تحفظها.', 5],
  ['نورهان أشرف', 'طالبة بالصف الثالث الثانوي', 'الاختبارات اللي في المنصة بتشبه الامتحان الفعلي جداً، ونفعتني في مراجعة آخر السنة.', 5]
];

const DEFAULT_FAQS = [
  ['المنصة مجانية ولا بفلوس؟', 'المنصة مجانية بالكامل لجميع الطلاب، وهدفنا الأول إن كل طالب يلاقي شرح ممتاز من غير أي عوائق.'],
  ['إيه الصفوف اللي بتغطيها المنصة؟', 'المنصة بتغطي الفيزياء من الصف الرابع الابتدائي لحد الصف الثالث الثانوي، بكل أجزائها وفصولها الدراسية، مع شرح مبسط يناسب كل مرحلة ومسائل على نمط الامتحان.'],
  ['في مواعيد حصص أوفلاين (حضورية)؟', 'أكيد، من صفحة "مواعيد الدروس" بتلاقي جدول الحصص الحضورية لكل المراحل موزعة على أيام الأسبوع، وبيتحدث باستمرار من المدرس. ولو حابب تستفسر عن أي موعد تقدر تسأل المساعد الذكي في الزاوية.'],
  ['الشرح بيتفرج عليه إزاي؟', 'بعد إنشاء حساب، بيسجل الطالب في الكورس المطلوب ويقدر يتفرج على كل الدروس وعلامات تقدمه بتتحفظ تلقائياً.'],
  ['هل في اختبارات على المنصة؟', 'أكيد، في اختبارات تفاعلية على كل باب، وبتصحح تلقائياً مع شرح للإجابة الصحيحة.'],
  ['ممكن أسأل مستر أحمد سؤال مباشر؟', 'من صفحة "تواصل معنا" أو الواتساب المباشر، ومستر أحمد بيرد على كل الأسئلة بنفسه.'],
  ['هل المنصة شغالة على الموبايل؟', 'نعم، المنصة متجاوبة بالكامل وشغالة على الموبايل والتابلت والكمبيوتر.'],
  ['أمتى بتتضاف دروس جديدة؟', 'الدروس بتتضاف بشكل مستمر مع بداية كل ترم، وبيتم إضافة مراجعات وامتحانات قبل الامتحانات النهائية.']
];

const DEFAULT_SCHEDULE = [
  ['رابعة ابتدائي', 'السبت', '3:00 م', '4:00 م', '', 'النهار', '', 1],
  ['الصف الأول الإعدادي', 'السبت', '4:30 م', '5:30 م', '', 'النهار', '', 1],
  ['الصف الأول الثانوي', 'السبت', '6:00 م', '7:30 م', '', 'الليل', '', 1],
  ['خامسة ابتدائي', 'الأحد', '3:00 م', '4:00 م', '', 'النهار', '', 1],
  ['الصف الثاني الإعدادي', 'الأحد', '4:30 م', '5:30 م', '', 'النهار', '', 1],
  ['الصف الثاني الثانوي', 'الأحد', '6:00 م', '7:30 م', '', 'الليل', '', 1],
  ['سادسة ابتدائي', 'الاثنين', '3:00 م', '4:00 م', '', 'النهار', '', 1],
  ['الصف الثالث الإعدادي', 'الاثنين', '4:30 م', '5:30 م', '', 'النهار', '', 1],
  ['الصف الثالث الثانوي', 'الاثنين', '6:00 م', '7:30 م', '', 'الليل', '', 1],
  ['رابعة ابتدائي', 'الثلاثاء', '3:00 م', '4:00 م', 'حصة إضافية لمسائل القياس', 'النهار', 'حصة إضافية', 1],
  ['الصف الأول الإعدادي', 'الثلاثاء', '4:30 م', '5:30 م', '', 'النهار', '', 1],
  ['الصف الأول الثانوي', 'الثلاثاء', '6:00 م', '7:30 م', '', 'الليل', '', 1],
  ['خامسة ابتدائي', 'الأربعاء', '3:00 م', '4:00 م', '', 'النهار', '', 1],
  ['الصف الثاني الإعدادي', 'الأربعاء', '4:30 م', '5:30 م', '', 'النهار', '', 1],
  ['الصف الثاني الثانوي', 'الأربعاء', '6:00 م', '7:30 م', '', 'الليل', '', 1],
  ['سادسة ابتدائي', 'الخميس', '3:00 م', '4:00 م', '', 'النهار', '', 1],
  ['الصف الثالث الإعدادي', 'الخميس', '4:30 م', '5:30 م', '', 'النهار', '', 1],
  ['الصف الثالث الثانوي', 'الخميس', '6:00 م', '7:30 م', '', 'الليل', '', 1],
  ['الصف الثالث الثانوي', 'الجمعة', '5:00 م', '7:00 م', 'مراجعة جماعية أسبوعية لكل الصفوف', 'الليل', 'مراجعة نهائية', 1]
];

/* ============================================================
   seed — الأدمن من متغيرات البيئة + المحتوى الافتراضي
   ============================================================ */
async function seed(d) {
  const username = process.env.ADMIN_USERNAME || 'ahmedeldeeb';
  const password = process.env.ADMIN_PASSWORD || crypto.randomBytes(12).toString('base64url');
  const existing = await d.get('SELECT id, password_hash FROM users WHERE username = ?', [username]);
  if (existing) {
    if (process.env.ADMIN_PASSWORD && !bcrypt.compareSync(password, existing.password_hash)) {
      await d.run('UPDATE users SET password_hash = ? WHERE id = ?', [bcrypt.hashSync(password, 10), existing.id]);
      console.log('تم تحديث كلمة سر المدرس من إعدادات البيئة.');
    }
  } else {
    await d.run('INSERT INTO users (username, password_hash, created_at) VALUES (?, ?, ?)',
      [username, bcrypt.hashSync(password, 10), new Date().toISOString()]);
    console.log('----------------------------------------------------------');
    console.log('تم إنشاء حساب المدرس للوحة التحكم:');
    console.log('  اسم المستخدم: ' + username);
    console.log('  كلمة السر: ' + password);
    console.log('  غيّر كلمة السر من لوحة التحكم -> الإعدادات -> تغيير كلمة السر');
    console.log('----------------------------------------------------------');
  }

  const courseCount = await d.get('SELECT COUNT(*) AS c FROM courses');
  if (courseCount.c === 0) {
    for (const c of DEFAULT_COURSES) {
      const now = new Date().toISOString();
      await d.run(`INSERT INTO courses (title, grade, term, description, icon, cover, price, featured, active, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [c[0], c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9], now, now]);
    }
  }

  const lessonCount = await d.get('SELECT COUNT(*) AS c FROM lessons');
  if (lessonCount.c === 0) {
    DEFAULT_LESSONS.forEach(async (l, i) => {
      const now = new Date().toISOString();
      await d.run(`INSERT INTO lessons (course_id, title, video_url, duration, summary, sort_order, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        [l[1], l[0], l[2], l[3], l[4], i, now, now]);
    });
  }

  const quizCount = await d.get('SELECT COUNT(*) AS c FROM quizzes');
  if (quizCount.c === 0) {
    for (const q of DEFAULT_QUIZZES) {
      await d.run('INSERT INTO quizzes (course_id, title, description, duration_minutes, active, created_at) VALUES (?, ?, ?, ?, 1, ?)',
        [q[1], q[0], q[2], q[3], new Date().toISOString()]);
    }
  }

  const questionCount = await d.get('SELECT COUNT(*) AS c FROM questions');
  if (questionCount.c === 0) {
    DEFAULT_QUESTIONS.forEach(async (q, i) => {
      const options = JSON.stringify([q[1], q[2], q[3], q[4]]);
      await d.run('INSERT INTO questions (quiz_id, question, options, correct_index, explanation, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [q[7], q[0], options, q[5], q[6], i]);
    });
  }

  const testimonialCount = await d.get('SELECT COUNT(*) AS c FROM testimonials');
  if (testimonialCount.c === 0) {
    for (const t of DEFAULT_TESTIMONIALS) {
      await d.run("INSERT INTO testimonials (client_name, client_role, content, rating, active, image_url, status, source, created_at) VALUES (?, ?, ?, ?, 1, '', 'approved', 'admin', ?)",
        [t[0], t[1], t[2], t[3], new Date().toISOString()]);
    }
  }

  const faqCount = await d.get('SELECT COUNT(*) AS c FROM faqs');
  if (faqCount.c === 0) {
    DEFAULT_FAQS.forEach(async (f, i) => {
      await d.run('INSERT INTO faqs (question, answer, sort_order, active, created_at) VALUES (?, ?, ?, 1, ?)',
        [f[0], f[1], i, new Date().toISOString()]);
    });
  }

  const scheduleCount = await d.get('SELECT COUNT(*) AS c FROM schedule_items');
  if (scheduleCount.c === 0) {
    DEFAULT_SCHEDULE.forEach(async (s, i) => {
      const now = new Date().toISOString();
      await d.run(`INSERT INTO schedule_items (grade, day, start_time, end_time, note, period, tag, tag_active, active, sort_order, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        [s[0], s[1], s[2], s[3], s[4], s[5], s[6], s[7], i, now, now]);
    });
  }

  const insertSetting = async (k, v) => {
    await d.run('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT (key) DO NOTHING', [k, v]);
  };
  for (const [k, v] of Object.entries(DEFAULT_SETTINGS)) {
    await insertSetting(k, v);
  }

  const fixSetting = async (key, oldVal, newVal) => {
    const row = await d.get('SELECT value FROM settings WHERE key = ?', [key]);
    if (row && row.value === oldVal) await d.run('UPDATE settings SET value = ? WHERE key = ?', [newVal, key]);
  };
  await fixSetting('hero_badge', 'مستر أحمد علي الديب • فيزياء الثانوية العامة', DEFAULT_SETTINGS.hero_badge);
  await fixSetting('about_text', 'مدرس فيزياء بخبرة أكثر من 15 سنة في تدريس الثانوية العامة، بشغف تبسيط أصعب المفاهيم الفيزيائية وتحويلها لأفكار سهلة وواضحة. من سنين وبساعد آلاف الطلاب يوصلوا للدرجة النهائية في الفيزياء من خلال شرح مبسط، حل مسائل متنوعة، وتدريبات على نمط امتحانات السنوات السابقة.', DEFAULT_SETTINGS.about_text);
  await fixSetting('phone', '01099724825', DEFAULT_SETTINGS.phone);
  await fixSetting('whatsapp', '201099724825', DEFAULT_SETTINGS.whatsapp);
  await fixSetting('vodafone_cash', '01099724825', DEFAULT_SETTINGS.vodafone_cash);
await fixSetting('email', '', '');
await fixSetting('youtube', '', '');
await fixSetting('facebook', '', '');
await fixSetting('tiktok', '', '');
await fixSetting('instagram', '', '');
await fixSetting('gemini_api_key', '', '');
await fixSetting('gemini_model', 'gemini-flash-latest', 'gemini-3.5-flash');
await fixSetting('google_client_id', '', '');
await fixSetting('google_client_secret', '', '');
await fixSetting('facebook_app_id', '', '');
await fixSetting('facebook_app_secret', '', '');

  await d.run('UPDATE faqs SET answer = ? WHERE question = ?', ['المنصة بتغطي الفيزياء من الصف الرابع الابتدائي لحد الصف الثالث الثانوي، بكل أجزائها وفصولها الدراسية، مع شرح مبسط يناسب كل مرحلة ومسائل على نمط الامتحان.', 'إيه الصفوف اللي بتغطيها المنصة؟']);
  const schedFaqCount = await d.get("SELECT COUNT(*) AS c FROM faqs WHERE question = 'في مواعيد حصص أوفلاين (حضورية)؟'");
  if (schedFaqCount.c === 0) {
    await d.run("INSERT INTO faqs (question, answer, sort_order, active, created_at) VALUES (?, ?, 99, 1, ?)",
      ['في مواعيد حصص أوفلاين (حضورية)؟', 'أكيد، من صفحة "مواعيد الدروس" بتلاقي جدول الحصص الحضورية لكل المراحل موزعة على أيام الأسبوع، وبيتحدث باستمرار من المدرس. ولو حابب تستفسر عن أي موعد تقدر تسأل المساعد الذكي في الزاوية.', new Date().toISOString()]);
  }
}

function init() {
  return ensure();
}

/* ============================================================
   واجهة db — تُحوّل لكل عملية لأول تهيئة ثم تفوض للسائق
   ============================================================ */
const db = {
  async get(...args) { return (await ensure()).get(...args); },
  async all(...args) { return (await ensure()).all(...args); },
  async run(...args) { return (await ensure()).run(...args); },
  async exec(...args) { return (await ensure()).exec(...args); }
};

module.exports = { init, db, uploadsDir };
