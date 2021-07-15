import App from './App.svelte';

const app = new App({
	target: document.body,
	props: {
		participants: ['Elizabeth', 'Cadence', 'Mariana']
	}
});

export default app;