// next.config.js
const path = require('path');

module.exports = {
  images: {
    domains: ['metaschool.so'], // Allow images from this domain
  },
  webpack: (config, { isServer }) => {
    // Adjust Webpack's caching settings to avoid the large serialized string issue
    if (!isServer) {
      config.cache = {
        type: 'filesystem',
        version: '1.0', // Optional, helps to control cache invalidation
        cacheDirectory: path.resolve('.next/cache/webpack'),
        compression: 'brotli', // Optional, compression can reduce cache size but may add a slight overhead
        // Other options can be customized here
      };
    }
    return config;
  },
};
