require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const nodemailer = require('nodemailer');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads', 'applications');
const OUTBOX_DIR = path.join(ROOT, 'outbox');

for (const dir of [DATA_DIR, UPLOAD_DIR, OUTBOX_DIR]) fs.mkdirSync(dir, { recursive: true });

const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');
const VEHICLES_FILE = path.join(DATA_DIR, 'vehicles.json');
const APPLICATIONS_FILE = path.join(DATA_DIR, 'applications.json');
if (!fs.existsSync(APPLICATIONS_FILE)) fs.writeFileSync(APPLICATIONS_FILE, '[]', 'utf8');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const safe = String(file.originalname || 'file').replace(/[^a-zA-Z0-9._-]/g, '-');
    cb(null, `${Date.now()}-${safe}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024 }
});

app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(ROOT, 'public')));
app.use('/uploads', express.static(path.join(ROOT, 'uploads')));

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2), 'utf8'); }
function getSettings() { return readJson(SETTINGS_FILE, {}); }
function getVehicles() { return readJson(VEHICLES_FILE, []); }
function getApplications() { return readJson(APPLICATIONS_FILE, []); }
function saveApplications(value) { writeJson(APPLICATIONS_FILE, value); }
function detectLang(req) { return String(req.query.lang || '').toLowerCase() === 'en' ? 'en' : 'el'; }
function money(value, lang = 'el') {
  const locale = lang === 'en' ? 'en-IE' : 'el-GR';
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Number(value || 0));
}
function nowId() {
  const d = new Date();
  const stamp = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = Math.floor(100 + Math.random() * 900);
  return `APP-${stamp}-${rand}`;
}
function bySlug(slug) { return getVehicles().find(v => v.slug === slug); }
function attachmentLabel(fieldName, lang = 'el') {
  const labels = {
    identityFront: { el: 'Ταυτότητα μπροστά', en: 'Identity front' },
    identityBack: { el: 'Ταυτότητα πίσω', en: 'Identity back' },
    drivingLicense: { el: 'Δίπλωμα οδήγησης', en: 'Driving licence' },
    proofOfAddress: { el: 'Αποδεικτικό κατοικίας', en: 'Proof of address' },
    incomeDocument: { el: 'Έγγραφο εισοδήματος', en: 'Income document' },
    extraDocument: { el: 'Extra έγγραφο', en: 'Extra document' }
  };
  return (labels[fieldName] && labels[fieldName][lang]) || fieldName;
}

function persistCameraCapture(dataUrl, fieldName) {
  if (!dataUrl || typeof dataUrl !== 'string') return null;
  const match = dataUrl.match(/^data:(image\/(png|jpeg|jpg));base64,(.+)$/i);
  if (!match) return null;
  const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const safeBase = String(fieldName || 'camera-capture').replace(/[^a-zA-Z0-9_-]/g, '-');
  const filename = `${Date.now()}-${safeBase}.${ext}`;
  const diskPath = path.join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(match[3], 'base64');
  fs.writeFileSync(diskPath, buffer);
  return {
    fieldName,
    originalName: `${safeBase}-camera.${ext}`,
    filename,
    mimetype: mimeType,
    size: buffer.length,
    relativePath: path.join('uploads', 'applications', filename)
  };
}
function toMailHtml(application, vehicle, settings, lang = 'el') {
  const labels = {
    title: lang === 'en' ? 'New leasing application' : 'Νέα αίτηση leasing',
    vehicle: lang === 'en' ? 'Vehicle' : 'Όχημα',
    fullName: lang === 'en' ? 'Full name' : 'Ονοματεπώνυμο',
    phone: lang === 'en' ? 'Phone' : 'Τηλέφωνο',
    email: 'Email',
    afm: 'ΑΦΜ',
    address: lang === 'en' ? 'Address' : 'Διεύθυνση',
    occupation: lang === 'en' ? 'Occupation' : 'Επάγγελμα',
    income: lang === 'en' ? 'Monthly income' : 'Μηνιαίο εισόδημα',
    notes: lang === 'en' ? 'Notes' : 'Σχόλια',
    attachments: lang === 'en' ? 'Attachments' : 'Συνημμένα',
    recipient: lang === 'en' ? 'Lead recipient' : 'Αποδέκτης lead'
  };
  return `<!doctype html><html><body style="font-family:Segoe UI,Arial,sans-serif;color:#111">
  <h2>${labels.title} - ${application.publicId}</h2>
  <p><strong>${labels.vehicle}:</strong> ${vehicle.name}</p>
  <p><strong>${labels.fullName}:</strong> ${application.fullName}</p>
  <p><strong>${labels.phone}:</strong> ${application.phone}</p>
  <p><strong>${labels.email}:</strong> ${application.email}</p>
  <p><strong>${labels.afm}:</strong> ${application.afm || '—'}</p>
  <p><strong>${labels.address}:</strong> ${application.address || '—'}</p>
  <p><strong>${labels.occupation}:</strong> ${application.occupation || '—'}</p>
  <p><strong>${labels.income}:</strong> ${application.monthlyIncome || '—'}</p>
  <p><strong>${labels.notes}:</strong> ${application.notes || '—'}</p>
  <p><strong>${labels.attachments}:</strong> ${application.attachments.map(a => `${a.label}: ${a.originalName}`).join(', ') || '—'}</p>
  <hr>
  <p>${labels.recipient}: ${settings.leadRecipient || process.env.LEAD_RECIPIENT || '—'}</p>
  </body></html>`;
}
function toMailText(application, vehicle, settings, lang = 'el') {
  const lines = lang === 'en'
    ? [
        `New leasing application - ${application.publicId}`,
        `Vehicle: ${vehicle.name}`,
        `Full name: ${application.fullName}`,
        `Phone: ${application.phone}`,
        `Email: ${application.email}`,
        `AFM: ${application.afm || '—'}`,
        `Address: ${application.address || '—'}`,
        `Occupation: ${application.occupation || '—'}`,
        `Monthly income: ${application.monthlyIncome || '—'}`,
        `Notes: ${application.notes || '—'}`,
        `Attachments: ${application.attachments.map(a => `${a.label}: ${a.originalName}`).join(', ') || '—'}`,
        `Lead recipient: ${settings.leadRecipient || process.env.LEAD_RECIPIENT || '—'}`
      ]
    : [
        `Νέα αίτηση leasing - ${application.publicId}`,
        `Όχημα: ${vehicle.name}`,
        `Ονοματεπώνυμο: ${application.fullName}`,
        `Τηλέφωνο: ${application.phone}`,
        `Email: ${application.email}`,
        `ΑΦΜ: ${application.afm || '—'}`,
        `Διεύθυνση: ${application.address || '—'}`,
        `Επάγγελμα: ${application.occupation || '—'}`,
        `Μηνιαίο εισόδημα: ${application.monthlyIncome || '—'}`,
        `Σχόλια: ${application.notes || '—'}`,
        `Συνημμένα: ${application.attachments.map(a => `${a.label}: ${a.originalName}`).join(', ') || '—'}`,
        `Αποδέκτης lead: ${settings.leadRecipient || process.env.LEAD_RECIPIENT || '—'}`
      ];
  return lines.join('\n');
}
async function trySendEmail(application, vehicle, settings, outboxDir, lang = 'el') {
  const leadRecipient = process.env.LEAD_RECIPIENT || settings.leadRecipient;
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !leadRecipient) {
    return { sent: false, reason: 'SMTP not configured' };
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || 'false') === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'Carhino Demo <no-reply@carhino.local>',
    to: leadRecipient,
    subject: lang === 'en' ? `New leasing application - ${vehicle.name} - ${application.publicId}` : `Νέα αίτηση leasing - ${vehicle.name} - ${application.publicId}`,
    html: fs.readFileSync(path.join(outboxDir, 'email-preview.html'), 'utf8'),
    text: fs.readFileSync(path.join(outboxDir, 'email-preview.txt'), 'utf8'),
    attachments: application.attachments.map(a => ({ filename: a.originalName, path: path.join(ROOT, a.relativePath) }))
  });
  return { sent: true };
}

app.use((req, res, next) => {
  const lang = detectLang(req);
  const currentUrl = req.originalUrl || req.url;
  const switchLangUrl = (targetLang) => {
    const [pathname, queryString = ''] = currentUrl.split('?');
    const params = new URLSearchParams(queryString);
    if (targetLang === 'en') params.set('lang', 'en');
    else params.delete('lang');
    const finalQs = params.toString();
    return finalQs ? `${pathname}?${finalQs}` : pathname;
  };
  const withLang = (target) => {
    const [pathname, queryString = ''] = target.split('?');
    const params = new URLSearchParams(queryString);
    if (lang === 'en') params.set('lang', 'en');
    else params.delete('lang');
    const finalQs = params.toString();
    return finalQs ? `${pathname}?${finalQs}` : pathname;
  };

  res.locals.settings = getSettings();
  res.locals.currentPath = req.path;
  res.locals.lang = lang;
  res.locals.t = (el, en) => (lang === 'en' ? en : el);
  res.locals.money = (value) => money(value, lang);
  res.locals.withLang = withLang;
  res.locals.switchToEn = switchLangUrl('en');
  res.locals.switchToEl = switchLangUrl('el');
  next();
});

app.get('/', (req, res) => {
  const settings = getSettings();
  const vehicles = getVehicles();
  const lang = detectLang(req);
  res.render('index', {
    title: lang === 'en' ? 'Carhino Leasing Demo' : 'Carhino Leasing Demo',
    vehicles,
    stats: {
      vehicles: vehicles.length,
      availableVehicles: vehicles.length,
      onlineFlow: lang === 'en' ? '100% online' : '100% online',
      docs: lang === 'en' ? 'Docs by mobile' : 'Έγγραφα από κινητό'
    },
    faqs: settings.faqs || []
  });
});

app.get('/offers', (req, res) => {
  const vehicles = getVehicles();
  const q = String(req.query.q || '').trim().toLowerCase();
  const filtered = !q ? vehicles : vehicles.filter(v => [v.name, v.bodyType, v.fuel, v.status].join(' ').toLowerCase().includes(q));
  const lang = detectLang(req);
  res.render('offers', { title: lang === 'en' ? 'Offers' : 'Προσφορές', vehicles: filtered, q });
});

app.get('/vehicle/:slug', (req, res) => {
  const lang = detectLang(req);
  const vehicle = bySlug(req.params.slug);
  if (!vehicle) return res.status(404).render('error', { title: lang === 'en' ? 'Not found' : 'Δεν βρέθηκε', heading: lang === 'en' ? 'Vehicle not found' : 'Δεν βρέθηκε όχημα', message: lang === 'en' ? 'The demo vehicle you requested does not exist.' : 'Το demo όχημα που ζητήσατε δεν υπάρχει.' });
  res.render('vehicle', { title: vehicle.name, vehicle });
});

app.get('/apply/:slug', (req, res) => {
  const lang = detectLang(req);
  const vehicle = bySlug(req.params.slug);
  if (!vehicle) return res.status(404).render('error', { title: lang === 'en' ? 'Not found' : 'Δεν βρέθηκε', heading: lang === 'en' ? 'Vehicle not found' : 'Δεν βρέθηκε όχημα', message: lang === 'en' ? 'Application page not found.' : 'Δεν βρέθηκε η σελίδα αίτησης.' });
  res.render('apply', { title: `${lang === 'en' ? 'Apply' : 'Αίτηση'} - ${vehicle.name}`, vehicle, error: null, old: {} });
});

app.post('/apply/:slug', upload.fields([
  { name: 'identityFront', maxCount: 1 },
  { name: 'identityBack', maxCount: 1 },
  { name: 'drivingLicense', maxCount: 1 },
  { name: 'proofOfAddress', maxCount: 1 },
  { name: 'incomeDocument', maxCount: 1 },
  { name: 'extraDocument', maxCount: 2 }
]), async (req, res) => {
  const lang = detectLang(req);
  const vehicle = bySlug(req.params.slug);
  if (!vehicle) return res.status(404).render('error', { title: lang === 'en' ? 'Not found' : 'Δεν βρέθηκε', heading: lang === 'en' ? 'Vehicle not found' : 'Δεν βρέθηκε όχημα', message: lang === 'en' ? 'Application page not found.' : 'Δεν βρέθηκε η σελίδα αίτησης.' });

  const body = req.body || {};
  const required = ['fullName', 'phone', 'email'];
  const missing = required.filter(k => !String(body[k] || '').trim());
  const fields = req.files || {};
  const cameraFields = ['identityFront', 'identityBack', 'drivingLicense', 'proofOfAddress', 'incomeDocument', 'extraDocument'];
  cameraFields.forEach((fieldName) => {
    const hiddenKey = `camera_${fieldName}`;
    const value = String(body[hiddenKey] || '').trim();
    if (!value) return;
    const saved = persistCameraCapture(value, fieldName);
    if (!saved) return;
    if (!fields[fieldName]) fields[fieldName] = [];
    fields[fieldName].push(saved);
  });
  const attachmentFields = ['identityFront', 'identityBack', 'drivingLicense'];
  const attachmentMissing = attachmentFields.filter(name => !(fields[name] && fields[name][0]));

  if (missing.length || attachmentMissing.length) {
    return res.status(422).render('apply', {
      title: `${lang === 'en' ? 'Apply' : 'Αίτηση'} - ${vehicle.name}`,
      vehicle,
      old: body,
      error: lang === 'en'
        ? 'Please complete the main details and upload the required documents to continue the demo correctly.'
        : 'Συμπλήρωσε τα βασικά στοιχεία και ανέβασε τα κύρια έγγραφα για να συνεχίσει σωστά το demo.'
    });
  }

  const publicId = nowId();
  const attachments = [];
  for (const [fieldName, arr] of Object.entries(fields)) {
    for (const file of arr) {
      attachments.push({
        fieldName,
        label: attachmentLabel(fieldName, lang),
        originalName: file.originalname || `${fieldName}-capture.${String((file.mimetype || 'image/jpeg').includes('png') ? 'png' : 'jpg')}`,
        savedName: file.filename,
        relativePath: file.relativePath || path.join('uploads', 'applications', file.filename),
        mimeType: file.mimetype,
        size: file.size
      });
    }
  }

  const application = {
    publicId,
    createdAt: new Date().toISOString(),
    vehicleSlug: vehicle.slug,
    vehicleName: vehicle.name,
    fullName: String(body.fullName || '').trim(),
    phone: String(body.phone || '').trim(),
    email: String(body.email || '').trim(),
    afm: String(body.afm || '').trim(),
    address: String(body.address || '').trim(),
    occupation: String(body.occupation || '').trim(),
    monthlyIncome: String(body.monthlyIncome || '').trim(),
    notes: String(body.notes || '').trim(),
    attachments,
    emailSent: false,
    emailReason: 'pending',
    lang
  };

  const apps = getApplications();
  apps.unshift(application);
  saveApplications(apps);

  const outboxDir = path.join(OUTBOX_DIR, publicId);
  const attachmentsDir = path.join(outboxDir, 'attachments');
  fs.mkdirSync(attachmentsDir, { recursive: true });

  for (const a of attachments) {
    fs.copyFileSync(path.join(ROOT, a.relativePath), path.join(attachmentsDir, a.originalName));
  }

  const settings = getSettings();
  const html = toMailHtml(application, vehicle, settings, lang);
  const text = toMailText(application, vehicle, settings, lang);
  fs.writeFileSync(path.join(outboxDir, 'payload.json'), JSON.stringify(application, null, 2), 'utf8');
  fs.writeFileSync(path.join(outboxDir, 'email-preview.html'), html, 'utf8');
  fs.writeFileSync(path.join(outboxDir, 'email-preview.txt'), text, 'utf8');

  try {
    const result = await trySendEmail(application, vehicle, settings, outboxDir, lang);
    application.emailSent = result.sent;
    application.emailReason = result.reason || (result.sent ? 'sent' : 'not-sent');
    saveApplications(getApplications().map(item => item.publicId === application.publicId ? application : item));
    fs.writeFileSync(path.join(outboxDir, 'delivery.json'), JSON.stringify(result, null, 2), 'utf8');
  } catch (error) {
    application.emailSent = false;
    application.emailReason = error.message;
    saveApplications(getApplications().map(item => item.publicId === application.publicId ? application : item));
    fs.writeFileSync(path.join(outboxDir, 'delivery.json'), JSON.stringify({ sent: false, error: error.message }, null, 2), 'utf8');
  }

  res.redirect(`/thank-you/${publicId}${lang === 'en' ? '?lang=en' : ''}`);
});

app.get('/thank-you/:id', (req, res) => {
  const lang = detectLang(req);
  const application = getApplications().find(item => item.publicId === req.params.id);
  if (!application) return res.status(404).render('error', { title: lang === 'en' ? 'Not found' : 'Δεν βρέθηκε', heading: lang === 'en' ? 'Application not found' : 'Δεν βρέθηκε αίτηση', message: lang === 'en' ? 'The demo application was not found.' : 'Δεν βρέθηκε η αίτηση του demo.' });
  const vehicle = bySlug(application.vehicleSlug);
  res.render('thank-you', { title: lang === 'en' ? 'Application sent' : 'Η αίτηση στάλθηκε', application, vehicle });
});

app.get('/secret/outbox/:id', (req, res) => {
  const target = path.join(OUTBOX_DIR, req.params.id, 'email-preview.html');
  if (!fs.existsSync(target)) return res.status(404).send('Mail preview not found.');
  res.type('html').send(fs.readFileSync(target, 'utf8'));
});

app.use((req, res) => {
  const lang = detectLang(req);
  res.status(404).render('error', {
    title: lang === 'en' ? 'Not found' : 'Δεν βρέθηκε',
    heading: lang === 'en' ? 'Page not found' : 'Η σελίδα δεν βρέθηκε',
    message: lang === 'en' ? 'The demo route you requested does not exist.' : 'Το demo route που ζητήσατε δεν υπάρχει.'
  });
});

app.listen(PORT, () => {
  console.log(`Carhino demo running on http://localhost:${PORT}`);
});
