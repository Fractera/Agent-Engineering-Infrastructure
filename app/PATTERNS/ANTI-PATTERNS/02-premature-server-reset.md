# Premature Reset

> Anti-pattern · stable

Resetting or redeploying the server before the source deploy (git push -> auto build) has finished delivers a stale bootstrap, which is a guaranteed bug. Confirm the new commit is actually live before touching the server.

## Source code example

```
git log -1 --oneline origin/main   # confirm the new commit is live before redeploying
```

## Steps
_No tasks._

<!-- fractera:pattern
{"kind":"anti","category":"","number":2,"name":"Premature Reset","status":"stable","description":"Resetting or redeploying the server before the source deploy (git push -> auto build) has finished delivers a stale bootstrap, which is a guaranteed bug. Confirm the new commit is actually live before touching the server.","code":"git log -1 --oneline origin/main   # confirm the new commit is live before redeploying","tasks":[]}
-->
