'use strict';

import standalone from './lib/standalone.js';
import plugin from './lib/plugin.js';

standalone.plugin = plugin;

export default standalone;
