---
sidebar_position: 1
title: Overview
---

# Learn

This section explains how Pixel Agents works: the mental models behind the office, the agents, and the machinery connecting them to your terminals. Read it when you want to understand *why* things behave the way they do, not just which button to press. The goal here is for you to leave with a mental model, not a memorized API.

## Who this section is for

| Audience | What you're here for | Start with |
|---|---|---|
| **End users** - you use Pixel Agents day to day, in VS Code or the browser | Understanding what's on screen and why it behaves the way it does | [Concepts](/learn/concepts), [How it works](/learn/how-it-works), [The office](/learn/the-office), [Agent lifecycle](/learn/agent-lifecycle), [Agent teams](/learn/agent-teams) |
| **Integrators** - you want to connect another agent, build an app on top, or bring the office to a new editor | The package boundaries, the wire contract, and the provider abstraction | [Architecture](/learn/architecture), [Protocol](/learn/protocol), [Agent teams](/learn/agent-teams), [Hooks vs heuristic](/learn/hooks-vs-heuristic) |
| **Contributors** - you work on the codebase itself | Everything | [Architecture](/learn/architecture), then the rest |

## What this section is not

Step-by-step tutorials live under [Start](/start/what-is-pixel-agents), how-to guides under [Use](/use/) and [Build](/build/), and exhaustive lookups (types, messages, constants) under [Reference](/reference/cli).

## Pages in this section

### [Concepts](/learn/concepts)

The vocabulary every other page assumes. What is an agent, a sub-agent, a team, a seat, a session, a provider. Short and read-once. Start here if you have never used Pixel Agents.

### [How it works](/learn/how-it-works)

One diagram and a paragraph per arrow: how activity in your terminal becomes a character animation in the office.

### [The office](/learn/the-office)

Characters, animations, seats, and the logic that decides whether a character is idling, walking, typing, or reading.

### [Agent lifecycle](/learn/agent-lifecycle)

The end-to-end path of one agent: the moment you click "+ Agent" in the toolbar, through the terminal launch, the hook handshake or first transcript append, the seat assignment, the tool-by-tool animation, the eventual session clear or terminal close. The page makes explicit which signals come from where and how the runtime decides what to render next.

### [Agent teams](/learn/agent-teams)

The Lead and Teammates pattern. Why a teammate is a full first-class agent and a sub-agent is not, how the host discovers team members without the server hardcoding agent-specific layout, and why the pattern is opt-in at the provider level.

### [Architecture](/learn/architecture)

Pixel Agents is split into four packages: `core/` (types and contracts), `server/` (runtime), `adapters/` (host integrations such as VS Code), and `webview-ui/` (React canvas). This page explains the boundary of each package, how data flows from an agent hook event through the runtime to the canvas, and how the same server runs in both embedded (VS Code) and standalone (browser SPA) modes.

### [Protocol](/learn/protocol)

Why there is an AsyncAPI document at the heart of the project. The single bidirectional WebSocket channel, the two discriminated unions of message types, the auto-generation pipeline that keeps the TypeScript types and the schema in sync, and what changes between embedded and standalone authorization.

### [Hooks vs heuristic](/learn/hooks-vs-heuristic)

There are two ways the server learns what an agent is doing: the agent's hooks API (preferred), and file watching plus timers on the session transcript (fallback). This page explains the trade-off, where the switch lives, and which heuristics are still active when hooks are working.

## When to read what

**If you just installed Pixel Agents** and just want to understand the picture on screen, read [Concepts](/learn/concepts), [How it works](/learn/how-it-works), and [The office](/learn/the-office), and stop there.

**If you want Pixel Agents to work with another coding agent** - Codex, Gemini CLI, GitHub Copilot, or anything else that isn't supported yet - you'll be writing a [provider](/learn/concepts#provider). Read [Architecture](/learn/architecture), [Protocol](/learn/protocol), and [Hooks vs heuristic](/learn/hooks-vs-heuristic), then move to [Build → Providers](/build/providers/overview) for the action steps.

**If you're building your own app on top of Pixel Agents** - a dashboard, a Discord bot, a status widget, anything that consumes what the server broadcasts - you'll be writing a [client](/learn/concepts#client). Read [Protocol](/learn/protocol) and [Architecture](/learn/architecture), then move to [Reference → Protocol](/reference/protocol/overview) and [Build → Clients](/build/clients/overview).

**If you want to bring Pixel Agents to an editor other than VS Code, or embed it inside another application**, you'll be writing an [adapter](/learn/concepts#adapter). Read everything except [The office](/learn/the-office), then move to [Build → Adapters](/build/adapters/overview).
