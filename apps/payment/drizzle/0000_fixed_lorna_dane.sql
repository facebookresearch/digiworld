CREATE TABLE `contacts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`contact_user_id` integer NOT NULL,
	`nickname` text,
	`favorite` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') NOT NULL,
	`updated_at` text DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') NOT NULL
);
--> statement-breakpoint
CREATE TABLE `transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`sender_wallet_id` integer NOT NULL,
	`receiver_wallet_id` integer NOT NULL,
	`amount` real NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`type` text NOT NULL,
	`pin_verified` integer DEFAULT 0 NOT NULL,
	`pin_verified_at` text,
	`reference` text,
	`description` text,
	`created_at` text DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') NOT NULL,
	`updated_at` text DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') NOT NULL,
	FOREIGN KEY (`sender_wallet_id`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiver_wallet_id`) REFERENCES `wallets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`email` text NOT NULL,
	`password` text NOT NULL,
	`pin` text NOT NULL,
	`pin_attempts` integer DEFAULT 0 NOT NULL,
	`pin_locked_until` text,
	`firstName` text NOT NULL,
	`lastName` text NOT NULL,
	`phoneNumber` text NOT NULL,
	`created_at` text DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') NOT NULL,
	`updated_at` text DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') NOT NULL,
	`settings` text DEFAULT '{}' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`kyc_verified` integer DEFAULT 0 NOT NULL,
	`daily_limit` real DEFAULT 1000 NOT NULL,
	`monthly_limit` real DEFAULT 20000 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_phoneNumber_unique` ON `users` (`phoneNumber`);--> statement-breakpoint
CREATE TABLE `wallets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`balance` real DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`type` text DEFAULT 'personal' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') NOT NULL,
	`updated_at` text DEFAULT strftime('%Y-%m-%dT%H:%M:%fZ', 'now') NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
