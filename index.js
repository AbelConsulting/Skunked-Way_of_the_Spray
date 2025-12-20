#!/usr/bin/env node
// Shim entrypoint for platforms that expect /app/index.js
// Delegates to the existing local dev server in tools/csp_server.js
require('./tools/csp_server.js');
