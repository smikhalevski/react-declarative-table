var webpack = require('webpack');

var HtmlWebpackPlugin = require('html-webpack-plugin'),
    ExtractTextPlugin = require('extract-text-webpack-plugin');

module.exports = {
  entry: {
    index: './demo/index.js'
  },
  output: {
    path: './target/demo',
    filename: '[name].js'
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './demo/index.html',
      minify: {collapseWhitespace: true}
    }),
    new ExtractTextPlugin('[name].css')
  ],
  module: {
    loaders: [
      {test: /\.js$/, loader: 'babel'},
      {test: /\.less$/, loader: ExtractTextPlugin.extract('style', 'css!less?strictUnits=true&strictMath=true')},
      {test: /\.(png|jpg)$/, loader: 'file-loader?name=[name].[ext]'}
    ]
  }
};
