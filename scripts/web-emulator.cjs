// Demo identifiers only. This launcher cannot target a production Firebase project.
const { spawn } = require('node:child_process');
const child = spawn(process.platform === 'win32' ? 'npx.cmd' : 'npx', ['expo', 'start', '--web', '--port', '8081'], {
  stdio: 'inherit',
  env: { ...process.env, EXPO_NO_DOTENV: '1', EXPO_PUBLIC_FIREBASE_API_KEY: 'demo-api-key', EXPO_PUBLIC_FIREBASE_PROJECT_ID: 'demo-narnigrams', EXPO_PUBLIC_FIREBASE_APP_ID: 'narnigrams-web', EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: 'narnigrams.firebaseapp.com', EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: '127.0.0.1', EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION: 'australia-southeast1' },
});
child.on('exit', code => { process.exitCode = code ?? 1; });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
