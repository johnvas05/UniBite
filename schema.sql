-- UniBite database schema + seed data
-- Usage: mysql -u root < schema.sql

DROP DATABASE IF EXISTS unibite;
CREATE DATABASE unibite CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE unibite;

CREATE TABLE users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  display_name  VARCHAR(100) NOT NULL,
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

-- Seed users (password for all: pass1234)
INSERT INTO users (username, password_hash, display_name, role, points) VALUES
  ('admin',   '$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC', 'Διαχειριστής', 'admin', 0),
  ('maria',   '$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC', 'Μαρία Παπαδοπούλου', 'student', 8),
  ('giorgos', '$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC', 'Γιώργος Νικολάου', 'student', 5),
  ('eleni',   '$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC', 'Ελένη Δημητρίου', 'student', 5);

-- Seed listings around the Zografou university campus (Athens)
INSERT INTO listings (cook_id, title, notes, portions_total, portions_available,
                      pickup_location, pickup_lat, pickup_lng, pickup_time, created_at) VALUES
  (2, 'Παστίτσιο της γιαγιάς', 'Φρεσκοψημένο σε ταψί, με μπεσαμέλ. Κρατήστε ζεστό!',
   6, 4, 'Εστία ΕΜΠ, Δωμάτιο 214', 37.978800, 23.787000, 'Σήμερα 18:00 - 20:00', NOW()),
  (2, 'Φακές σούπα', 'Με λαδολέμονο, χωρίς γλουτένη.',
   4, 0, 'Κτίριο Ηλεκτρολόγων, είσοδος', 37.978100, 23.782500, 'Σήμερα 13:00 - 14:30', NOW()),
  (3, 'Κοτόπουλο με ρύζι', 'Λεμονάτο, μερίδες σε ταπεράκια.',
   5, 5, 'Εστία ΦΕΠΑ, υποδοχή', 37.974500, 23.792000, 'Αύριο 12:00 - 15:00', NOW()),
  (4, 'Γεμιστά', 'Ντομάτες και πιπεριές γεμιστές, νηστίσιμα.',
   3, 3, 'Κεντρική Βιβλιοθήκη ΕΜΠ', 37.977900, 23.785300, 'Σήμερα 17:00 - 19:00', NOW());

INSERT INTO listing_allergens (listing_id, allergen_id) VALUES
  (1, 1), (1, 3), (1, 7),  -- παστίτσιο: γλουτένη, αυγά, γάλα
  (3, 9);                  -- κοτόπουλο: σέλινο
