module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ["module:react-native-dotenv", {
        "envName": "APP_ENV",
        "moduleName": "@env",
        "path": ".env",
        "blocklist": null,
        "allowlist": null,
        "safe": false,
        "allowUndefined": true,
        "verbose": false
      }],
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': '.',
          },
        },
      ],
    ]
  };
}; 
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo']
  };
};