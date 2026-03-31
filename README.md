# Carhino Leasing Demo

# Carhino Leasing Platform Demo

## Άνοιγμα σε Windows
1. Κάνε διπλό κλικ στο `start_windows_easy.bat`
2. Περίμενε να ανοίξει ο browser στο `http://localhost:3000`

## Camera / Έγγραφα
- Σε κινητό, τα κουμπιά εγγράφων ανοίγουν άμεσα την κάμερα ή το file picker της συσκευής.
- Σε desktop, ανοίγει το σύστημα επιλογής αρχείων.

## Email flow
- Αν δεν υπάρχουν SMTP στοιχεία, κάθε αίτηση αποθηκεύεται μέσα στο `outbox/` με:
  - `payload.json`
  - `email-preview.html`
  - `email-preview.txt`
  - `attachments/`
- Αν συμπληρωθούν SMTP στοιχεία στο `.env`, γίνεται και πραγματική αποστολή email με συνημμένα.

## Αρχεία που αξίζει να ξέρεις
- `server.js`
- `data/vehicles.json`
- `data/settings.json`
- `outbox/`
- `uploads/applications/`


## v9 notes
- Premium lead-delivery presentation for Giorgos
- Comparison panel for the 2 demo vehicles
- Cleaner application checklist and richer thank-you/email-preview messaging
