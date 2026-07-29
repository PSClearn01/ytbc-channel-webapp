import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';

export const boxerRankings = pgTable('boxer_rankings', {
	id: serial('id').primaryKey(),
	sanctioningBody: text('sanctioning_body').notNull(), // 'WBA', 'WBC', 'IBF', 'WBO'
	division: text('division').notNull(),         // e.g. 'Heavyweight', 'Cruiserweight'
	rank: integer('rank').notNull(),              // 0 for Champion, 1-15 for contenders
	boxerName: text('boxer_name').notNull(),
	country: text('country'),
	notes: text('notes'),                         // e.g. 'Interim', 'Super Champion'
	scrapedAt: timestamp('scraped_at').defaultNow().notNull()
});
