module.exports = function (api) {
  api.cache(true)
  return {
    presets: ["babel-preset-expo"],
    // Drizzle's migrations are .sql files bundled as strings.
    plugins: [["inline-import", { extensions: [".sql"] }]],
  }
}
