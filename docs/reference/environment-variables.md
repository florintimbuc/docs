---
sidebar_position: 11
---

# Environment Variables Reference

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/reference/environment-variables.md).
:::

Environment variables that affect Pixel Agents behavior. Short list - the project deliberately uses very few env vars in favor of explicit settings.

## PIXEL_AGENTS_DEBUG

| Default | unset (debug ON) |
|---|---|
| Read by | `server/src/fileWatcher.ts:25`, `server/src/hookEventHandler.ts:11`, `server/src/transcriptParser.ts:1`, `adapters/vscode/extension.ts:16` |

Controls whether the runtime emits verbose `[Pixel Agents] Hook:` style debug log lines.

| Value | Behavior |
|---|---|
| Unset | Debug ON (verbose log lines emitted). |
| `'0'` (string zero) | Debug OFF (verbose lines suppressed). |
| Any other value | Debug ON. |

The condition is literally:

```ts
const debug = process.env.PIXEL_AGENTS_DEBUG !== '0';
```

So setting to `'1'`, `'true'`, `'on'`, etc. has no effect (still ON). The only way to silence is `PIXEL_AGENTS_DEBUG=0`.

### Effect

When ON, the runtime emits log lines for:

- Hook events arriving (`[Pixel Agents] Hook: ...`).
- Buffered hook flushing.
- Session start / clear / resume diagnostics.
- File watcher events.
- Transcript line parsing.

These can be noisy under heavy agent activity. Set to `0` in CI or production-like environments.

### Set in VS Code

In the launch configuration (`.vscode/launch.json` for the Extension Development Host):

```json
{
  "env": {
    "PIXEL_AGENTS_DEBUG": "0"
  }
}
```

Or per-session in a terminal before launching VS Code:

```sh
PIXEL_AGENTS_DEBUG=0 code .
```

The extension's `activate()` logs the value on startup so you can verify (`[Pixel Agents] PIXEL_AGENTS_DEBUG=...`).

### Set for standalone

```sh
PIXEL_AGENTS_DEBUG=0 npx pixel-agents
```

Or export persistently in your shell rc.

## PIXEL_AGENTS_VERSION

| Default | unset (becomes `''`) |
|---|---|
| Read by | `server/src/clientMessageHandler.ts:175` |

Used to populate the `extensionVersion` field in the `SettingsLoaded` message. Read once when the server processes `webviewReady`:

```ts
extensionVersion: process.env.PIXEL_AGENTS_VERSION ?? '',
```

Set by the build system. For VS Code, the bundler injects the version from `package.json`. For standalone, it's the npm package version.

You typically don't set this manually. If unset (e.g. running from source without the build inject), the field is empty string.

The webview uses `extensionVersion` for the "What's new" callout comparison against `lastSeenVersion`.

## Variables that are NOT used

Pixel Agents deliberately does NOT read:

- `PORT` - use `--port` flag instead.
- `HOST` - use `--host` flag instead.
- `NODE_ENV` - no production/development branching.
- `HOME` - resolved via `os.homedir()`.
- `LOG_LEVEL` - use `PIXEL_AGENTS_DEBUG=0` to silence.
- Provider-specific env vars (Anthropic API keys, etc.) - the AI CLI handles its own auth; Pixel Agents doesn't talk to APIs.

If you find code that reads other env vars that aren't documented here, that's a bug or a missed update to this page. File an issue.

## Hook script env

The bundled Claude hook script (`server/src/providers/hook/claude/hooks/claude-hook.ts`) runs in a separate process invoked by Claude. It doesn't read Pixel Agents env vars. It reads:

- `HOME` (via Node `os.homedir()`) to locate `~/.pixel-agents/server.json`.

That's it. The script is intentionally minimal.

## Setting env vars in shell rc

To keep `PIXEL_AGENTS_DEBUG=0` persistent for your account:

**bash / zsh:**

```sh
# ~/.bashrc or ~/.zshrc
export PIXEL_AGENTS_DEBUG=0
```

**fish:**

```sh
# ~/.config/fish/config.fish
set -x PIXEL_AGENTS_DEBUG 0
```

**Windows PowerShell:**

```powershell
# $PROFILE
$env:PIXEL_AGENTS_DEBUG = "0"
```

Restart your shell (or `source` the file) for the change to take effect. VS Code, opened from a shell that has the env set, inherits it.

## Verifying current values

To check what env vars the running extension sees:

In VS Code: open Output → "Pixel Agents". The activation line includes `PIXEL_AGENTS_DEBUG=<value-or-"not set">`.

In standalone: the startup log doesn't include env var dumps. Run with `PIXEL_AGENTS_DEBUG=0` and verify by looking for the suppressed lines (no `[Pixel Agents] Hook:` lines under heavy Claude activity means debug is OFF).

## Future variables

If new env vars are added:

- They should be `PIXEL_AGENTS_*` prefixed for clarity.
- They should have a clear default behavior matching "unset".
- They should be documented on this page.

Don't introduce env vars for behaviors that fit in `config.json` (per-user, persistent) or CLI flags (per-invocation). Reserve env vars for things that need to be set out-of-band (debug toggles, build-time injects).

## Related

- [Config reference](./config) - the file-backed settings system (alternative to env vars for persistent prefs).
- [CLI reference](./cli) - command-line flags (alternative to env vars for per-invocation prefs).
- [VS Code settings](./vscode-settings) - VS Code-native settings (alternative for activation-time prefs in the IDE).
