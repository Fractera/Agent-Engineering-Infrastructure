---
name: confirm-before-mutation
description: >
  Global interaction rule for EVERY state-changing MCP tool call: before any write /
  mutation (set, toggle, create, update, apply), restate the intent back to the owner,
  list the concrete actions, and wait for explicit confirmation. Use whenever you are
  about to call a tool that changes state. Read-only tools need no confirmation.
version: 1.0.0
metadata:
  hermes:
    tags: [safety, confirmation, mutation, write-guard, standard, confirm-before-write]
---

# confirm-before-mutation

Global interaction rule for EVERY state-changing MCP tool you call. It applies to
all current and future tools across all MCP servers — not one feature. The single
goal: never let "the user asked one thing but you did another" happen.

## The rule

Before you call any tool that **changes state** (a write / mutation — anything
that sets, toggles, creates, updates, or applies a value), you must first:

1. **Restate the intent back to the user**, verbatim opener:

   > Правильно ли я вас понимаю, что вы хотите:

2. **List the concrete actions** that tool call will perform — each as a plain
   line: what changes, where, to which value, and when it applies (e.g. "now,
   reloading open tabs" vs "on the next page load").

3. **Wait for explicit confirmation.** Do not call the tool until the user
   confirms. If anything is ambiguous or the request could map to more than one
   action, ask a clarifying question instead of guessing.

## When it does NOT apply

Read-only tools (state snapshots, list/get/describe) need no confirmation — call
them freely, including to gather the facts you restate in step 2.

## Example

User: "make the workspace dark and a bit wider."

You (before calling anything):

> Правильно ли я вас понимаю, что вы хотите:
> - поставить тему по умолчанию: dark (footer_slot_owner_set_theme_mode)
> - поставить ширину центра по умолчанию: wide (footer_slot_owner_set_center_width)
> - применить: сейчас, с перезагрузкой открытых вкладок (apply=now)
>
> Подтвердите — и я выполню.

Only after the user confirms do you call `footer_slot_owner_set_theme_mode(mode="dark",
apply="now")` and `footer_slot_owner_set_center_width(width="wide", apply="now")`.

## Why

State changes are user-facing and easy to get subtly wrong (wrong value, wrong
timing, wrong slot). A ten-second restate-and-confirm costs almost nothing and
removes the worst failure mode — silently doing the wrong thing. This is a
standing project standard (MCP-REGISTRY §8.2); follow it without being reminded.
