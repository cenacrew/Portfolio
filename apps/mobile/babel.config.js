// babel-preset-expo (SDK 57) auto-configures the react-native-worklets /
// reanimated plugin when those packages are present, so no extra plugin entry
// is needed here.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
