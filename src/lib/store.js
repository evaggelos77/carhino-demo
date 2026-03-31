const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function dataPath(fileName) {
  return path.join(DATA_DIR, fileName);
}

function readJson(fileName, fallback) {
  try {
    const content = fs.readFileSync(dataPath(fileName), 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return fallback;
  }
}

function writeJson(fileName, value) {
  ensureDir(DATA_DIR);
  fs.writeFileSync(dataPath(fileName), JSON.stringify(value, null, 2), 'utf8');
}

function getVehicles() {
  return readJson('vehicles.json', []);
}

function saveVehicles(data) {
  writeJson('vehicles.json', data);
}

function getApplications() {
  return readJson('applications.json', []);
}

function saveApplications(data) {
  writeJson('applications.json', data);
}

function getAdmins() {
  return readJson('admins.json', []);
}

function saveAdmins(data) {
  writeJson('admins.json', data);
}

function getSettings() {
  return readJson('settings.json', {});
}

function saveSettings(data) {
  writeJson('settings.json', data);
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function money(value) {
  return new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('el-GR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function dateOnly(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('el-GR', {
    dateStyle: 'medium',
  }).format(date);
}

function statusClass(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized.includes('διαθέσιμο') || normalized.includes('εγκρ')) return 'available';
  if (normalized.includes('προέγκ')) return 'preapproved';
  if (normalized.includes('σε έλεγχο') || normalized.includes('υπό') || normalized.includes('pending')) return 'review';
  if (normalized.includes('απορρ')) return 'rejected';
  if (normalized.includes('δεσμε')) return 'reserved';
  return 'pending';
}

function generatePublicId(prefix = 'ID') {
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `${prefix}-${stamp}-${rand}`;
}

function parseLines(value) {
  return String(value || '')
    .split(/\r?\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function verifyPassword(admin, password) {
  if (!admin || !password) return false;
  const derived = crypto.pbkdf2Sync(
    password,
    Buffer.from(admin.salt, 'hex'),
    admin.iterations || 210000,
    32,
    admin.digest || 'sha256'
  ).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(derived, 'hex'), Buffer.from(admin.hash, 'hex'));
}

function buildStatusSummary(items, key = 'status') {
  return items.reduce((acc, item) => {
    const status = item[key] || 'Άγνωστο';
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
}

module.exports = {
  ensureDir,
  getVehicles,
  saveVehicles,
  getApplications,
  saveApplications,
  getAdmins,
  saveAdmins,
  getSettings,
  saveSettings,
  slugify,
  money,
  formatDate,
  dateOnly,
  statusClass,
  generatePublicId,
  parseLines,
  verifyPassword,
  buildStatusSummary,
};
