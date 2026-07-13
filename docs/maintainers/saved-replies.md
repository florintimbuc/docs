---
sidebar_position: 5
---

# Saved Replies

:::warning[AI-generated docs]
This document was AI-generated and may have some mistakes - we apologize for this, we're in the process of reviewing all documents. If you find any issues, we'd be thankful if you [submit an edit PR](https://github.com/pixel-agents-hq/docs/edit/main/docs/maintainers/saved-replies.md).
:::

> **Audience:** Maintainers responding to common PR / issue patterns.

Ten templates. Copy-paste, lightly customize, send. Keep tone friendly; these go to humans who took time to contribute.

GitHub supports saved replies natively (Settings → Saved replies). Adding these there makes them one-click.

---

## T1. Need reproduction steps

**When:** A bug report without enough information to reproduce.

```
Thanks for the report! To debug this we need a way to reproduce it.

Could you share:
- VS Code or standalone? Which version?
- Operating system (macOS / Windows / Linux + version)
- Steps to reproduce starting from a clean install
- What you expected to happen vs what actually happened
- Any console errors from the VS Code Output > Pixel Agents channel, or from
  the terminal where you ran `npx pixel-agents`

If you can attach a screen recording, even better - many of these bugs are
animation-state issues that are hard to describe in text.
```

---

## T2. Duplicate

**When:** Issue or PR is already filed.

```
Thanks for filing! This looks like a duplicate of #NNN. Going to close this
in favor of the original - please add a thumbs-up or any new information over
there to help us prioritize it.

If I'm wrong and your situation is different, let me know and I'll reopen.
```

---

## T3. PR needs changes

**When:** A PR has the right idea but is missing tests, CHANGELOG entry, or needs rebase.

```
Thanks for this! A few things before we can merge:

- [ ] Add a `CHANGELOG.md` entry under an appropriate section (Fixed / Added / Changed)
- [ ] Add a test that exercises the change (see `server/__tests__/` for examples)
- [ ] Rebase onto `main` (we don't take merge commits, just `git rebase main`)
- [ ] Run `npm run typecheck && npm run lint` locally and confirm both pass

Let me know if any of these are unclear.
```

---

## T4. Out-of-scope PR

**When:** A PR proposes something that doesn't fit the project's direction.

```
Appreciate the work that went into this. After looking through it carefully,
I don't think this is the right fit for Pixel Agents because <reason>.

A few alternatives that might serve your underlying goal:
- <alternative 1>
- <alternative 2>

Going to close this PR, but please don't take it as discouragement - the
contribution effort is genuinely appreciated and we'd love to see more
focused PRs from you in the future.
```

Customize `<reason>` and the alternatives every time. Don't send this without substituting them.

---

## T5. Batched into next release

**When:** A change is good but the queue is full / a release is imminent.

```
This looks great. We're cutting a release this week and I'd rather not
risk-mix changes, so I'm going to batch this into the release after that.

Don't take the delay as a problem with the PR - it's strong as is. I'll
update the milestone once the current release is out.
```

---

## T6. AI-generated PR welcome

**When:** A PR is clearly AI-generated and the author hasn't said anything about review.

```
Welcome! AI-assisted PRs are welcome here - we just have a couple of
expectations to keep the review tractable:

1. Please confirm you've read the diff yourself and the change actually does
   what the description says.
2. Please run `npm run typecheck && npm run lint && npm test` locally before
   pushing. CI will catch them eventually, but it speeds things up.
3. If the description is generic ("feat: add feature based on requirements"),
   please replace it with a human explanation of why this change is needed
   and what design choices you made.

The full AI policy is at [/maintainers/ai-policy.md](/maintainers/ai-policy).
Happy to look at this once those are sorted.
```

---

## T7. Provider request

**When:** Someone asks if we support / will support a provider other than Claude (Codex, Goose, etc.).

```
Today the only bundled provider is Claude Code. The codebase supports
plug-in providers via the `HookProvider` interface, so adding support for
another CLI is a real possibility - the interface is documented at
[/build/providers/overview.md](/build/providers/overview) and the Claude
implementation is the canonical example.

If you'd like to add `<X>` support, I'm happy to help review a PR. The
[Adding a Provider walkthrough](/build/providers/adding-a-provider) is
the step-by-step. The most important thing is the `normalizeHookEvent`
translator - that's where the provider-specific work lives.

Happy to discuss the design before you start coding if useful.
```

---

## T8. Hooks behavior question

**When:** Someone asks why their permission bubble misfired, why an agent didn't appear instantly, why behavior differs across machines.

```
Pixel Agents has two detection modes: **hooks** (instant, reliable) and
**heuristic** (file-watching fallback). When hooks are installed and
working, you get instant detection. When they're not, the heuristic
timers kick in and you'll occasionally see misfires (most commonly a
permission bubble on a long-running tool that's actually still executing).

A walkthrough of the two modes is at
[/learn/hooks-vs-heuristic.md](/learn/hooks-vs-heuristic).

Quick check: open the Pixel Agents settings panel and confirm "Hooks
enabled" is on. If it is, try toggling it off and on again - that reinstalls
the hook script. If you're still seeing the issue after that, please share
your VS Code version, OS, and the timing of when you saw the bubble vs when
the tool was actually waiting.
```

---

## T9. Layout editor question

**When:** Someone asks how to do something in the layout editor (paint, place, undo, save).

```
The layout editor is documented at
[/use/vscode/layout-editor.md](/use/vscode/layout-editor).

Quick reference for the most-asked questions:

- **Enter edit mode:** click "Layout" in the bottom toolbar.
- **Undo:** Ctrl/Cmd+Z (50-level undo).
- **Rotate furniture:** R key while ghost is visible.
- **Toggle on/off state:** T key (for furniture with state pairs).
- **Save:** Save button in the top-center action bar (visible when dirty).
- **Esc:** multi-stage - exits furniture pick → deselects → closes tool tab → deselects → closes editor.

If your question isn't covered there, let me know what you tried and what
happened, and I'll dig in.
```

---

## T10. Security report received

**When:** Someone has reported a vulnerability in a public issue. **First:** if they posted exploitable details, ask GitHub support to delete the issue, then ping the reporter privately. Otherwise:

```
Thanks for reporting this. To handle the disclosure responsibly, please
follow the process at `SECURITY.md` in the repo root and send the details to
the contact email listed there.

I'm going to close this public issue (not the report - just this thread).
A maintainer will respond to your private email within 24 hours to triage.

We appreciate the work that went into finding this.
```

---

## Usage notes

- These are starting points, not boilerplate. Substitute names, version numbers, links to specific files. A generic copy-paste reads as dismissive.
- Always thank the contributor. Open-source maintenance is a relationship business.
- If the same exchange happens three times with three different contributors, that's a docs gap - file an issue to add the answer to the FAQ or a learn page.

## Related

- [Triage flow](./triage-flow) - which template to use when.
- [AI policy](./ai-policy) - the policy referenced in T6.
- [Incident runbook](./incident-runbook) - T10 is the entry to the security flow.
- [/community/contributing.md](/community/contributing) - the public-facing contributor guide.
