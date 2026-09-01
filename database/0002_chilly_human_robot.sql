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
--> statement-breakpoint
ALTER TABLE `profiles` ADD `state` varchar(100);--> statement-breakpoint
ALTER TABLE `profiles` ADD `district` varchar(100);--> statement-breakpoint
ALTER TABLE `profiles` ADD `pinCode` varchar(12);--> statement-breakpoint
ALTER TABLE `profiles` ADD `village` varchar(160);--> statement-breakpoint
ALTER TABLE `profiles` ADD `latitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `profiles` ADD `longitude` decimal(10,7);--> statement-breakpoint
ALTER TABLE `profiles` ADD `networkMode` enum('good','poor','offline') DEFAULT 'good' NOT NULL;