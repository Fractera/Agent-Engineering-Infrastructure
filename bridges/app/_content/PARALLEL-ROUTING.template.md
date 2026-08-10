# PARALLEL-ROUTING.md — pages assembled from independent areas

**Given, not evolving.** Describes how the parallel layout works in THIS project and what changes when
it is switched on.

Parallel routing turns a page into several areas rendered independently — a header, a centre, a
sidebar, a footer — each with its own content and its own lifetime. The control panel switches the
mode; this file records what that means for your code.

## What to write here

- **Which areas exist** in this project and what each is for.
- **What the switch changes** — which layout wins, what happens to the width toggle, what a visitor
  sees while one area is still loading.
- **The rules that are not obvious**: which areas may be empty, which must never be, and what an area
  is forbidden to know about its neighbours.

## For the agent

Read this BEFORE touching a layout, not after. Areas that quietly depend on each other are the single
most expensive mistake in this mode: they work in development and break as soon as one of them is slow.
