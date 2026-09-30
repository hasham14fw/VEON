import { sqliteTable,text,index } from 'drizzle-orm/sqlite-core';
export const situations=sqliteTable('situations',{id:text('id').primaryKey(),data:text('data').notNull(),updated:text('updated').notNull()});
export const workspaceRecords=sqliteTable('workspace_records',{id:text('id').primaryKey(),kind:text('kind').notNull(),data:text('data').notNull(),updated:text('updated').notNull()},t=>[index('workspace_kind_updated').on(t.kind,t.updated)]);
export const auditEvents=sqliteTable('audit_events',{id:text('id').primaryKey(),kind:text('kind').notNull(),entityId:text('entity_id').notNull(),actor:text('actor').notNull(),at:text('at').notNull(),data:text('data').notNull()},t=>[index('audit_entity_at').on(t.entityId,t.at),index('audit_at').on(t.at)]);
