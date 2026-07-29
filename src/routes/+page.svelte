<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { onMount } from 'svelte';

	let { data } = $props();

	// Active Tab / Navigation
	let activeTab = $state('divisions'); // 'divisions' | 'search' | 'stats'
	
	// Filter state
	const divisionOrder = [
		'Heavyweight', 'Bridgerweight', 'Cruiserweight', 'Light Heavyweight',
		'Super Middleweight', 'Middleweight', 'Super Welterweight', 'Welterweight',
		'Super Lightweight', 'Lightweight', 'Super Featherweight', 'Featherweight',
		'Super Bantamweight', 'Bantamweight', 'Super Flyweight', 'Flyweight',
		'Light Flyweight', 'Minimumweight'
	];
	
	let selectedDivision = $state('Heavyweight');
	let searchQuery = $state('');

	// Scraper Trigger state
	let isScraping = $state(false);
	let scrapeLogs = $state<string[]>([]);
	let scrapeError = $state('');

	// Get all available weight divisions from data
	let availableDivisions = $derived.by(() => {
		const unique = new Set(data.rankings.map(r => r.division));
		return divisionOrder.filter(d => unique.has(d));
	});

	// Filter rankings by selected division
	let divisionRankings = $derived.by(() => {
		return data.rankings.filter(r => r.division === selectedDivision);
	});

	// Get champions for each body in selected division
	let champions = $derived.by(() => {
		const bodies = ['WBA', 'WBC', 'IBF', 'WBO'];
		const result: Record<string, any[]> = { WBA: [], WBC: [], IBF: [], WBO: [] };
		
		divisionRankings.forEach(r => {
			if (r.rank === 0 && bodies.includes(r.sanctioningBody)) {
				result[r.sanctioningBody].push(r);
			}
		});
		return result;
	});

	// Get contender grid 1-15
	let contenderGrid = $derived.by(() => {
		const rows = [];
		for (let rank = 1; rank <= 15; rank++) {
			const row: Record<string, any> = { rank };
			['WBA', 'WBC', 'IBF', 'WBO'].forEach(body => {
				row[body] = divisionRankings.find(r => r.sanctioningBody === body && r.rank === rank);
			});
			rows.push(row);
		}
		return rows;
	});

	// Cross ranking helper: Find where else this boxer is ranked in the same division
	function getCrossRankings(boxerName: string, excludeBody: string) {
		if (!boxerName || boxerName.toLowerCase() === 'not rated' || boxerName.toLowerCase() === 'vacant') return [];
		
		const cleanName = boxerName.toLowerCase().replace(/[^a-z0-9]/g, '');
		
		return divisionRankings.filter(r => {
			if (r.sanctioningBody === excludeBody) return false;
			const rClean = r.boxerName.toLowerCase().replace(/[^a-z0-9]/g, '');
			// check if names are highly similar or match
			return rClean === cleanName || rClean.includes(cleanName) || cleanName.includes(rClean);
		});
	}

	// Search results for boxers
	let searchResults = $derived.by(() => {
		if (!searchQuery.trim()) return [];
		const query = searchQuery.toLowerCase().trim();
		
		// Filter rankings matching the query
		const matches = data.rankings.filter(r => 
			r.boxerName.toLowerCase().includes(query)
		);
		
		// Group by boxer name and division to show their overall profile
		const grouped: Record<string, { name: string, division: string, ranks: any[] }> = {};
		
		matches.forEach(m => {
			const key = `${m.boxerName.toLowerCase()}_${m.division.toLowerCase()}`;
			if (!grouped[key]) {
				grouped[key] = {
					name: m.boxerName,
					division: m.division,
					ranks: []
				};
			}
			grouped[key].ranks.push(m);
		});
		
		return Object.values(grouped);
	});

	// Statistics derivations
	let stats = $derived.by(() => {
		const bodies = ['WBA', 'WBC', 'IBF', 'WBO'];
		const totals: Record<string, number> = { WBA: 0, WBC: 0, IBF: 0, WBO: 0 };
		const championsCount: Record<string, number> = { WBA: 0, WBC: 0, IBF: 0, WBO: 0 };
		
		data.rankings.forEach(r => {
			if (bodies.includes(r.sanctioningBody)) {
				totals[r.sanctioningBody]++;
				if (r.rank === 0) championsCount[r.sanctioningBody]++;
			}
		});

		// Find multi-ranked boxers
		const boxerCounts: Record<string, { name: string, division: string, bodies: Set<string> }> = {};
		data.rankings.forEach(r => {
			if (r.rank > 0 && r.boxerName.toLowerCase() !== 'not rated') {
				const key = `${r.boxerName.toLowerCase()}_${r.division.toLowerCase()}`;
				if (!boxerCounts[key]) {
					boxerCounts[key] = {
						name: r.boxerName,
						division: r.division,
						bodies: new Set()
					};
				}
				boxerCounts[key].bodies.add(r.sanctioningBody);
			}
		});

		const multiRanked = Object.values(boxerCounts)
			.filter(b => b.bodies.size > 1)
			.sort((a, b) => b.bodies.size - a.bodies.size);

		return {
			totalRankings: data.rankings.length,
			bodyTotals: totals,
			championsCount,
			multiRanked
		};
	});

	// Trigger scraper via API
	async function handleScrape() {
		if (isScraping) return;
		isScraping = true;
		scrapeLogs = ['Starting scraper... this may take up to 60-90 seconds.'];
		scrapeError = '';
		
		try {
			const res = await fetch('/api/scrape', { method: 'POST' });
			const result = await res.json();
			if (result.success) {
				scrapeLogs = [...scrapeLogs, ...result.logs, 'Scraping successfully completed! Refreshed data.'];
				await invalidateAll(); // Re-run SvelteKit load functions
			} else {
				scrapeError = result.error || 'Unknown error occurred during scraping.';
				scrapeLogs = [...scrapeLogs, 'Scraping failed.'];
			}
		} catch (err: any) {
			scrapeError = err.message || 'Network error occurred.';
			scrapeLogs = [...scrapeLogs, 'Scraping failed.'];
		} finally {
			isScraping = false;
		}
	}
</script>

<svelte:head>
	<title>Ring Compass | Aggregated Boxing World Rankings</title>
	<meta name="description" content="Aggregate and compare fighter rankings from the 4 major professional boxing sanctioning bodies: WBA, WBC, IBF, and WBO across all divisions." />
</svelte:head>

<main class="container">
	<!-- Top Premium Header Banner -->
	<header class="hero-section">
		<div class="hero-bg"></div>
		<div class="badge">PRO BOXING DATA COMPASS</div>
		<h1 class="main-title">RING COMPASS</h1>
		<p class="subtitle">
			Aggregated rankings, champions, and analytical alignments of the 4 major sanctioning organizations.
		</p>
	</header>

	<!-- Quick Metrics and Scrape Actions -->
	<section class="metrics-bar">
		<div class="metric-card">
			<span class="metric-value">{stats.totalRankings}</span>
			<span class="metric-label">Rankings Indexed</span>
		</div>
		<div class="metric-card">
			<span class="metric-value">
				{Object.values(stats.championsCount).reduce((a, b) => a + b, 0)}
			</span>
			<span class="metric-label">Active Titleholders</span>
		</div>
		<div class="metric-card">
			<span class="metric-value">{stats.multiRanked.length}</span>
			<span class="metric-label">Cross-Ranked Contenders</span>
		</div>
		
		<div class="scraper-action-wrapper">
			<button 
				id="trigger-scraper-btn"
				class="btn btn-primary btn-scrape" 
				disabled={isScraping} 
				onclick={handleScrape}
			>
				{#if isScraping}
					<span class="spinner"></span> Scraping Live Data...
				{:else}
					<span class="icon-refresh">↻</span> Scrape & Refresh Data
				{/if}
			</button>
			<span class="update-note">Scrapes live PDFs and AJAX endpoints</span>
		</div>
	</section>

	<!-- Scraping Live Progress Modal/Card -->
	{#if isScraping || scrapeLogs.length > 0 || scrapeError}
		<section class="scrape-status-card">
			<div class="card-header">
				<h3>Scrape Pipeline Progress</h3>
				{#if !isScraping}
					<button class="btn btn-close" onclick={() => { scrapeLogs = []; scrapeError = ''; }}>Dismiss</button>
				{/if}
			</div>
			<div class="console-logs">
				{#each scrapeLogs as log}
					<div class="log-line" class:log-success={log.includes('SUCCESS') || log.includes('completed')} class:log-fail={log.includes('FAILED') || log.includes('failed')}>
						{log}
					</div>
				{/each}
				{#if scrapeError}
					<div class="log-line log-error">Error: {scrapeError}</div>
				{/if}
			</div>
		</section>
	{/if}

	<!-- Navigation Tabs -->
	<nav class="nav-tabs">
		<button class="tab-link" class:active={activeTab === 'divisions'} onclick={() => activeTab = 'divisions'}>
			<span class="tab-icon">🏆</span> Division Comparison
		</button>
		<button class="tab-link" class:active={activeTab === 'search'} onclick={() => activeTab = 'search'}>
			<span class="tab-icon">🔍</span> Fighter Search
		</button>
		<button class="tab-link" class:active={activeTab === 'stats'} onclick={() => activeTab = 'stats'}>
			<span class="tab-icon">📊</span> Multi-Ranked Contenders
		</button>
	</nav>

	<!-- TAB 1: DIVISION VIEW -->
	{#if activeTab === 'divisions'}
		<div class="tab-content">
			<!-- Division Selector Bar -->
			<div class="selector-card">
				<label for="division-select" class="selector-label">Select Weight Division:</label>
				<div class="divisions-horizontal-list">
					{#each availableDivisions as div}
						<button 
							class="division-chip" 
							class:active={selectedDivision === div}
							onclick={() => selectedDivision = div}
						>
							{div}
						</button>
					{/each}
				</div>
			</div>

			<!-- CHAMPIONS CARDS ROW -->
			<section class="champions-grid">
				<div class="grid-title-wrapper">
					<h2>DIVISION TITLEHOLDERS</h2>
					<p class="division-sublabel">{selectedDivision} Champions</p>
				</div>
				<div class="champions-container">
					{#each ['WBA', 'WBC', 'IBF', 'WBO'] as body}
						<div class="champ-card card-{body.toLowerCase()}">
							<div class="card-badge">{body}</div>
							<div class="champ-info">
								{#if champions[body] && champions[body].length > 0}
									{#each champions[body] as champ}
										<h4 class="champ-name">{champ.boxerName}</h4>
										<div class="champ-meta">
											{#if champ.country}
												<span class="country-badge">{champ.country}</span>
											{/if}
											<span class="notes-text">{champ.notes || 'World Champion'}</span>
										</div>
									{/each}
								{:else}
									<h4 class="champ-name name-vacant">VACANT / UNRESOLVED</h4>
									<div class="champ-meta">
										<span class="notes-text">No active champion found</span>
									</div>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</section>

			<!-- CONTENDERS SIDE-BY-SIDE TABLE -->
			<section class="contenders-section">
				<div class="table-header-wrapper">
					<h2>TOP 15 RANKED CONTENDERS</h2>
					<p class="subtitle-desc">Comparison chart of ranked challengers</p>
				</div>
				<div class="table-responsive">
					<table class="comparison-table">
						<thead>
							<tr>
								<th class="rank-col">Rank</th>
								<th class="body-col wba-col">WBA</th>
								<th class="body-col wbc-col">WBC</th>
								<th class="body-col ibf-col">IBF</th>
								<th class="body-col wbo-col">WBO</th>
							</tr>
						</thead>
						<tbody>
							{#each contenderGrid as row}
								<tr>
									<td class="rank-num">{row.rank}</td>
									
									<!-- WBA Column -->
									<td class="boxer-cell">
										{#if row.WBA}
											{@const cross = getCrossRankings(row.WBA.boxerName, 'WBA')}
											<div class="boxer-cell-wrapper">
												<span class="boxer-name">{row.WBA.boxerName}</span>
												<div class="meta-row">
													{#if row.WBA.country}
														<span class="country-code">{row.WBA.country}</span>
													{/if}
													{#if row.WBA.notes}
														<span class="badge-notes">{row.WBA.notes}</span>
													{/if}
												</div>
												<!-- Cross rankings indicator -->
												{#if cross.length > 0}
													<div class="cross-badge-list">
														{#each cross as cr}
															<span class="cross-badge bg-{cr.sanctioningBody.toLowerCase()}">
																{cr.sanctioningBody} #{cr.rank === 0 ? 'C' : cr.rank}
															</span>
														{/each}
													</div>
												{/if}
											</div>
										{:else}
											<span class="not-rated">Not Rated</span>
										{/if}
									</td>
									
									<!-- WBC Column -->
									<td class="boxer-cell">
										{#if row.WBC}
											{@const cross = getCrossRankings(row.WBC.boxerName, 'WBC')}
											<div class="boxer-cell-wrapper">
												<span class="boxer-name">{row.WBC.boxerName}</span>
												<div class="meta-row">
													{#if row.WBC.country}
														<span class="country-code">{row.WBC.country}</span>
													{/if}
													{#if row.WBC.notes}
														<span class="badge-notes">{row.WBC.notes}</span>
													{/if}
												</div>
												<!-- Cross rankings indicator -->
												{#if cross.length > 0}
													<div class="cross-badge-list">
														{#each cross as cr}
															<span class="cross-badge bg-{cr.sanctioningBody.toLowerCase()}">
																{cr.sanctioningBody} #{cr.rank === 0 ? 'C' : cr.rank}
															</span>
														{/each}
													</div>
												{/if}
											</div>
										{:else}
											<span class="not-rated">Not Rated</span>
										{/if}
									</td>
									
									<!-- IBF Column -->
									<td class="boxer-cell">
										{#if row.IBF}
											{@const cross = getCrossRankings(row.IBF.boxerName, 'IBF')}
											<div class="boxer-cell-wrapper">
												<span class="boxer-name">{row.IBF.boxerName}</span>
												<div class="meta-row">
													{#if row.IBF.country}
														<span class="country-code">{row.IBF.country}</span>
													{/if}
													{#if row.IBF.notes}
														<span class="badge-notes">{row.IBF.notes}</span>
													{/if}
												</div>
												<!-- Cross rankings indicator -->
												{#if cross.length > 0}
													<div class="cross-badge-list">
														{#each cross as cr}
															<span class="cross-badge bg-{cr.sanctioningBody.toLowerCase()}">
																{cr.sanctioningBody} #{cr.rank === 0 ? 'C' : cr.rank}
															</span>
														{/each}
													</div>
												{/if}
											</div>
										{:else}
											<span class="not-rated">Not Rated</span>
										{/if}
									</td>
									
									<!-- WBO Column -->
									<td class="boxer-cell">
										{#if row.WBO}
											{@const cross = getCrossRankings(row.WBO.boxerName, 'WBO')}
											<div class="boxer-cell-wrapper">
												<span class="boxer-name">{row.WBO.boxerName}</span>
												<div class="meta-row">
													{#if row.WBO.country}
														<span class="country-code">{row.WBO.country}</span>
													{/if}
													{#if row.WBO.notes}
														<span class="badge-notes">{row.WBO.notes}</span>
													{/if}
												</div>
												<!-- Cross rankings indicator -->
												{#if cross.length > 0}
													<div class="cross-badge-list">
														{#each cross as cr}
															<span class="cross-badge bg-{cr.sanctioningBody.toLowerCase()}">
																{cr.sanctioningBody} #{cr.rank === 0 ? 'C' : cr.rank}
															</span>
														{/each}
													</div>
												{/if}
											</div>
										{:else}
											<span class="not-rated">Not Rated</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</section>
		</div>
	{/if}

	<!-- TAB 2: FIGHTER SEARCH -->
	{#if activeTab === 'search'}
		<div class="tab-content">
			<div class="search-container">
				<h2>SEARCH FIGHTER PROFILES</h2>
				<p class="subtitle-desc">Search across all weight classes and sanctioning body indexes</p>
				<input 
					type="text" 
					class="search-input" 
					placeholder="Type boxer name (e.g. Usyk, Fury, Canelo)..." 
					bind:value={searchQuery}
				/>
			</div>

			<div class="search-results-wrapper">
				{#if searchResults.length > 0}
					<div class="results-grid">
						{#each searchResults as boxer}
							<div class="boxer-profile-card">
								<div class="boxer-card-header">
									<h3>{boxer.name}</h3>
									<span class="profile-division">{boxer.division}</span>
								</div>
								<div class="profile-ranks-list">
									{#each ['WBA', 'WBC', 'IBF', 'WBO'] as body}
										{@const bodyRank = boxer.ranks.find(r => r.sanctioningBody === body)}
										<div class="body-rank-line row-{body.toLowerCase()}">
											<span class="body-label">{body} Rating</span>
											{#if bodyRank}
												{#if bodyRank.rank === 0}
													<span class="rank-value text-gold">CHAMPION ({bodyRank.notes || 'World'})</span>
												{:else}
													<span class="rank-value text-rank"># {bodyRank.rank}</span>
												{/if}
												{#if bodyRank.country}
													<span class="country-small">{bodyRank.country}</span>
												{/if}
											{:else}
												<span class="rank-value text-unrated">Unrated</span>
											{/if}
										</div>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				{:else if searchQuery.trim() !== ''}
					<div class="no-results">
						<p>No boxers found matching "{searchQuery}". Try another spelling.</p>
					</div>
				{:else}
					<div class="no-results">
						<p>Start typing above to search the comparative database...</p>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<!-- TAB 3: STATS / MULTI-RANKED CONTENDERS -->
	{#if activeTab === 'stats'}
		<div class="tab-content">
			<div class="stats-header">
				<h2>CROSS-ORGANIZATIONAL POWER LIST</h2>
				<p class="subtitle-desc">Contenders currently ranked in 2 or more of WBA, WBC, IBF, and WBO</p>
			</div>

			<div class="table-responsive">
				<table class="comparison-table stats-table">
					<thead>
						<tr>
							<th>Fighter Name</th>
							<th>Weight Class</th>
							<th>Bodies Ranked</th>
							<th>Rating Distribution</th>
						</tr>
					</thead>
					<tbody>
						{#each stats.multiRanked as boxer}
							{@const ranks = data.rankings.filter(r => r.boxerName.toLowerCase() === boxer.name.toLowerCase() && r.division === boxer.division)}
							<tr>
								<td class="boxer-name-bold">{boxer.name}</td>
								<td class="division-text">{boxer.division}</td>
								<td class="bodies-count-cell">
									<span class="count-badge count-{boxer.bodies.size}">
										{boxer.bodies.size} Bodies
									</span>
								</td>
								<td class="ratings-distribution-cell">
									<div class="distribution-badges">
										{#each ranks as rankItem}
											<span class="cross-badge bg-{rankItem.sanctioningBody.toLowerCase()}">
												{rankItem.sanctioningBody}: #{rankItem.rank === 0 ? 'C' : rankItem.rank}
											</span>
										{/each}
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</main>

<style>
	/* CSS DESIGN SYSTEM */
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem 1.5rem;
		box-sizing: border-box;
	}

	/* Hero section */
	.hero-section {
		position: relative;
		text-align: center;
		padding: 3.5rem 2rem;
		margin-bottom: 2.5rem;
		border-radius: 16px;
		background: radial-gradient(circle at top right, rgba(229, 9, 20, 0.15), transparent 60%),
		            radial-gradient(circle at bottom left, rgba(212, 175, 55, 0.1), transparent 60%),
		            #121215;
		border: 1px solid rgba(255, 255, 255, 0.05);
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
		overflow: hidden;
	}
	
	.badge {
		display: inline-block;
		padding: 0.35rem 0.8rem;
		font-size: 0.75rem;
		font-weight: 700;
		color: #e50914;
		border: 1px solid rgba(229, 9, 20, 0.3);
		background-color: rgba(229, 9, 20, 0.08);
		border-radius: 50px;
		margin-bottom: 1rem;
		letter-spacing: 0.1em;
	}

	.main-title {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 3.5rem;
		font-weight: 700;
		margin: 0;
		background: linear-gradient(135deg, #ffffff 30%, #a1a1aa 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		letter-spacing: -0.02em;
	}

	.subtitle {
		font-size: 1.125rem;
		color: #a1a1aa;
		max-width: 650px;
		margin: 1rem auto 0 auto;
		line-height: 1.6;
		font-weight: 300;
	}

	/* Metrics Bar */
	.metrics-bar {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1.25rem;
		margin-bottom: 2.5rem;
		align-items: center;
	}

	.metric-card {
		background: rgba(30, 30, 35, 0.4);
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 12px;
		padding: 1.5rem;
		text-align: center;
		display: flex;
		flex-direction: column;
		justify-content: center;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		transition: transform 0.2s ease, border-color 0.2s ease;
	}
	
	.metric-card:hover {
		transform: translateY(-2px);
		border-color: rgba(212, 175, 55, 0.2);
	}

	.metric-value {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 2.25rem;
		font-weight: 700;
		color: #ffffff;
	}

	.metric-label {
		font-size: 0.85rem;
		color: #71717a;
		margin-top: 0.35rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Scraper Button */
	.scraper-action-wrapper {
		display: flex;
		flex-direction: column;
		align-items: center;
		background: linear-gradient(135deg, rgba(229, 9, 20, 0.05), rgba(212, 175, 55, 0.05));
		border: 1px solid rgba(255, 255, 255, 0.06);
		border-radius: 12px;
		padding: 1.25rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	}

	.btn {
		font-family: 'Outfit', sans-serif;
		font-size: 0.95rem;
		font-weight: 600;
		padding: 0.75rem 1.5rem;
		border-radius: 8px;
		border: none;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: all 0.2s ease;
	}

	.btn-primary {
		background: linear-gradient(135deg, #e50914 0%, #aa0710 100%);
		color: #ffffff;
		box-shadow: 0 4px 15px rgba(229, 9, 20, 0.3);
	}

	.btn-primary:hover:not(:disabled) {
		background: linear-gradient(135deg, #f31220 0%, #c40a15 100%);
		box-shadow: 0 6px 20px rgba(229, 9, 20, 0.4);
		transform: translateY(-1px);
	}
	
	.btn-primary:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.update-note {
		font-size: 0.75rem;
		color: #71717a;
		margin-top: 0.5rem;
		font-weight: 300;
	}

	.icon-refresh {
		font-size: 1.1rem;
		font-weight: bold;
	}

	/* Spinner Animation */
	.spinner {
		width: 1rem;
		height: 1rem;
		border: 2px solid rgba(255, 255, 255, 0.2);
		border-radius: 50%;
		border-top-color: #ffffff;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}

	/* Scrape Progress Console */
	.scrape-status-card {
		background: #0f0f12;
		border: 1px solid rgba(229, 9, 20, 0.25);
		border-radius: 12px;
		padding: 1.25rem 1.5rem;
		margin-bottom: 2.5rem;
		box-shadow: 0 6px 24px rgba(229, 9, 20, 0.1);
	}

	.scrape-status-card .card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.scrape-status-card h3 {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 1.15rem;
		margin: 0;
		color: #ffffff;
	}

	.btn-close {
		background: rgba(255, 255, 255, 0.08);
		color: #e4e4e7;
		padding: 0.35rem 0.75rem;
		font-size: 0.75rem;
		border-radius: 4px;
	}

	.btn-close:hover {
		background: rgba(255, 255, 255, 0.15);
	}

	.console-logs {
		background-color: #050507;
		border-radius: 6px;
		border: 1px solid rgba(255, 255, 255, 0.05);
		padding: 1rem;
		font-family: 'Courier New', Courier, monospace;
		font-size: 0.8rem;
		max-height: 180px;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		color: #a1a1aa;
	}

	.log-line {
		border-left: 2px solid #52525b;
		padding-left: 0.5rem;
	}

	.log-success {
		color: #4ade80;
		border-color: #22c55e;
	}

	.log-fail {
		color: #f87171;
		border-color: #ef4444;
	}

	.log-error {
		color: #f87171;
		background-color: rgba(239, 68, 68, 0.05);
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
	}

	/* Nav Tabs */
	.nav-tabs {
		display: flex;
		gap: 0.75rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.08);
		margin-bottom: 2.5rem;
	}

	.tab-link {
		font-family: 'Outfit', sans-serif;
		font-size: 1rem;
		font-weight: 500;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: #71717a;
		padding: 0.75rem 1.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		transition: all 0.2s ease;
	}

	.tab-link:hover {
		color: #e4e4e7;
	}

	.tab-link.active {
		color: #d4af37;
		border-bottom-color: #d4af37;
	}

	.tab-icon {
		font-size: 1.1rem;
	}

	/* Selector Card */
	.selector-card {
		background: #121215;
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 12px;
		padding: 1.25rem 1.5rem;
		margin-bottom: 2rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	}

	.selector-label {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		color: #d4af37;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: 0.75rem;
	}

	.divisions-horizontal-list {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		padding-bottom: 0.5rem;
	}

	.divisions-horizontal-list::-webkit-scrollbar {
		height: 4px;
	}

	.divisions-horizontal-list::-webkit-scrollbar-thumb {
		background: rgba(255, 255, 255, 0.15);
		border-radius: 4px;
	}

	.division-chip {
		font-family: 'Inter', sans-serif;
		font-size: 0.85rem;
		padding: 0.5rem 1rem;
		background-color: rgba(255, 255, 255, 0.03);
		border: 1px solid rgba(255, 255, 255, 0.06);
		color: #a1a1aa;
		border-radius: 30px;
		cursor: pointer;
		white-space: nowrap;
		transition: all 0.2s ease;
	}

	.division-chip:hover {
		background-color: rgba(255, 255, 255, 0.08);
		color: #ffffff;
		border-color: rgba(255, 255, 255, 0.12);
	}

	.division-chip.active {
		background: linear-gradient(135deg, rgba(212, 175, 55, 0.15), rgba(212, 175, 55, 0.05));
		border-color: #d4af37;
		color: #ffffff;
		font-weight: 600;
		box-shadow: 0 2px 10px rgba(212, 175, 55, 0.1);
	}

	/* Champions Grid */
	.champions-grid {
		margin-bottom: 3rem;
	}

	.grid-title-wrapper {
		margin-bottom: 1.25rem;
	}

	.grid-title-wrapper h2 {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 1.35rem;
		font-weight: 700;
		margin: 0;
		color: #ffffff;
		letter-spacing: -0.01em;
	}

	.division-sublabel {
		font-size: 0.85rem;
		color: #71717a;
		margin: 0.25rem 0 0 0;
	}

	.champions-container {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1.25rem;
	}

	.champ-card {
		position: relative;
		background: #121215;
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
		overflow: hidden;
		transition: transform 0.2s ease;
	}

	.champ-card:hover {
		transform: translateY(-2px);
	}

	/* Card badges and colors */
	.card-badge {
		position: absolute;
		top: 1rem;
		right: 1rem;
		font-size: 0.7rem;
		font-weight: 700;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		letter-spacing: 0.05em;
	}

	.card-wba {
		border-top: 3px solid #ffcc00;
	}
	.card-wba .card-badge {
		background-color: rgba(255, 204, 0, 0.1);
		color: #ffcc00;
		border: 1px solid rgba(255, 204, 0, 0.2);
	}

	.card-wbc {
		border-top: 3px solid #00a86b;
	}
	.card-wbc .card-badge {
		background-color: rgba(0, 168, 107, 0.1);
		color: #00a86b;
		border: 1px solid rgba(0, 168, 107, 0.2);
	}

	.card-ibf {
		border-top: 3px solid #e50914;
	}
	.card-ibf .card-badge {
		background-color: rgba(229, 9, 20, 0.1);
		color: #e50914;
		border: 1px solid rgba(229, 9, 20, 0.2);
	}

	.card-wbo {
		border-top: 3px solid #3b82f6;
	}
	.card-wbo .card-badge {
		background-color: rgba(59, 130, 246, 0.1);
		color: #3b82f6;
		border: 1px solid rgba(59, 130, 246, 0.2);
	}

	.champ-info {
		margin-top: 1rem;
	}

	.champ-name {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 1.25rem;
		font-weight: 700;
		margin: 0;
		color: #ffffff;
		line-height: 1.3;
	}

	.champ-name.name-vacant {
		color: #52525b;
		font-weight: 400;
		font-style: italic;
	}

	.champ-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.5rem;
		flex-wrap: wrap;
	}

	.country-badge {
		font-size: 0.7rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 4px;
		padding: 0.15rem 0.35rem;
		color: #d4d4d8;
		font-weight: 600;
	}

	.notes-text {
		font-size: 0.75rem;
		color: #a1a1aa;
		font-weight: 300;
	}

	/* Contenders Section */
	.contenders-section {
		background: #121215;
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	}

	.table-header-wrapper {
		margin-bottom: 1.5rem;
	}

	.table-header-wrapper h2 {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 1.35rem;
		margin: 0;
		color: #ffffff;
	}

	.subtitle-desc {
		font-size: 0.85rem;
		color: #71717a;
		margin: 0.25rem 0 0 0;
	}

	/* Table design */
	.table-responsive {
		width: 100%;
		overflow-x: auto;
	}

	.comparison-table {
		width: 100%;
		border-collapse: collapse;
		text-align: left;
	}

	.comparison-table th {
		font-family: 'Outfit', sans-serif;
		font-size: 0.85rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		padding: 0.85rem 1rem;
		background-color: rgba(255, 255, 255, 0.02);
		border-bottom: 2px solid rgba(255, 255, 255, 0.08);
	}

	.wba-col { color: #ffcc00; }
	.wbc-col { color: #00a86b; }
	.ibf-col { color: #e50914; }
	.wbo-col { color: #3b82f6; }

	.comparison-table td {
		padding: 1rem;
		border-bottom: 1px solid rgba(255, 255, 255, 0.04);
		vertical-align: top;
	}

	.comparison-table tbody tr:hover {
		background-color: rgba(255, 255, 255, 0.01);
	}

	.rank-col {
		width: 60px;
	}

	.rank-num {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 1.15rem;
		font-weight: 700;
		color: #71717a;
		text-align: center;
	}

	.boxer-cell-wrapper {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.boxer-name {
		font-size: 0.95rem;
		font-weight: 600;
		color: #e4e4e7;
	}

	.meta-row {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-wrap: wrap;
	}

	.country-code {
		font-size: 0.7rem;
		color: #a1a1aa;
		background: rgba(255, 255, 255, 0.05);
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		font-weight: 500;
	}

	.badge-notes {
		font-size: 0.65rem;
		color: #d4af37;
		background: rgba(212, 175, 55, 0.08);
		border: 1px solid rgba(212, 175, 55, 0.15);
		padding: 0.05rem 0.25rem;
		border-radius: 3px;
	}

	.not-rated {
		font-size: 0.85rem;
		color: #3f3f46;
		font-style: italic;
	}

	/* Cross Rankings badges */
	.cross-badge-list {
		display: flex;
		gap: 0.25rem;
		margin-top: 0.35rem;
		flex-wrap: wrap;
	}

	.cross-badge {
		font-size: 0.65rem;
		font-weight: 600;
		padding: 0.1rem 0.35rem;
		border-radius: 3px;
		color: #ffffff;
		display: inline-block;
	}

	.bg-wba { background-color: rgba(255, 204, 0, 0.2); border: 1px solid rgba(255, 204, 0, 0.4); color: #ffcc00; }
	.bg-wbc { background-color: rgba(0, 168, 107, 0.2); border: 1px solid rgba(0, 168, 107, 0.4); color: #00a86b; }
	.bg-ibf { background-color: rgba(229, 9, 20, 0.2); border: 1px solid rgba(229, 9, 20, 0.4); color: #f87171; }
	.bg-wbo { background-color: rgba(59, 130, 246, 0.2); border: 1px solid rgba(59, 130, 246, 0.4); color: #60a5fa; }

	/* TAB 2: SEARCH CARD */
	.search-container {
		background: #121215;
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 12px;
		padding: 2rem;
		margin-bottom: 2rem;
		text-align: center;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
	}

	.search-container h2 {
		font-family: 'Space Grotesk', sans-serif;
		margin: 0 0 0.5rem 0;
		color: #ffffff;
	}

	.search-input {
		width: 100%;
		max-width: 500px;
		background-color: #0b0b0d;
		border: 1px solid rgba(255, 255, 255, 0.1);
		border-radius: 30px;
		color: #ffffff;
		font-size: 1rem;
		padding: 0.85rem 1.5rem;
		outline: none;
		margin-top: 1rem;
		box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.5);
		transition: border-color 0.2s ease, box-shadow 0.2s ease;
	}

	.search-input:focus {
		border-color: #d4af37;
		box-shadow: 0 0 0 2px rgba(212, 175, 55, 0.15), inset 0 2px 4px rgba(0, 0, 0, 0.5);
	}

	.search-results-wrapper {
		margin-top: 1.5rem;
	}

	.results-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		gap: 1.25rem;
	}

	.boxer-profile-card {
		background: #121215;
		border: 1px solid rgba(255, 255, 255, 0.04);
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
		transition: transform 0.2s ease;
	}

	.boxer-profile-card:hover {
		transform: translateY(-2px);
	}

	.boxer-card-header {
		border-bottom: 1px solid rgba(255, 255, 255, 0.06);
		padding-bottom: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.boxer-card-header h3 {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 1.15rem;
		margin: 0;
		color: #ffffff;
	}

	.profile-division {
		font-size: 0.75rem;
		color: #d4af37;
		font-weight: 500;
		margin-top: 0.25rem;
		display: block;
	}

	.profile-ranks-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.body-rank-line {
		display: flex;
		justify-content: space-between;
		font-size: 0.85rem;
		padding: 0.35rem 0.5rem;
		border-radius: 4px;
		background: rgba(255, 255, 255, 0.01);
	}

	.row-wba { border-left: 2px solid #ffcc00; }
	.row-wbc { border-left: 2px solid #00a86b; }
	.row-ibf { border-left: 2px solid #e50914; }
	.row-wbo { border-left: 2px solid #3b82f6; }

	.body-label {
		color: #a1a1aa;
	}

	.rank-value {
		font-weight: 600;
	}

	.text-gold {
		color: #ffcc00;
	}

	.text-rank {
		color: #e4e4e7;
	}

	.text-unrated {
		color: #52525b;
		font-style: italic;
	}

	.country-small {
		font-size: 0.65rem;
		background: rgba(255, 255, 255, 0.08);
		border-radius: 3px;
		padding: 0.05rem 0.25rem;
		color: #d4d4d8;
		margin-left: 0.35rem;
		font-weight: 500;
	}

	.no-results {
		text-align: center;
		padding: 3rem;
		color: #71717a;
		font-style: italic;
	}

	/* TAB 3: STATS VIEW */
	.stats-header {
		margin-bottom: 2rem;
	}

	.stats-header h2 {
		font-family: 'Space Grotesk', sans-serif;
		font-size: 1.5rem;
		margin: 0;
		color: #ffffff;
	}

	.stats-table th {
		padding: 1rem;
	}

	.boxer-name-bold {
		font-weight: 700;
		color: #ffffff;
	}

	.division-text {
		color: #d4d4d8;
		font-size: 0.9rem;
	}

	.bodies-count-cell {
		width: 120px;
	}

	.count-badge {
		font-size: 0.8rem;
		font-weight: 600;
		padding: 0.25rem 0.6rem;
		border-radius: 4px;
		color: #ffffff;
	}

	.count-2 { background-color: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); }
	.count-3 { background: linear-gradient(135deg, rgba(212, 175, 55, 0.2), rgba(212, 175, 55, 0.1)); border: 1px solid rgba(212, 175, 55, 0.4); color: #d4af37; }
	.count-4 { background: linear-gradient(135deg, rgba(229, 9, 20, 0.25), rgba(212, 175, 55, 0.25)); border: 1px solid #e50914; color: #ff3333; animation: pulse 2s infinite; }

	@keyframes pulse {
		0% { box-shadow: 0 0 0 0 rgba(229, 9, 20, 0.4); }
		70% { box-shadow: 0 0 0 6px rgba(229, 9, 20, 0); }
		100% { box-shadow: 0 0 0 0 rgba(229, 9, 20, 0); }
	}

	.ratings-distribution-cell {
		vertical-align: middle;
	}

	.distribution-badges {
		display: flex;
		gap: 0.35rem;
		flex-wrap: wrap;
	}
</style>
