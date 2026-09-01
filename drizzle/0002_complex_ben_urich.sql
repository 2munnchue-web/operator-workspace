CREATE TABLE `exerciseScenarios` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exerciseId` int NOT NULL,
	`title` varchar(200) NOT NULL,
	`phase` enum('plan','rehearse','execute','review') NOT NULL DEFAULT 'plan',
	`status` enum('draft','ready','live','complete') NOT NULL DEFAULT 'draft',
	`redObjective` text,
	`blueObjective` text,
	`successCriteria` text,
	`safetyNotes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exerciseScenarios_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exerciseTeams` (
	`id` int AUTO_INCREMENT NOT NULL,
	`exerciseId` int NOT NULL,
	`team` enum('red','blue','white') NOT NULL,
	`name` varchar(120) NOT NULL,
	`lead` varchar(160),
	`objective` text,
	`roster` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exerciseTeams_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(200) NOT NULL,
	`codename` varchar(80) NOT NULL,
	`status` enum('planning','rehearsal','live','review','complete') NOT NULL DEFAULT 'planning',
	`startDate` varchar(32),
	`endDate` varchar(32),
	`objective` text,
	`authorizationStatus` enum('draft','approved','expired') NOT NULL DEFAULT 'draft',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `exercises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `exerciseScenarios` ADD CONSTRAINT `exerciseScenarios_exerciseId_exercises_id_fk` FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exerciseTeams` ADD CONSTRAINT `exerciseTeams_exerciseId_exercises_id_fk` FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `exercises` ADD CONSTRAINT `exercises_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE no action ON UPDATE no action;