// babel-preset-expo сам подключает плагин worklets, когда в проекте стоит
// Reanimated. Файл заведён явно, чтобы конфигурация была видимой, а не
// подразумеваемой.
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
