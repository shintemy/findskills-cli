# Testing the MCP package

Run `npm install`, then `npm test` from `mcp/` to run the API, server, and
packaging tests. The packaging test requires npm registry access to install
the packed artifact and its dependencies in a temporary directory.

`npm run test:package` packs the current source, installs the tarball outside
the checkout, and connects to its declared CLI entry point using an MCP client.
It verifies initialization, tool discovery, and a search through a mocked fetch
fixture. Each server process uses a temporary HOME with a fake API key; startup
self-check and tool requests are intercepted, and both must send the same bearer
token. Server startup errors are included in failures.
The temporary installation is removed after the test.

`npm publish` runs this check through `prepublishOnly`. Packing inside the test
uses `--ignore-scripts` to avoid recursively invoking lifecycle checks.

To check an already published artifact on Linux/macOS:

```sh
FINDSKILLS_PACKAGE_SPEC=findskills-mcp@0.1.25 npm run test:package
```

The published 0.1.25 artifact fails because `api.js` imports `lib/auth-error.js`,
which is absent from its tarball. This checkout restores the helper and includes
`lib/` in its package contents. See `UPSTREAM.md` for source provenance.
