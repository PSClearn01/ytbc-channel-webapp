# Development & Code Guidelines

To maintain a clean, readable, and consistent codebase, developers must adhere to the rules outlined in this document.

## Code Quality Tools

The project enforces code quality standards using ESLint and Prettier.

### Formatting (Prettier)
We enforce automatic formatting. Configurations are defined in [prettier.config.js](file:///home/pscadmin/orca-projects/ytbc-channel-webapp/ytbc-channel-webapp/prettier.config.js).
- Tab size: `4` spaces (using real tabs).
- Single quotes: `true`.
- Svelte plugin: `prettier-plugin-svelte`.
- Command to format: `npm run format`.

### Linting (ESLint)
Lint configurations are in [eslint.config.js](file:///home/pscadmin/orca-projects/ytbc-channel-webapp/ytbc-channel-webapp/eslint.config.js). We use flat configs extending:
- ESLint JS Recommended (`js.configs.recommended`)
- TypeScript ESLint (`ts.configs.recommended`)
- Svelte ESLint (`svelte.configs.recommended`)
- Prettier integration to prevent style conflicts
- Command to lint: `npm run lint`.

---

## TypeScript Guidelines

- Avoid using `any` wherever possible. Define explicit interfaces, types, or use generics.
- Define Svelte component props using TypeScript interfaces.
- Keep `src/app.d.ts` updated with custom session data or local parameters (e.g. `App.Locals` if middleware/hooks are added).

---

## Svelte 5 Runes Guide

This project is built using Svelte 5 with runes mode turned on. Do not use legacy Svelte v4 API features (like `export let`, writable store subscriptions via `$store`, or `onMount` for simple reactive effects).

### 1. Declaring Reactive State (`$state`)
Use `$state()` instead of `let` declarations for reactive variables:
```svelte
<script lang="ts">
	let count = $state(0);
</script>

<button onclick={() => count++}>Count: {count}</button>
```

### 2. Declaring Component Props (`$props`)
Component props are passed as a single object destructuring `$props()`:
```svelte
<script lang="ts">
	interface Props {
		title: string;
		status?: 'pending' | 'completed';
	}
	let { title, status = 'pending' }: Props = $props();
</script>

<div>{title} - Status: {status}</div>
```

### 3. Derived Values (`$derived`)
Use `$derived()` for state that depends on other reactive variables:
```svelte
<script lang="ts">
	let count = $state(0);
	let doubled = $derived(count * 2);
</script>
```

### 4. Side Effects (`$effect`)
Use `$effect()` for running code in response to state changes (replaces `$: console.log(count)` and lifecycle-based mounting logic):
```svelte
<script lang="ts">
	let count = $state(0);
	$effect(() => {
		console.log(`The count is now ${count}`);
	});
</script>
```
> [!NOTE]
> Keep `$effect` minimal. Use `$derived` for computing derivations of state, and `$effect` only for mutations outside of Svelte (such as DOM manipulation, analytics logging, or custom event listeners).
