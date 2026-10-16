# Published source provenance

The MCP source baseline was imported from the published `findskills-mcp@0.1.25`
registry tarball, then repaired for package self-containment and startup auth.
Registry `dist.integrity`: `sha512-PWJMRnw0cLJBNTHPLRPtTYKZYMXPizPhWKceqmBcBeQkFdVAkz1IQQYtS61Rp0NPQsISByI5O60C2WCLlFbRZQ==`.

The MIT-licensed authentication error and CLI config helper behavior was
restored from `findskills@0.2.5`. Registry `dist.integrity`:
`sha512-WqyKtMPa4eFlB1Z+z6l1X8Srq0XFQRM20RcFbbq+96WY1z+SjKXVWw5/fU7LNmNJIhNDIluHrIXkvprDL01E5g==`.

The MCP config helper is read-only and accepts only string `api_key` values
beginning with `fs-key-`. Its API key is loaded once during server startup and
used for both the non-blocking auth self-check and MCP API requests.
