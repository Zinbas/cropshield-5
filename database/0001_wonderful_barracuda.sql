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
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`displayName` varchar(160) NOT NULL,
	`region` varchar(160),
	`phone` varchar(40),
	`notificationPreference` enum('all','high_risk','none') NOT NULL DEFAULT 'high_risk',
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
	`riskLevel` enum('low','medium','high','unknown') NOT NULL DEFAULT 'unknown',
	`confidence` decimal(5,2),
	`symptoms` text,
	`assessment` text,
	`recommendations` text,
	`approvedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `scans_id` PRIMARY KEY(`id`)
);
