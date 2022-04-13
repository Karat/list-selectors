'use strict';

import { readFileSync } from 'fs';
import { isFunction, noop, startsWith, isArray } from 'lodash-es';
import postcss from 'postcss';
import request from 'request';
import chalk from 'chalk';
import { globby } from 'globby';
import reporter from 'postcss-reporter';
import plugin from './plugin.js';

/**
 * When using listSelectors as a standalone function or via CLI, we'll need
 * to get the source files before processing. They might be local,
 * identified with globs, or remote, identified with a URL.
 * Get the source files, accumulate them into a string, then
 * run that string through postcss with listSelectors.plugin.
 *
 * @param {string|string[]} source - A glob (or globs) or a URL
 * @param {object|function} [options] - If this is a function, it will be interpreted
 *   as the callback
 * @param {function} [callback] - A callback that will receive the result list of selectors
 *   as an argument
 */
export default function(source, options, callback) {
  var opts, cb;
  if (isFunction(options)) {
    opts = {};
    cb = options;
  } else {
    opts = options || {};
    cb = callback || noop;
  }

  var fullCss = '';

  if (startsWith(source, 'http')) {
    processRemoteCss();
  } else {
    processLocalCss();
  }

  function processRemoteCss() {
    var url = (isArray(source)) ? source[0] : source;


    request(url, function(err, resp, body) {
      if (err) throw err;
      if (resp.statusCode !== 200) {
        console.log(
          chalk.red('Failed to fetch ') + chalk.yellow.underline(url) +
          chalk.red('. Maybe you flubbed the url?')
        );
        body = '';
      }
      postcss()
        .use(plugin(opts, cb))
        .use(reporter({ plugins: ['list-selectors'] }))
        .process(body)
        .then(noop, function(errB) {
          console.error(errB.stack);
        });
    });
  }

  async function processLocalCss() {
    const filePaths = await globby(source);

    if (!filePaths.length) {
      console.log(
        chalk.red('Failed to find any files matching your glob ') +
        chalk.yellow.underline(source)
      );
    }

    filePaths.forEach(function(filePath) {
      fullCss += readFileSync(filePath, { encoding: 'utf8' });
    });

    postcss()
      .use(plugin(opts, cb))
      .use(reporter({ plugins: ['list-selectors'] }))
      .process(fullCss)
      .then(noop, function(errB) {
        console.error(errB.stack);
      });
  }
};
