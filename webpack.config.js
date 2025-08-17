const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

/**
 * Webpack configuration with function source preservation options
 * 
 * To preserve function source for extraction/inspection:
 * - Run with: webpack --env preserveFunctions
 * - This disables minification and aggressive optimizations
 * - Preserves function names and source code
 * - Enables source maps for better debugging
 */

module.exports = (env, argv) => {
  const isProduction = argv.mode === 'production';
  
  return {
    entry: './src/index.js',
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: isProduction ? 'frontable.min.js' : 'frontable.js',
      library: 'Frontable',
      libraryTarget: 'umd',
      globalObject: 'this',
      clean: true
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                ['@babel/preset-env', {
                  // Preserve function names and source for extraction
                  debug: false,
                  loose: false, // Use strict mode transformations
                  targets: {
                    // More specific targets to reduce aggressive transformations
                    browsers: ['> 1%', 'last 2 versions']
                  }
                }]
              ],
              // Don't transform function expressions that might lose source
              compact: false,
              minified: false,
              comments: true // Preserve comments that might help with function extraction
            }
          }
        },
        {
          test: /\.css$/,
          use: [
            isProduction ? MiniCssExtractPlugin.loader : 'style-loader',
            'css-loader'
          ]
        }
      ]
    },
    plugins: [
      ...(isProduction ? [
        new MiniCssExtractPlugin({
          filename: 'frontable.css'
        })
      ] : []),
      new HtmlWebpackPlugin({
        template: './src/demo.html',
        filename: 'demo.html'
      })
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, 'dist'),
      },
      compress: true,
      port: 3001,
      open: true
    },
    optimization: {
      minimize: env && env.preserveFunctions ? false : isProduction, // Allow disabling minification for function extraction
      usedExports: false, // Prevent tree shaking that might affect function extraction
      mangleExports: false, // Preserve export names
      // Custom minifier options when minification is enabled
      minimizer: isProduction ? [
        new (require('terser-webpack-plugin'))({
          terserOptions: {
            // Preserve function names for extraction
            keep_fnames: true,
            keep_classnames: true,
            mangle: {
              // Don't mangle function and class names
              keep_fnames: true,
              keep_classnames: true
            },
            compress: {
              // Reduce aggressive optimizations that might break function extraction
              drop_console: false,
              drop_debugger: false,
              keep_fnames: true,
              keep_infinity: true
            }
          }
        })
      ] : []
    },
    devtool: isProduction ? 'source-map' : 'eval-source-map', // Enable source maps for function source extraction
  };
};