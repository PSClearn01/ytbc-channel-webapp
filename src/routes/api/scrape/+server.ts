import { json } from '@sveltejs/kit';
import { runScraper } from '$lib/server/scraper';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
	try {
		const logs = await runScraper();
		return json({ success: true, logs });
	} catch (err: any) {
		console.error('[Scrape API Error]:', err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
};

export const POST: RequestHandler = async () => {
	try {
		const logs = await runScraper();
		return json({ success: true, logs });
	} catch (err: any) {
		console.error('[Scrape API Error]:', err);
		return json({ success: false, error: err.message }, { status: 500 });
	}
};
