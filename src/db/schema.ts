import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const syncRecords = sqliteTable('sync_records', {
  id: integer('id').primaryKey(),
  tableName: text('table_name').notNull(),
  recordId: text('record_id').notNull().unique(),
  status: text('status').notNull(),
	errorMessage: text('error_message'),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),

  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
});
