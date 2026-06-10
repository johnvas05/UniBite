# UniBite 🍲

Φοιτητική πλατφόρμα διαμοιρασμού φαγητού — εργαστηριακή άσκηση «Προγραμματισμός και
Συστήματα στον Παγκόσμιο Ιστό» 2025/26.

## Τεχνολογίες

- **Backend:** Node.js + Express, express-session (αυθεντικοποίηση), bcrypt, multer (φωτογραφίες)
- **Βάση:** MySQL / MariaDB (`schema.sql` περιέχει DDL + δοκιμαστικά δεδομένα)
- **Front-end:** Vanilla JavaScript SPA (DOM manipulation, fetch API), Leaflet + OpenStreetMap, responsive CSS (Flexbox/Grid/media queries)

## Εκτέλεση

1. Δημιουργία βάσης: `mysql -u root < schema.sql`
2. Ρυθμίσεις σύνδεσης στο `.env` (DB_HOST, DB_USER, DB_PASSWORD, DB_NAME)
3. `npm install`
4. `npm start` → http://localhost:3000

Δοκιμαστικοί λογαριασμοί (κωδικός για όλους: `pass1234`):

| Χρήστης | Ρόλος |
|---|---|
| `admin` | Διαχειριστής |
| `maria`, `giorgos`, `eleni` | Φοιτητές |

## Export βάσης (παραδοτέο)

```
mysqldump -u root unibite > unibite_export.sql
```

## Δομή

- `server.js` — Express entry point + περιοδικός έλεγχος (λήξη 48ώρου, ποινές μη βαθμολόγησης)
- `routes/` — REST API (auth, listings, requests, ratings, admin)
- `public/` — SPA front-end (HTML/CSS/JS)
- `schema.sql` — σχήμα ΒΔ + seed δεδομένα

## Κανόνες πόντων

- Νέος χρήστης: 5 πόντοι· δέσμευση μερίδας απαιτεί ≥ 1 πόντο (χρέωση −1 κατά την έγκριση)
- Μάγειρας: +1 ανά παραδομένη μερίδα, +1 επιπλέον αν η βαθμολογία > 3/5
- Μη παραλαβή δεσμευμένης μερίδας: −1 στον αιτούντα
- Μη βαθμολόγηση εντός 48 ωρών από την παραλαβή: −1 στον παραλήπτη
