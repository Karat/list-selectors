'use strict';

import { isEmpty, isString, reduce, includes as _includes } from 'lodash-es';

// These are the valid `include` option values.
var TOP_LEVEL_INCLUDES = [
  'selectors',
  'simpleSelectors',
  'simple'
];
var SIMPLE_INCLUDES = [
  'classes',
  'ids',
  'attributes',
  'types'
];

/**
 * Filter a full selector list according to specific `include` options.
 *
 * @param {object} selectorList
 * @param {string|object} includes
 * @param {Result} postcssResult - PostCSS Result (to attach warnings to)
 * @return {object} The filtered selectorList
 */
export default function(selectorList, includes, postcssResult) {
  if (isEmpty(includes)) return selectorList;

  if (isString(includes)) includes = [includes];

  return reduce(includes, function(r, incl) {

    if (_includes(TOP_LEVEL_INCLUDES, incl)) {
      if (_includes(['simple', 'simpleSelectors'], incl)) {
        r.simpleSelectors = selectorList.simpleSelectors.all;
      } else {
        r[incl] = selectorList[incl];
      }
      return r;
    }

    if (_includes(SIMPLE_INCLUDES, incl)) {
      r[incl] = selectorList.simpleSelectors[incl];
      return r;
    }

    postcssResult.warn(
      'Invalid include "' + incl + '" passed. ' +
      'The possibilities are: ' +
      TOP_LEVEL_INCLUDES.concat(SIMPLE_INCLUDES).join(', ') + '. ' +
      'You\'ll get the full selector list now.'
    );
    return selectorList;
  }, {});
};
