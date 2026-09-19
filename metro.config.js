const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.resolver.assetExts.push("txt");

// Expo's development virtual env module also reads .env files through
// require.context. Honor the emulator launcher's opt-out there as well.
if (process.env.EXPO_NO_DOTENV === "1") {
  const existing = config.resolver.blockList;
  config.resolver.blockList = [
    ...(Array.isArray(existing) ? existing : existing ? [existing] : []),
    /\/\.env(?:\.[^/]*)?$/,
  ];
}

module.exports = config;
