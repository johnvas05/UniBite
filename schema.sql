-- UniBite database schema + seed data
-- Usage: mysql -u root < schema.sql

-- The file is UTF-8; force the client connection charset to match,
-- otherwise Windows mysql clients (cp850 default) corrupt the Greek seed text
SET NAMES utf8mb4;

DROP DATABASE IF EXISTS unibite;
CREATE DATABASE unibite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE unibite;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(255) NOT NULL UNIQUE,
  email         VARCHAR(255) NOT NULL UNIQUE,
  phone         VARCHAR(20)  NOT NULL DEFAULT '',
  password_hash VARCHAR(100) NOT NULL,
  first_name    VARCHAR(60)  NOT NULL,
  last_name     VARCHAR(60)  NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
  avatar_url    VARCHAR(255) NULL,
  role          ENUM('student','admin') NOT NULL DEFAULT 'student',
  points        INT NOT NULL DEFAULT 5,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE listings (
  id                 INT AUTO_INCREMENT PRIMARY KEY,
  cook_id            INT NOT NULL,
  title              VARCHAR(150) NOT NULL,
  photo_url          VARCHAR(255) NULL,
  notes              TEXT,
  portions_total     INT NOT NULL,
  portions_available INT NOT NULL,
  pickup_location    VARCHAR(255) NOT NULL,
  pickup_lat         DECIMAL(9,6) NOT NULL,
  pickup_lng         DECIMAL(9,6) NOT NULL,
  pickup_time        VARCHAR(100) NOT NULL,
  created_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cook_id) REFERENCES users(id) ON DELETE CASCADE
);
-- Listing status is computed on read:
--   active   = age < 48h AND portions_available > 0
--   inactive = age < 48h AND portions_available = 0
--   deleted  = age >= 48h (hidden from feed, kept for statistics)

CREATE TABLE allergens (
  id   INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE listing_allergens (
  listing_id  INT NOT NULL,
  allergen_id INT NOT NULL,
  PRIMARY KEY (listing_id, allergen_id),
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (allergen_id) REFERENCES allergens(id) ON DELETE CASCADE
);

CREATE TABLE requests (
  id                     INT AUTO_INCREMENT PRIMARY KEY,
  listing_id             INT NOT NULL,
  consumer_id            INT NOT NULL,
  status                 ENUM('pending','approved','rejected','picked_up','no_show') NOT NULL DEFAULT 'pending',
  created_at             DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at            DATETIME NULL,
  picked_up_at           DATETIME NULL,
  rating_penalty_applied TINYINT(1) NOT NULL DEFAULT 0,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE ratings (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  request_id  INT NOT NULL UNIQUE,
  listing_id  INT NOT NULL,
  consumer_id INT NOT NULL,
  cook_id     INT NOT NULL,
  stars       INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE CASCADE,
  FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
  FOREIGN KEY (consumer_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (cook_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- Seed: the 14 EU food allergens (eufic.org)
INSERT INTO allergens (name) VALUES
  ('Δημητριακά με γλουτένη'), ('Καρκινοειδή'), ('Αυγά'), ('Ψάρια'),
  ('Αράπικα φιστίκια'), ('Σόγια'), ('Γάλα'), ('Ξηροί καρποί'),
  ('Σέλινο'), ('Μουστάρδα'), ('Σουσάμι'), ('Διοξείδιο του θείου / θειώδη'),
  ('Λούπινο'), ('Μαλάκια');

-- Shared bcrypt hash for the demo password (pass1234)
SET @pw := '$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC';

-- Seed users (password for all: pass1234). Mix of Athens (NTUA) + Patras students
-- with varied points, so the leaderboard and reservations have depth.
INSERT INTO users (username, email, phone, password_hash, first_name, last_name, display_name, role, points) VALUES
  ('admin',     'admin@unibite.gr',       '2107722000', @pw, 'Διαχειριστής', '',             'Διαχειριστής',        'admin',   0),
  ('maria',     'maria@mail.ntua.gr',     '6941234567', @pw, 'Μαρία',        'Παπαδοπούλου',  'Μαρία Παπαδοπούλου',    'student', 14),
  ('giorgos',   'giorgos@mail.ntua.gr',   '6957654321', @pw, 'Γιώργος',      'Νικολάου',      'Γιώργος Νικολάου',      'student', 9),
  ('eleni',     'eleni@mail.ntua.gr',     '6909876543', @pw, 'Ελένη',        'Δημητρίου',     'Ελένη Δημητρίου',       'student', 6),
  ('kostas',    'kostas@upnet.gr',        '6971112233', @pw, 'Κώστας',       'Αγγελόπουλος',  'Κώστας Αγγελόπουλος',   'student', 11),
  ('nikos',     'nikos@upnet.gr',         '6982223344', @pw, 'Νίκος',        'Παππάς',        'Νίκος Παππάς',          'student', 7),
  ('sofia',     'sofia@mail.ntua.gr',     '6933445566', @pw, 'Σοφία',        'Ιωάννου',       'Σοφία Ιωάννου',         'student', 8),
  ('dimitris',  'dimitris@upnet.gr',      '6944556677', @pw, 'Δημήτρης',     'Μακρής',        'Δημήτρης Μακρής',       'student', 5),
  ('androniki', 'androniki@mail.ntua.gr', '6955667788', @pw, 'Ανδρονίκη',    'Βλάχου',        'Ανδρονίκη Βλάχου',      'student', 6);

-- ---------------------------------------------------------------------------
-- Listings. created_at is offset from NOW() so every status appears:
--   active   (< 48h, portions left)   inactive (< 48h, 0 portions, greyed)
--   deleted  (>= 48h, hidden from feed but kept for statistics)
-- Athens cluster ~ Zografou/NTUA · Patras clusters ~ Rio campus + city centre
-- (coords spread ~0.1–6.6 km so the distance/maxKm filter has something to do).
INSERT INTO listings (cook_id, title, notes, portions_total, portions_available,
                      pickup_location, pickup_lat, pickup_lng, pickup_time, created_at) VALUES
  -- Athens
  ( 2, 'Παστίτσιο της γιαγιάς',     'Φρεσκοψημένο σε ταψί, με μπεσαμέλ. Κρατήστε ζεστό!',          6, 3, 'Εστία ΕΜΠ, Δωμάτιο 214',                    37.978800, 23.787000, 'Σήμερα 18:00 - 20:00',  NOW() - INTERVAL 2 HOUR),
  ( 2, 'Φακές σούπα',              'Με λαδολέμονο, χωρίς γλουτένη.',                              4, 0, 'Κτίριο Ηλεκτρολόγων, είσοδος',              37.978100, 23.782500, 'Σήμερα 13:00 - 14:30',  NOW() - INTERVAL 5 HOUR),
  ( 3, 'Κοτόπουλο λεμονάτο με ρύζι','Μερίδες σε ταπεράκια, μόλις βγήκαν από τον φούρνο.',          5, 3, 'Εστία ΦΕΠΑ, υποδοχή',                       37.974500, 23.792000, 'Αύριο 12:00 - 15:00',   NOW() - INTERVAL 3 HOUR),
  ( 4, 'Γεμιστά νηστίσιμα',        'Ντομάτες και πιπεριές γεμιστές με ρύζι και μυρωδικά.',         4, 4, 'Κεντρική Βιβλιοθήκη ΕΜΠ',                    37.977900, 23.785300, 'Σήμερα 17:00 - 19:00',  NOW() - INTERVAL 1 HOUR),
  ( 2, 'Μουσακάς φούρνου',         'Με μπεσαμέλ και φρέσκα λαχανικά. Μεγάλο ταψί!',                8, 6, 'Σχολή Χημικών Μηχανικών, ισόγειο',           37.979000, 23.783500, 'Σήμερα 20:00 - 21:30',  NOW() - INTERVAL 6 HOUR),
  ( 3, 'Σπανακόπιτα χωριάτικη',    'Με χωριάτικο φύλλο, ψημένη το πρωί.',                          6, 2, 'Εστία ΕΜΠ, Δωμάτιο 118',                    37.978300, 23.786600, 'Αύριο 10:00 - 12:00',   NOW() - INTERVAL 8 HOUR),
  ( 9, 'Φασολάδα',                 'Η κλασική, με σέλινο και καρότο. Ζεστή!',                      5, 5, 'Πολυτεχνειούπολη Ζωγράφου, στάση λεωφορείου',37.976000, 23.788000, 'Σήμερα 19:30 - 21:00',  NOW() - INTERVAL 30 MINUTE),
  ( 4, 'Κεφτεδάκια με πατάτες',    'Τηγανητά κεφτεδάκια και πατάτες φούρνου.',                     7, 0, 'Εστία ΦΕΠΑ, κουζίνα 2ου',                   37.974800, 23.791500, 'Σήμερα 14:00 - 15:00',  NOW() - INTERVAL 7 HOUR),
  ( 7, 'Ριζότο μανιταριών',        'Κρεμώδες, με παρμεζάνα και φρέσκο μαϊντανό.',                  4, 4, 'Σχολή Ναυπηγών, αίθριο',                     37.977200, 23.784200, 'Αύριο 13:00 - 14:30',   NOW() - INTERVAL 4 HOUR),
  -- Patras (Rio campus)
  ( 5, 'Μακαρόνια με κιμά',        'Μεγάλη μερίδα, με φρεσκοτριμμένο κεφαλοτύρι.',                 6, 4, 'Φοιτητική Εστία Παν. Πατρών, Ρίο',           38.288500, 21.788600, 'Σήμερα 19:00 - 21:00',  NOW() - INTERVAL 3 HOUR),
  ( 5, 'Μπριάμ στον φούρνο',       'Νηστίσιμο, με πατάτες και κολοκυθάκια.',                       4, 4, 'Τμήμα Πολιτικών Μηχανικών, Παν. Πατρών',     38.290200, 21.787000, 'Σήμερα 14:00 - 16:00',  NOW() - INTERVAL 5 HOUR),
  ( 6, 'Ρεβύθια γιαχνί',           'Σπιτικά, με πολύ λεμόνι. Χωρίς γλουτένη.',                     5, 3, 'Βιβλιοθήκη & Κέντρο Πληροφόρησης, Ρίο',      38.291000, 21.788000, 'Αύριο 12:30 - 14:00',   NOW() - INTERVAL 9 HOUR),
  ( 8, 'Σουτζουκάκια σμυρνέικα',   'Με σάλτσα ντομάτας και κύμινο, πάνω σε ρύζι.',                 6, 4, 'Τμήμα Μηχ/κών Η/Υ & Πληροφορικής, Παν. Πατρών',38.289500, 21.790500, 'Σήμερα 20:30 - 22:00', NOW() - INTERVAL 2 HOUR),
  ( 6, 'Χωριάτικη ζυμαρόπιτα',     'Με τραχανά και τυρί. Μικρή ποσότητα, βιαστείτε!',              8, 1, 'Εστία Παν. Πατρών Ρίο, κτίριο Β',            38.288800, 21.789200, 'Αύριο 09:00 - 11:00',   NOW() - INTERVAL 10 HOUR),
  -- Patras (city centre, ~6.5 km from campus)
  ( 8, 'Τυρόπιτα κουρού',          'Φρέσκια, ψημένη το πρωί. Παραλαβή στο κέντρο.',                8, 8, 'Πλατεία Γεωργίου Α΄, Κέντρο Πάτρας',         38.246600, 21.734600, 'Σήμερα 11:00 - 13:00',  NOW() - INTERVAL 4 HOUR),
  ( 5, 'Σιμιγδαλένιος χαλβάς',     'Γλυκό ταψιού με αμύγδαλο και κανέλα.',                         10,9, 'Λιμάνι Πάτρας, μπροστά στον σταθμό',         38.241000, 21.729000, 'Σήμερα 16:00 - 18:00',  NOW() - INTERVAL 6 HOUR),
  -- Expired (>= 48h): hidden from the feed, kept for statistics
  ( 2, 'Μπιφτέκια σχάρας',         'Με ψητά λαχανικά. (Παλιά αγγελία — δεν εμφανίζεται πλέον.)',   6, 0, 'Εστία ΕΜΠ, αίθριο',                          37.978800, 23.786900, 'Χθες 19:00 - 20:30',    NOW() - INTERVAL 50 HOUR),
  ( 5, 'Ρεβίθια στον φούρνο',      'Με δεντρολίβανο. (Παλιά αγγελία — δεν εμφανίζεται πλέον.)',    5, 0, 'Φοιτητική Εστία Παν. Πατρών, Ρίο',           38.289900, 21.788400, 'Χθες 13:00 - 14:00',    NOW() - INTERVAL 52 HOUR);

-- Declared allergens (some listings have none, so the allergen-exclude filter is visible)
INSERT INTO listing_allergens (listing_id, allergen_id) VALUES
  ( 1, 1), ( 1, 3), ( 1, 7),                 -- παστίτσιο: γλουτένη, αυγά, γάλα
  ( 3, 9),                                    -- κοτόπουλο: σέλινο
  ( 5, 1), ( 5, 3), ( 5, 7),                 -- μουσακάς: γλουτένη, αυγά, γάλα
  ( 6, 1), ( 6, 3), ( 6, 7),                 -- σπανακόπιτα: γλουτένη, αυγά, γάλα
  ( 7, 9),                                    -- φασολάδα: σέλινο
  ( 8, 1), ( 8, 3), ( 8, 7),                 -- κεφτεδάκια: γλουτένη, αυγά, γάλα
  ( 9, 7), ( 9, 9),                           -- ριζότο: γάλα, σέλινο
  (10, 1), (10, 7),                           -- μακαρόνια με κιμά: γλουτένη, γάλα
  (13, 1), (13, 3), (13, 7), (13, 9),         -- σουτζουκάκια: γλουτένη, αυγά, γάλα, σέλινο
  (14, 1), (14, 3), (14, 7),                 -- ζυμαρόπιτα: γλουτένη, αυγά, γάλα
  (15, 1), (15, 3), (15, 7),                 -- τυρόπιτα: γλουτένη, αυγά, γάλα
  (16, 8),                                    -- χαλβάς: ξηροί καρποί
  (17, 1), (17, 3), (17, 7);                 -- μπιφτέκια (expired): γλουτένη, αυγά, γάλα

-- ---------------------------------------------------------------------------
-- Requests in every status, so the cook inbox, the consumer's reservations and
-- the admin statistics are all populated. portions_available above already
-- reflects the approved + picked-up portions per listing.
INSERT INTO requests (listing_id, consumer_id, status, created_at, approved_at, picked_up_at) VALUES
  -- listing 1 (maria): 2 pending, 1 approved, 2 picked-up, 1 rejected
  ( 1, 4, 'pending',   NOW() - INTERVAL 90 MINUTE, NULL,                      NULL),                       -- R1
  ( 1, 7, 'pending',   NOW() - INTERVAL 80 MINUTE, NULL,                      NULL),                       -- R2
  ( 1, 3, 'approved',  NOW() - INTERVAL 5 HOUR,    NOW() - INTERVAL 1 HOUR,   NULL),                       -- R3
  ( 1, 5, 'picked_up', NOW() - INTERVAL 6 HOUR,    NOW() - INTERVAL 5 HOUR,   NOW() - INTERVAL 4 HOUR),    -- R4 (rated)
  ( 1, 9, 'picked_up', NOW() - INTERVAL 4 HOUR,    NOW() - INTERVAL 3 HOUR,   NOW() - INTERVAL 2 HOUR),    -- R5 (awaiting rating)
  ( 1, 8, 'rejected',  NOW() - INTERVAL 7 HOUR,    NULL,                      NULL),                       -- R6
  -- listing 3 (giorgos)
  ( 3, 4, 'picked_up', NOW() - INTERVAL 7 HOUR,    NOW() - INTERVAL 6 HOUR,   NOW() - INTERVAL 5 HOUR),    -- R7 (rated)
  ( 3, 2, 'approved',  NOW() - INTERVAL 3 HOUR,    NOW() - INTERVAL 2 HOUR,   NULL),                       -- R8
  ( 3, 7, 'pending',   NOW() - INTERVAL 70 MINUTE, NULL,                      NULL),                       -- R9
  -- listing 5 (maria): two pickups + one no-show
  ( 5, 6, 'picked_up', NOW() - INTERVAL 8 HOUR,    NOW() - INTERVAL 7 HOUR,   NOW() - INTERVAL 6 HOUR),    -- R10 (rated 5)
  ( 5, 5, 'picked_up', NOW() - INTERVAL 8 HOUR,    NOW() - INTERVAL 7 HOUR,   NOW() - INTERVAL 6 HOUR),    -- R11 (rated 2)
  ( 5, 4, 'no_show',   NOW() - INTERVAL 9 HOUR,    NOW() - INTERVAL 8 HOUR,   NULL),                       -- R12
  -- listing 10 (kostas, Patras)
  (10, 6, 'pending',   NOW() - INTERVAL 60 MINUTE, NULL,                      NULL),                       -- R13
  (10, 8, 'approved',  NOW() - INTERVAL 2 HOUR,    NOW() - INTERVAL 1 HOUR,   NULL),                       -- R14
  (10, 2, 'picked_up', NOW() - INTERVAL 5 HOUR,    NOW() - INTERVAL 4 HOUR,   NOW() - INTERVAL 3 HOUR),    -- R15 (rated)
  -- listing 13 (dimitris, Patras)
  (13, 5, 'picked_up', NOW() - INTERVAL 6 HOUR,    NOW() - INTERVAL 5 HOUR,   NOW() - INTERVAL 4 HOUR),    -- R16 (rated)
  (13, 6, 'picked_up', NOW() - INTERVAL 3 HOUR,    NOW() - INTERVAL 2 HOUR,   NOW() - INTERVAL 90 MINUTE), -- R17 (awaiting rating)
  -- expired listings (still count toward statistics)
  (17, 3, 'picked_up', NOW() - INTERVAL 50 HOUR,   NOW() - INTERVAL 49 HOUR,  NOW() - INTERVAL 49 HOUR),   -- R18 (rated)
  (17, 4, 'picked_up', NOW() - INTERVAL 51 HOUR,   NOW() - INTERVAL 50 HOUR,  NOW() - INTERVAL 50 HOUR),   -- R19 (rated)
  (18, 7, 'picked_up', NOW() - INTERVAL 52 HOUR,   NOW() - INTERVAL 51 HOUR,  NOW() - INTERVAL 51 HOUR);   -- R20 (rated)

-- Ratings for the picked-up requests above (R5 and R17 left unrated on purpose,
-- so the "leave a rating" widget is visible — both are < 48h, so no penalty).
INSERT INTO ratings (request_id, listing_id, consumer_id, cook_id, stars, created_at) VALUES
  ( 4,  1, 5, 2, 5, NOW() - INTERVAL 3 HOUR),   -- R4  → maria
  ( 7,  3, 4, 3, 4, NOW() - INTERVAL 4 HOUR),   -- R7  → giorgos
  (10,  5, 6, 2, 5, NOW() - INTERVAL 5 HOUR),   -- R10 → maria
  (11,  5, 5, 2, 2, NOW() - INTERVAL 5 HOUR),   -- R11 → maria (≤3/5: no bonus point)
  (15, 10, 2, 5, 4, NOW() - INTERVAL 2 HOUR),   -- R15 → kostas
  (16, 13, 5, 8, 5, NOW() - INTERVAL 3 HOUR),   -- R16 → dimitris
  (18, 17, 3, 2, 5, NOW() - INTERVAL 48 HOUR),  -- R18 → maria
  (19, 17, 4, 2, 4, NOW() - INTERVAL 49 HOUR),  -- R19 → maria
  (20, 18, 7, 5, 5, NOW() - INTERVAL 50 HOUR);  -- R20 → kostas
