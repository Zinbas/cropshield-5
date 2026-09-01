CREATE TABLE `cases` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`scanId` int NOT NULL,
	`reference` varchar(32) NOT NULL,
	`status` enum('open','reviewing','resolved') NOT NULL DEFAULT 'open',
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `cases_id` PRIMARY KEY(`id`),
	CONSTRAINT `cases_scanId_unique` UNIQUE(`scanId`),
	CONSTRAINT `cases_reference_unique` UNIQUE(`reference`)
);
--> statement-breakpoint
CREATE TABLE `crops` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(160) NOT NULL,
	`cropType` varchar(80) NOT NULL,
	`region` varchar(160),
	`acreage` decimal(10,2),
	`status` enum('healthy','monitoring','at_risk') NOT NULL DEFAULT 'healthy',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `crops_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `drugStores` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`ownerContact` varchar(160),
	`phone` varchar(40),
	`email` varchar(320),
	`address` text NOT NULL,
	`state` varchar(100),
	`district` varchar(100),
	`pinCode` varchar(12),
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`licenseInfo` text,
	`supportingDocumentUrl` varchar(1000),
	`categories` text,
	`openingHours` varchar(160),
	`status` enum('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `drugStores_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `experts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(160) NOT NULL,
	`profilePhotoUrl` varchar(1000),
	`phone` varchar(40),
	`email` varchar(320),
	`qualification` varchar(240),
	`specialization` varchar(240),
	`organization` varchar(240),
	`experienceYears` int,
	`state` varchar(100),
	`district` varchar(100),
	`pinCode` varchar(12),
	`address` text,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`availability` varchar(160),
	`status` enum('pending','verified','rejected','suspended') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `experts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`region` varchar(160),
	`phone` varchar(40),
	`notificationPreference` enum('all','high_risk','none') NOT NULL DEFAULT 'high_risk',
	`state` varchar(100),
	`district` varchar(100),
	`pinCode` varchar(12),
	`village` varchar(160),
	`primaryCrop` varchar(120),
	`farmingExperienceYears` int,
	`latitude` decimal(10,7),
	`longitude` decimal(10,7),
	`networkMode` enum('good','poor','offline') NOT NULL DEFAULT 'good',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `scans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`cropId` int,
	`imageKey` varchar(500) NOT NULL,
	`imageUrl` varchar(1000) NOT NULL,
	`status` enum('queued','analyzing','complete','failed') NOT NULL DEFAULT 'queued',
	`riskLevel` enum('low','medium','high','critical','unknown') NOT NULL DEFAULT 'unknown',
	`confidence` decimal(5,2),
	`disease` varchar(180),
	`soilType` varchar(120),
	`soilPh` decimal(4,2),
	`soilMoisture` varchar(80),
	`cropCount` int,
	`landArea` decimal(10,2),
	`landUnit` varchar(24),
	`fieldNotes` text,
	`recommendationProgress` text,
	`symptoms` text,
	`assessment` text,
	`recommendations` text,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`passwordHash` varchar(255),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`accountStatus` enum('active','disabled') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
--> statement-breakpoint
CREATE TABLE `weatherCache` (
	`id` int AUTO_INCREMENT NOT NULL,
	`state` varchar(100),
	`district` varchar(100),
	`latitude` decimal(10,7) NOT NULL,
	`longitude` decimal(10,7) NOT NULL,
	`payload` text NOT NULL,
	`fetchedAt` timestamp NOT NULL DEFAULT (now()),
	`expiresAt` timestamp NOT NULL,
	CONSTRAINT `weatherCache_id` PRIMARY KEY(`id`)
);
