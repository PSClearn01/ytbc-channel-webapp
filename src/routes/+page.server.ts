import { db } from '$lib/server/db';
import { boxerRankings } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	try {
		const allRankings = await db.select().from(boxerRankings);
		return {
			rankings: allRankings
		};
	} catch (err) {
		console.error('Error loading rankings from database:', err);
		return {
			rankings: []
		};
	}
};
