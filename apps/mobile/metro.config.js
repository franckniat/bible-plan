const { getDefaultConfig } = require("expo/metro-config")

const config = getDefaultConfig(__dirname)

// Drizzle bundles its migrations as .sql files (inlined by Babel).
config.resolver.sourceExts.push("sql")

// The browser preview runs SQLite with sql.js, a WebAssembly file.
config.resolver.assetExts.push("wasm")

module.exports = config
