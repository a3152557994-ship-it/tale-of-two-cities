/**
 * Mini-tool entry (vite.minitool.config.js swaps index.html's /src/main.js for this file).
 * Order matters: runtime fallbacks → compat CSS (must precede style.css) → platform
 * layout probes → the unchanged game module.
 */
import './polyfills.js';
import './compat.css';
import { initPlatform } from './platform.js';
import '../main.js';

initPlatform();
