ALTER TABLE `tasks` ADD `owner` varchar(160);--> statement-breakpoint
ALTER TABLE `workspaceNotes` ADD `source` varchar(500);--> statement-breakpoint
ALTER TABLE `workspaceNotes` ADD `context` text;