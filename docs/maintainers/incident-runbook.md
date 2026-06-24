---
sidebar_position: 4
---

# Incident Runbook

> **Audience:** Maintainers responding to a production issue, CI break, or security report.

The most common incidents:

1. CI break on `main`.
2. Hooks API change in Claude Code that breaks event delivery.
3. Supply-chain advisory on a dependency.
4. Security report (private).
5. Marketplace abuse (someone clones the extension).

Each has its own runbook. Common rule: **don't push to `main` to firefight under pressure** - revert is faster and safer than forward-fix.

## CI break (main is red)

### Diagnose

1. Check the failing job's logs in GitHub Actions.
2. `git log --oneline` since the last green commit - the offending commit is almost always recent.
3. `git diff <last-green>..HEAD` for the suspect range.
4. Often the breakage is one specific test or one type-check failure. Skim for it.

### Fix

**First choice: revert.**

```sh
git revert <bad-commit-sha>
# Then open a PR with the revert and merge it once CI is green again.
```

Revert is fast, low-risk, and reversible. The author can re-submit their PR with a fix.

**Forward-fix only if** the bad commit is part of a multi-commit feature that's already merged, or the revert would cascade into more breakage than the original change.

After fixing, add a regression test that catches the original failure. CI-break incidents that don't grow new tests will repeat.

### Communicate

Drop a note in the maintainer Discord channel. If the break lasted more than 4 hours, mention it in the next release notes.

## Hooks break (Claude Code API change)

### Symptoms

- Existing installs see events stop flowing.
- Console shows `[Pixel Agents] HookProvider "claude" reports protocolVersion=N, but handler understands 1. Events from this provider will be dropped.` (`server/src/hookEventHandler.ts:72-78`).
- Users report "agents stopped moving" or "permission bubbles never appear."

### Diagnose

1. Compare Claude's current `settings.json` hook schema to what `claudeHookInstaller.ts` writes. The Claude team usually announces changes; check their docs.
2. Capture a raw hook payload from a recent Claude version. Compare to what `normalizeHookEvent` expects.
3. Check `~/.claude/settings.json` on an affected user's machine. The hook entries may have been silently rewritten by Claude.

### Fix

1. **Update `normalizeHookEvent`** in `server/src/providers/hook/claude/claude.ts` to handle the new payload.
2. **Bump `protocolVersion`** if the change is breaking (new event kinds, removed kinds, semantic changes). Update `HookEventHandler.SUPPORTED_PROTOCOL_VERSION` to match. This is rare; usually we additively handle new fields.
3. **Update the hook installer** if Claude changed the settings.json schema.
4. **Add a fixture** of the new payload to the test suite.
5. **Cut a patch release** following [release-cutting.md](./release-cutting).

### Communicate

Post a known-issue notice in the README. Pin the latest known-good Claude version. Once the patch is shipped, update the README.

## Supply-chain alert

### Triage

When `npm audit` or Dependabot reports an advisory:

1. **Read the advisory.** Does the vulnerable code path actually run in our context? A library may have a vulnerability that only manifests under input shapes we don't pass.
2. **Assess severity for our use case.** Low + not-in-path → schedule for next patch. High + in-path → hotfix.
3. **Check the hook-script bundle.** Anything in the bundle runs inside the user's Claude CLI. Be extra cautious here.

### Fix

Non-breaking upgrade:

```sh
npm audit fix
```

Then run `npm test` and `npm run build` and verify nothing broke.

Breaking upgrade: pin to the safe version, file a separate PR for the API migration if needed.

For dependencies in the hook-script bundle (anything that ends up in `dist/hooks/claude-hook.js`), inspect the bundle directly:

```sh
node -e "console.log(require.resolve('vulnerable-dep'))"
# Or look at the esbuild bundle in dist/hooks/
```

### Cut release

Even patch-level dependency bumps should be released. Stale dependencies in the npm registry are visible to users; an audit shows the fix landed.

## Security report

### First contact

A security reporter has sent you a private vulnerability writeup. Do not respond in any public issue.

1. **Acknowledge within 24 hours.** Even a one-line "thanks, looking into it" is fine.
2. **Confirm or refute** within 72 hours. Reproduce the report on your machine.
3. **Triage:** Severity (CVSS or informal: Critical / High / Medium / Low), affected versions, scope (server / extension / asset pipeline).

### Patch

For confirmed vulnerabilities:

1. Prepare a patch in a **private fork** of the repo. Don't push to `main` until disclosure is coordinated.
2. Coordinate a disclosure timeline with the reporter. Typical: 30-day private window, then public.
3. When the patch is ready and the disclosure date approaches, prepare the public release and the credit acknowledgment for the reporter.
4. Push the public commit, cut the release, publish the security advisory (GitHub Security Advisories tool).
5. Notify users - README banner, Discord announcement, possibly a blog post if the impact is wide.

### Public response

Use the saved reply T10 (see [saved-replies.md](./saved-replies)) if the report came through a public issue. Move the conversation off-platform.

`SECURITY.md` in the repo root documents the contact path for new reporters.

## Marketplace abuse

Someone has cloned the Pixel Agents extension on the VS Code Marketplace with a slightly different name, possibly adding malicious code.

1. **Capture evidence:** screenshots, the Marketplace URL, the abuse extension's manifest.
2. **Report to the VS Code Marketplace abuse team.** They have a dashboard for publisher-impersonation reports.
3. **Notify the community:** README banner, Discord announcement to warn users to install only from `pablodelucca.pixel-agents`.

This has happened with popular extensions; treat reports seriously even before confirmation.

## CI infrastructure failure

If GitHub Actions itself is down, or the marketplace publisher API is down:

1. Don't merge anything that depends on CI to verify (a release).
2. Don't manually publish from a developer machine if you can avoid it - automation traceability matters for security audits.
3. Wait it out. Check the GitHub status page and the Marketplace publisher status.
4. If the outage drags past a few hours and there's a critical release queued, escalate to the maintainer Discord for an explicit go/no-go on a manual publish.

## Postmortem

For any incident that lasted > 4 hours or affected > 100 users:

1. Write a short postmortem in `reports/postmortems/<date>-<topic>.md`.
2. Include: timeline, root cause, what worked, what didn't, action items.
3. Action items go into the issue tracker, not just the postmortem.

## Related

- [Triage flow](./triage-flow) - for non-incident PR/issue work.
- [Release cutting](./release-cutting) - for the patch-release flow.
- [Saved replies](./saved-replies) - T10 covers security reports.
- [/community/security.md](/community/security) - public-facing security policy.
- [Errors reference](/reference/errors) - for the codes that may appear in incident logs.
