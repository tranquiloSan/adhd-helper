import type { CapacitorConfig } from '@capacitor/cli';

// The Android app is the same static build, served from the app's own origin
// rather than the GitHub Pages subpath; `npm run build:android` sets the base.
const config: CapacitorConfig = {
	appId: 'io.github.tranquilosan.adhdhelper',
	appName: 'ADHD Helper',
	webDir: 'build'
};

export default config;
