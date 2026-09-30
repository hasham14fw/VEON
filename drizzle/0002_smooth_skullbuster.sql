CREATE INDEX `audit_entity_at` ON `audit_events` (`entity_id`,`at`);--> statement-breakpoint
CREATE INDEX `audit_at` ON `audit_events` (`at`);--> statement-breakpoint
CREATE INDEX `workspace_kind_updated` ON `workspace_records` (`kind`,`updated`);