# Third-party notices

## GNU LibreDWG / @mlightcad/libredwg-web 0.9.4

- License: GPL-3.0 (see LICENSE).
- Authors: GNU LibreDWG contributors and MLight Lee / MLightCAD contributors.
- Exact upstream tag: https://github.com/mlightcad/libredwg-web/tree/v0.9.4
- Source commit: `15feb51bd853d99892cbe18be842e29a06b404ce`
- Complete corresponding source: https://github.com/mlightcad/libredwg-web/archive/refs/tags/v0.9.4.tar.gz
- Build instructions: upstream `bindings/javascript/README.md` and scripts in `bindings/javascript/package.json`.
- npm package: https://www.npmjs.com/package/@mlightcad/libredwg-web/v/0.9.4
- Vendored `vendor/libredwg-web.js` is unmodified from that npm version.
- WASM is fetched at runtime from the pinned version on jsDelivr, with unpkg fallback. The fetched bytes are checked before compilation.

SHA-256:

```
libredwg-web.js   f54e7deb951c5a9fa4494152bc68318674404d8c9c4c4a5b0be361c5b046d79d
libredwg-web.wasm f77e9aa5590390100bb72ee65ef2f4483b98ad6798c49dab69897f7282e02505
```

Application extraction code is derived from the private Windows prototype, with a JavaScript port and a narrowly scoped ItemId APPID decoding workaround for the v0.9.4 binding. No dependency source or WebAssembly binary is modified. No user drawings or survey CSVs are distributed here.
