'use strict';

// import { plugin } from 'postcss';
import selectorParser from 'postcss-selector-parser';
import { isFunction, noop, isEmpty, chain, includes, forOwn } from 'lodash-es';
import selectorSort from './selectorSort.js';
import processIncludes from './processIncludes.js';

/**
 * The postcss plugin at the heart of everything.
 *
 * @param {object|function} [options] - If this is a function it's interpreted as the callback
 * @param {function} [callback] - Callback, which will receive the list of selectors as its argument
 */

export default (options = {}, callback) => {
  let opts, cb;
  if (isFunction(options)) {
    opts = {};
    cb = options;
  } else {
    opts = options || {};
    cb = callback || noop;
  }

  return {
    postcssPlugin: 'list-selectors',
    Once (cssRoot, { result }) {
      let selectorObj = {};

      // Run through all the rules and accumulate a list of selectors parsed out by PostCSS
      const accumulatedSelectors = [];

      cssRoot.walkRules((rule) => {
        // Ignore keyframes, which can log e.g. 10%, 20% as selectors
        if (rule.parent.type === 'atrule' && /keyframes/.test(rule.parent.name)) return;

        rule.selectors.forEach((selector) => {
          accumulatedSelectors.push(selector);
        });
      });

      // If no selectors were found, results are an empty object
      if (isEmpty(accumulatedSelectors)) {
        result.warn(
          'Failed to find any selectors at all in the source files you provided. ' +
          'You are going to get an empty selector list.'
        );
        cb({});
        return;
      }

      // Add sorted, unique selectors to results
      const sortedUniqueSelectors = chain(accumulatedSelectors)
        .uniq()
        .sortBy(selectorSort)
        .value();

      selectorObj.selectors = sortedUniqueSelectors;

      selectorObj.simpleSelectors = {
        all: [],
        ids: [],
        classes: [],
        attributes: [],
        types: []
      };

      const sortNode = (node) => {
        // Various nodes the selector-parser loops through should be ignored
        if (includes(['selector', 'comment', 'combinator', 'pseudo'], node.type)) return;

        // Arguments of `:nth-*` pseudo-classes should be ignored, as they are integers, an+b expressions, or "odd" and "even"
        if (node.parent.parent.value && node.parent.parent.value.substr(0, 5) === ':nth-') return;

        selectorObj.simpleSelectors.all.push(node.toString());
        switch (node.type) {
          case 'id':
            selectorObj.simpleSelectors.ids.push(node.toString());
            break;
          case 'class':
            selectorObj.simpleSelectors.classes.push(node.toString());
            break;
          case 'attribute':
            selectorObj.simpleSelectors.attributes.push(node.toString());
            break;
          case 'tag':
            selectorObj.simpleSelectors.types.push(node.toString());
            break;
          default:
        }
      }

      // Add sorted, unique *simple* selectors to results
      sortedUniqueSelectors.forEach((uniqueSelector) => {
        selectorParser((root) => {
          root.each((selector) => {
            selector.walk((node) => {
              sortNode(node);
            });
          });
        }).process(uniqueSelector);
      });

      forOwn(selectorObj.simpleSelectors, (selectorList, key) => {
        selectorObj.simpleSelectors[key] = chain(selectorList)
          .flatten()
          .uniq()
          .sortBy(selectorSort)
          .value();
      });

      // // Refine the results according to any `include` options passed
      selectorObj = processIncludes(selectorObj, opts.include, result);

      // Call the callback as promised, passing the selectorObj as an argument
      cb(selectorObj);
    }
  };
};

export const postcss = true;

// module.exports.postcss = true;