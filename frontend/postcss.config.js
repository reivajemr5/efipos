export default {
  plugins: {
    'postcss-preset-env': {
      browsers: 'Chrome 109',
      stage: 0,
      features: {
        'oklab-function': true,
        'color-function': true,
        'custom-properties': false,
        'custom-media-queries': false,
        'media-query-ranges': false,
      },
    },
  },
}
