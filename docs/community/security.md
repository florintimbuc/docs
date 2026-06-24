---
sidebar_position: 4
---

# Security Policy

For security vulnerabilities, follow the process in the repo's [SECURITY.md](https://github.com/pixel-agents-hq/pixel-agents/blob/main/SECURITY.md). This page summarizes for the docs site.

## TL;DR

- **Don't file public issues for security bugs.** Use [GitHub's private vulnerability reporting](https://github.com/pixel-agents-hq/pixel-agents/security/advisories/new) instead.
- We acknowledge within 7 days.
- We aim to release a fix within 30 days of confirmation.

## Supported versions

| Version | Supported |
|---|---|
| 1.x.x | Yes |

Older 0.x versions are not supported. Upgrade to the latest 1.x for security fixes.

## In scope

Security issues we care about, drawn from the repo's `SECURITY.md`:

- **Command injection** via terminal spawning or JSONL parsing.
- **Arbitrary file read/write beyond intended paths** (e.g. via a malformed catalog path or a layout file referencing absolute paths).
- **Cross-site scripting (XSS)** in the webview.
- **Sensitive data exposure** (e.g. leaking terminal output or session content to unintended parties).
- **WebSocket authentication bypass** in VS Code embedded mode (where Bearer auth is required).
- **Hook script tampering** that lets a third party deliver fake events to the server.

If you find something else that seems like a vulnerability, report it anyway. We'll triage.

## Out of scope

These are not security vulnerabilities by themselves:

- **Heuristic mode misfires** (false-positive permission bubbles). This is a known UX trade-off documented in [Hooks vs heuristic](/learn/hooks-vs-heuristic).
- **WebSocket lack of auth in standalone mode**. The server binds to 127.0.0.1 by design. The loopback boundary is the security model. If you bind to `0.0.0.0` (via `--host`), you've moved out of the documented threat model.
- **Behavior of `--dangerously-skip-permissions`** when you opt in. The flag is named "dangerously" because we mean it. See [Bypassing permissions](/use/workflows/bypassing-permissions).
- **Behavior under malicious external asset packs** if you've added a directory that ships hostile content. We don't sandbox third-party assets; you're responsible for the directories you add.
- **Behavior under malicious provider implementations** if you've added a custom HookProvider that does hostile things. Again, you're responsible.

## Reporting

Use [GitHub's private vulnerability reporting](https://github.com/pixel-agents-hq/pixel-agents/security/advisories/new) (under Security tab → Advisories). This creates a private advisory visible only to maintainers.

Include:

- A description of the vulnerability.
- Steps to reproduce.
- The impact (what could an attacker do?).
- If you have a proof of concept, attach or link it.
- Your contact info if you want credit and follow-up.

Do NOT file the report as a public issue. Do NOT post to Discord. Do NOT email the maintainers directly unless private vulnerability reporting is unavailable (it should always be available on GitHub).

## Disclosure timeline

| Stage | Time |
|---|---|
| Acknowledgment | Within 7 days |
| Triage decision | Within 14 days (confirmed / dismissed / needs-more-info) |
| Fix shipped | Within 30 days of confirmation |
| Public disclosure | After fix is released and adoption time has passed |

For critical vulnerabilities (remote code execution, broad data leak), we may shorten the disclosure window. For low-severity issues, we may extend the fix window.

The reporter is credited in the advisory and the changelog unless they prefer anonymity.

## What we will do

1. Acknowledge receipt within 7 days.
2. Confirm or dismiss the report.
3. If confirmed, prepare a patch privately.
4. Coordinate a release window.
5. Ship the patch publicly.
6. Publish a GitHub Security Advisory with the details.
7. Notify users via:
   - The README.
   - Discord announcement.
   - npm deprecation message on the affected versions (if applicable).

For the maintainer-side runbook, see [/maintainers/incident-runbook.md](/maintainers/incident-runbook#security-report).

## What we won't do

- Pay bounties. Pixel Agents has no funding mechanism today.
- Promise specific timelines for non-critical issues.
- Share details of an open report with anyone outside the maintainer team (without your consent).
- Retaliate against good-faith reporters even when reports turn out to be non-issues.

## Threat model

Pixel Agents is designed under these assumptions:

- **Single-machine, single-user.** Everything runs on the user's local machine. There's no remote attacker on the protocol layer.
- **Trusted local processes.** The user controls which Claude sessions run and which external asset directories are added. The runtime doesn't sandbox these.
- **Loopback as the security boundary** for standalone. The server binds to 127.0.0.1; only processes on the same machine can connect.
- **Bearer auth for hooks always** (not just embedded). The hook script reads the token from `~/.pixel-agents/server.json` (mode 0o600). Other processes on the machine can read the same file if they have the same user permissions, but a different user cannot.
- **Bearer auth for WebSocket in embedded mode** because the IDE host doesn't have the same loopback isolation guarantees.

If your threat model differs (multi-tenant machine, hostile co-located processes), Pixel Agents is not the right tool out of the box. Run it inside a per-user container or VM.

## Defense-in-depth measures

A few things Pixel Agents does to limit blast radius:

- **`~/.pixel-agents/server.json` is written with mode 0o600** so only the owning user can read the auth token (`server/src/server.ts:142-156`).
- **Hook event POSTs validate the providerId** against `^[a-z0-9-]+$` (`server/src/httpServer.ts:113`).
- **Hook event payloads are size-capped** at 64KB (`server/src/constants.ts:55`).
- **Bearer auth uses `crypto.timingSafeEqual`** to prevent timing attacks (`server/src/httpServer.ts:142-148, 207-217`).
- **Webview content is sandboxed** by VS Code's webview policy. Inline scripts are restricted; resource loading goes through the host.
- **Layout / config files use atomic writes** (tmp + rename) so a crash mid-write doesn't corrupt state.

These are not exhaustive; they're representative of the posture.

## Past advisories

When advisories are published, they appear at [github.com/pixel-agents-hq/pixel-agents/security/advisories](https://github.com/pixel-agents-hq/pixel-agents/security/advisories).

## Related (on this site)

- [SECURITY.md in the repo](https://github.com/pixel-agents-hq/pixel-agents/blob/main/SECURITY.md) - the canonical document.
- [Code of Conduct](./code-of-conduct)
- [Discovery and auth (technical)](/build/clients/discovery-and-auth)
- [Errors reference](/reference/errors)
- [Maintainer incident runbook](/maintainers/incident-runbook)
- [Bypassing permissions](/use/workflows/bypassing-permissions)
