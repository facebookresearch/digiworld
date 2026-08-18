-- Copyright (c) Meta Platforms, Inc. and affiliates.
CREATE TABLE `emails` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender` text NOT NULL,
	`receiver` text NOT NULL,
	`subject` text,
	`preview` text,
	`body` text,
	`timestamp` text DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') NOT NULL,
	`unread` integer DEFAULT 1 NOT NULL,
	`read` integer DEFAULT 0 NOT NULL,
	`status` text,
	`attachments` text,
	`labels` text,
	`is_draft` integer DEFAULT 0 NOT NULL,
	`threadId` text,
	`folder` text,
	`priority` text,
	`cc` text,
	`bcc` text
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`firstName` text NOT NULL,
	`lastName` text NOT NULL,
	`displayName` text,
	`avatar` text,
	`phoneNumber` text,
	`dateOfBirth` text,
	`role` text,
	`created_at` text DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') NOT NULL,
	`settings` text NOT NULL,
	`email_settings` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);