-- MySQL dump 10.13  Distrib 8.4.9, for Win64 (x86_64)
--
-- Host: localhost    Database: unibite
-- ------------------------------------------------------
-- Server version	8.4.9

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `unibite`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `unibite` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `unibite`;

--
-- Table structure for table `allergens`
--

DROP TABLE IF EXISTS `allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `allergens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `allergens`
--

LOCK TABLES `allergens` WRITE;
/*!40000 ALTER TABLE `allergens` DISABLE KEYS */;
INSERT INTO `allergens` VALUES (5,'Αράπικα φιστίκια'),(3,'Αυγά'),(7,'Γάλα'),(1,'Δημητριακά με γλουτένη'),(12,'Διοξείδιο του θείου / θειώδη'),(2,'Καρκινοειδή'),(13,'Λούπινο'),(14,'Μαλάκια'),(10,'Μουστάρδα'),(8,'Ξηροί καρποί'),(9,'Σέλινο'),(6,'Σόγια'),(11,'Σουσάμι'),(4,'Ψάρια');
/*!40000 ALTER TABLE `allergens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `listing_allergens`
--

DROP TABLE IF EXISTS `listing_allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `listing_allergens` (
  `listing_id` int NOT NULL,
  `allergen_id` int NOT NULL,
  PRIMARY KEY (`listing_id`,`allergen_id`),
  KEY `allergen_id` (`allergen_id`),
  CONSTRAINT `listing_allergens_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `listing_allergens_ibfk_2` FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `listing_allergens`
--

LOCK TABLES `listing_allergens` WRITE;
/*!40000 ALTER TABLE `listing_allergens` DISABLE KEYS */;
INSERT INTO `listing_allergens` VALUES (1,1),(5,1),(6,1),(8,1),(10,1),(13,1),(14,1),(15,1),(17,1),(1,3),(5,3),(6,3),(8,3),(13,3),(14,3),(15,3),(17,3),(1,7),(5,7),(6,7),(8,7),(9,7),(10,7),(13,7),(14,7),(15,7),(17,7),(16,8),(3,9),(7,9),(9,9),(13,9);
/*!40000 ALTER TABLE `listing_allergens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `listings`
--

DROP TABLE IF EXISTS `listings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `listings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cook_id` int NOT NULL,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `notes` text COLLATE utf8mb4_unicode_ci,
  `portions_total` int NOT NULL,
  `portions_available` int NOT NULL,
  `pickup_location` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `pickup_lat` decimal(9,6) NOT NULL,
  `pickup_lng` decimal(9,6) NOT NULL,
  `pickup_time` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cook_id` (`cook_id`),
  CONSTRAINT `listings_ibfk_1` FOREIGN KEY (`cook_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `listings`
--

LOCK TABLES `listings` WRITE;
/*!40000 ALTER TABLE `listings` DISABLE KEYS */;
INSERT INTO `listings` VALUES (1,2,'Παστίτσιο της γιαγιάς','/uploads/1781450002162.jpg','Φρεσκοψημένο σε ταψί, με μπεσαμέλ. Κρατήστε ζεστό!',6,3,'Εστία ΕΜΠ, Δωμάτιο 214',37.978800,23.787000,'Σήμερα 18:00 - 20:00','2026-06-14 16:13:12'),(2,2,'Φακές σούπα',NULL,'Με λαδολέμονο, χωρίς γλουτένη.',4,0,'Κτίριο Ηλεκτρολόγων, είσοδος',37.978100,23.782500,'Σήμερα 13:00 - 14:30','2026-06-14 13:13:12'),(3,3,'Κοτόπουλο λεμονάτο με ρύζι',NULL,'Μερίδες σε ταπεράκια, μόλις βγήκαν από τον φούρνο.',5,3,'Εστία ΦΕΠΑ, υποδοχή',37.974500,23.792000,'Αύριο 12:00 - 15:00','2026-06-14 15:13:12'),(4,4,'Γεμιστά νηστίσιμα',NULL,'Ντομάτες και πιπεριές γεμιστές με ρύζι και μυρωδικά.',4,4,'Κεντρική Βιβλιοθήκη ΕΜΠ',37.977900,23.785300,'Σήμερα 17:00 - 19:00','2026-06-14 17:13:12'),(5,2,'Μουσακάς φούρνου',NULL,'Με μπεσαμέλ και φρέσκα λαχανικά. Μεγάλο ταψί!',8,6,'Σχολή Χημικών Μηχανικών, ισόγειο',37.979000,23.783500,'Σήμερα 20:00 - 21:30','2026-06-14 12:13:12'),(6,3,'Σπανακόπιτα χωριάτικη',NULL,'Με χωριάτικο φύλλο, ψημένη το πρωί.',6,2,'Εστία ΕΜΠ, Δωμάτιο 118',37.978300,23.786600,'Αύριο 10:00 - 12:00','2026-06-14 10:13:12'),(7,9,'Φασολάδα',NULL,'Η κλασική, με σέλινο και καρότο. Ζεστή!',5,5,'Πολυτεχνειούπολη Ζωγράφου, στάση λεωφορείου',37.976000,23.788000,'Σήμερα 19:30 - 21:00','2026-06-14 17:43:12'),(8,4,'Κεφτεδάκια με πατάτες',NULL,'Τηγανητά κεφτεδάκια και πατάτες φούρνου.',7,0,'Εστία ΦΕΠΑ, κουζίνα 2ου',37.974800,23.791500,'Σήμερα 14:00 - 15:00','2026-06-14 11:13:12'),(9,7,'Ριζότο μανιταριών',NULL,'Κρεμώδες, με παρμεζάνα και φρέσκο μαϊντανό.',4,4,'Σχολή Ναυπηγών, αίθριο',37.977200,23.784200,'Αύριο 13:00 - 14:30','2026-06-14 14:13:12'),(10,5,'Μακαρόνια με κιμά',NULL,'Μεγάλη μερίδα, με φρεσκοτριμμένο κεφαλοτύρι.',6,4,'Φοιτητική Εστία Παν. Πατρών, Ρίο',38.288500,21.788600,'Σήμερα 19:00 - 21:00','2026-06-14 15:13:12'),(11,5,'Μπριάμ στον φούρνο',NULL,'Νηστίσιμο, με πατάτες και κολοκυθάκια.',4,4,'Τμήμα Πολιτικών Μηχανικών, Παν. Πατρών',38.290200,21.787000,'Σήμερα 14:00 - 16:00','2026-06-14 13:13:12'),(12,6,'Ρεβύθια γιαχνί',NULL,'Σπιτικά, με πολύ λεμόνι. Χωρίς γλουτένη.',5,3,'Βιβλιοθήκη & Κέντρο Πληροφόρησης, Ρίο',38.291000,21.788000,'Αύριο 12:30 - 14:00','2026-06-14 09:13:12'),(13,8,'Σουτζουκάκια σμυρνέικα',NULL,'Με σάλτσα ντομάτας και κύμινο, πάνω σε ρύζι.',6,4,'Τμήμα Μηχ/κών Η/Υ & Πληροφορικής, Παν. Πατρών',38.289500,21.790500,'Σήμερα 20:30 - 22:00','2026-06-14 16:13:12'),(14,6,'Χωριάτικη ζυμαρόπιτα',NULL,'Με τραχανά και τυρί. Μικρή ποσότητα, βιαστείτε!',8,1,'Εστία Παν. Πατρών Ρίο, κτίριο Β',38.288800,21.789200,'Αύριο 09:00 - 11:00','2026-06-14 08:13:12'),(15,8,'Τυρόπιτα κουρού',NULL,'Φρέσκια, ψημένη το πρωί. Παραλαβή στο κέντρο.',8,8,'Πλατεία Γεωργίου Α΄, Κέντρο Πάτρας',38.246600,21.734600,'Σήμερα 11:00 - 13:00','2026-06-14 14:13:12'),(16,5,'Σιμιγδαλένιος χαλβάς',NULL,'Γλυκό ταψιού με αμύγδαλο και κανέλα.',10,9,'Λιμάνι Πάτρας, μπροστά στον σταθμό',38.241000,21.729000,'Σήμερα 16:00 - 18:00','2026-06-14 12:13:12'),(17,2,'Μπιφτέκια σχάρας',NULL,'Με ψητά λαχανικά. (Παλιά αγγελία — δεν εμφανίζεται πλέον.)',6,0,'Εστία ΕΜΠ, αίθριο',37.978800,23.786900,'Χθες 19:00 - 20:30','2026-06-12 16:13:12'),(18,5,'Ρεβίθια στον φούρνο',NULL,'Με δεντρολίβανο. (Παλιά αγγελία — δεν εμφανίζεται πλέον.)',5,0,'Φοιτητική Εστία Παν. Πατρών, Ρίο',38.289900,21.788400,'Χθες 13:00 - 14:00','2026-06-12 14:13:12');
/*!40000 ALTER TABLE `listings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ratings`
--

DROP TABLE IF EXISTS `ratings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ratings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `request_id` int NOT NULL,
  `listing_id` int NOT NULL,
  `consumer_id` int NOT NULL,
  `cook_id` int NOT NULL,
  `stars` int NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `request_id` (`request_id`),
  KEY `listing_id` (`listing_id`),
  KEY `consumer_id` (`consumer_id`),
  KEY `cook_id` (`cook_id`),
  CONSTRAINT `ratings_ibfk_1` FOREIGN KEY (`request_id`) REFERENCES `requests` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_ibfk_2` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_ibfk_3` FOREIGN KEY (`consumer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_ibfk_4` FOREIGN KEY (`cook_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ratings_chk_1` CHECK ((`stars` between 1 and 5))
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ratings`
--

LOCK TABLES `ratings` WRITE;
/*!40000 ALTER TABLE `ratings` DISABLE KEYS */;
INSERT INTO `ratings` VALUES (1,4,1,5,2,5,'2026-06-14 15:13:12'),(2,7,3,4,3,4,'2026-06-14 14:13:12'),(3,10,5,6,2,5,'2026-06-14 13:13:12'),(4,11,5,5,2,2,'2026-06-14 13:13:12'),(5,15,10,2,5,4,'2026-06-14 16:13:12'),(6,16,13,5,8,5,'2026-06-14 15:13:12'),(7,18,17,3,2,5,'2026-06-12 18:13:12'),(8,19,17,4,2,4,'2026-06-12 17:13:12'),(9,20,18,7,5,5,'2026-06-12 16:13:12');
/*!40000 ALTER TABLE `ratings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `requests`
--

DROP TABLE IF EXISTS `requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `requests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `listing_id` int NOT NULL,
  `consumer_id` int NOT NULL,
  `status` enum('pending','approved','rejected','picked_up','no_show') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` datetime DEFAULT NULL,
  `picked_up_at` datetime DEFAULT NULL,
  `rating_penalty_applied` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `listing_id` (`listing_id`),
  KEY `consumer_id` (`consumer_id`),
  CONSTRAINT `requests_ibfk_1` FOREIGN KEY (`listing_id`) REFERENCES `listings` (`id`) ON DELETE CASCADE,
  CONSTRAINT `requests_ibfk_2` FOREIGN KEY (`consumer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `requests`
--

LOCK TABLES `requests` WRITE;
/*!40000 ALTER TABLE `requests` DISABLE KEYS */;
INSERT INTO `requests` VALUES (1,1,4,'pending','2026-06-14 16:43:12',NULL,NULL,0),(2,1,7,'pending','2026-06-14 16:53:12',NULL,NULL,0),(3,1,3,'approved','2026-06-14 13:13:12','2026-06-14 17:13:12',NULL,0),(4,1,5,'picked_up','2026-06-14 12:13:12','2026-06-14 13:13:12','2026-06-14 14:13:12',0),(5,1,9,'picked_up','2026-06-14 14:13:12','2026-06-14 15:13:12','2026-06-14 16:13:12',0),(6,1,8,'rejected','2026-06-14 11:13:12',NULL,NULL,0),(7,3,4,'picked_up','2026-06-14 11:13:12','2026-06-14 12:13:12','2026-06-14 13:13:12',0),(8,3,2,'approved','2026-06-14 15:13:12','2026-06-14 16:13:12',NULL,0),(9,3,7,'pending','2026-06-14 17:03:12',NULL,NULL,0),(10,5,6,'picked_up','2026-06-14 10:13:12','2026-06-14 11:13:12','2026-06-14 12:13:12',0),(11,5,5,'picked_up','2026-06-14 10:13:12','2026-06-14 11:13:12','2026-06-14 12:13:12',0),(12,5,4,'no_show','2026-06-14 09:13:12','2026-06-14 10:13:12',NULL,0),(13,10,6,'pending','2026-06-14 17:13:12',NULL,NULL,0),(14,10,8,'approved','2026-06-14 16:13:12','2026-06-14 17:13:12',NULL,0),(15,10,2,'picked_up','2026-06-14 13:13:12','2026-06-14 14:13:12','2026-06-14 15:13:12',0),(16,13,5,'picked_up','2026-06-14 12:13:12','2026-06-14 13:13:12','2026-06-14 14:13:12',0),(17,13,6,'picked_up','2026-06-14 15:13:12','2026-06-14 16:13:12','2026-06-14 16:43:12',0),(18,17,3,'picked_up','2026-06-12 16:13:12','2026-06-12 17:13:12','2026-06-12 17:13:12',0),(19,17,4,'picked_up','2026-06-12 15:13:12','2026-06-12 16:13:12','2026-06-12 16:13:12',0),(20,18,7,'picked_up','2026-06-12 14:13:12','2026-06-12 15:13:12','2026-06-12 15:13:12',0);
/*!40000 ALTER TABLE `requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT '',
  `password_hash` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `first_name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `last_name` varchar(60) COLLATE utf8mb4_unicode_ci NOT NULL,
  `display_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `avatar_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `role` enum('student','admin') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'student',
  `points` int NOT NULL DEFAULT '5',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','admin@unibite.gr','2107722000','$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC','Διαχειριστής','','Διαχειριστής',NULL,'admin',0,'2026-06-14 18:13:12'),(2,'maria','maria@mail.ntua.gr','6941234567','$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC','Μαρία','Παπαδοπούλου','Μαρία Παπαδοπούλου',NULL,'student',14,'2026-06-14 18:13:12'),(3,'giorgos','giorgos@mail.ntua.gr','6957654321','$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC','Γιώργος','Νικολάου','Γιώργος Νικολάου',NULL,'student',9,'2026-06-14 18:13:12'),(4,'eleni','eleni@mail.ntua.gr','6909876543','$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC','Ελένη','Δημητρίου','Ελένη Δημητρίου',NULL,'student',6,'2026-06-14 18:13:12'),(5,'kostas','kostas@upnet.gr','6971112233','$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC','Κώστας','Αγγελόπουλος','Κώστας Αγγελόπουλος',NULL,'student',11,'2026-06-14 18:13:12'),(6,'nikos','nikos@upnet.gr','6982223344','$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC','Νίκος','Παππάς','Νίκος Παππάς',NULL,'student',7,'2026-06-14 18:13:12'),(7,'sofia','sofia@mail.ntua.gr','6933445566','$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC','Σοφία','Ιωάννου','Σοφία Ιωάννου',NULL,'student',8,'2026-06-14 18:13:12'),(8,'dimitris','dimitris@upnet.gr','6944556677','$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC','Δημήτρης','Μακρής','Δημήτρης Μακρής',NULL,'student',5,'2026-06-14 18:13:12'),(9,'androniki','androniki@mail.ntua.gr','6955667788','$2b$10$jucztNPdrdCVStnqlFOaFesVb.KKPjw16.CFCcAxNrQHtYob.u5gC','Ανδρονίκη','Βλάχου','Ανδρονίκη Βλάχου',NULL,'student',6,'2026-06-14 18:13:12');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-14 18:28:23
