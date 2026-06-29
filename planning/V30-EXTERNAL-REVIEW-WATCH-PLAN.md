# Juno v30 external-review watch plan

Generated: 2026-06-29T14:48:33Z
Repo inspected: `/opt/data/repos/juno`
PR watched: https://github.com/CosmosContracts/juno/pull/1202
Local head: `571417884e76dcbbee468ff1e334ac6ad47fb786` (`origin/jakehartnell/v30`, detached locally)

## Current status

- v30 PR #1202 is open, non-draft, mergeable-state `clean`, base `main`, head `CosmosContracts:jakehartnell/v30`.
- Latest head checks are green: `build`, `test`, `tidy`, `lint`, `Analyze`, `CodeQL`, `build-docker`, and all 15 `e2e-tests` jobs including `ictest-dao-dao` and `ictest-upgrade` completed `success`.
- Local backlog says: `v30 is review-blocked; respond only if new review feedback appears` (`/opt/data/repos/juno-work-backlog.md`).
- Internal review notes show no open Sev-1/Sev-2, one deferred Sev-3, and external review still required for `app/upgrades/v30/upgrades.go`, `x/voting-snapshot/`, and selected app wiring (`planning/SECURITY-REVIEW-NOTES-V2.md`).
- Therefore: autonomous workers should not keep making v30 code changes unless PR #1202 receives new human/external reviewer feedback or a check regresses.

## What can be checked locally

Run from `/opt/data/repos/juno`:

```bash
git status --short --branch
git rev-parse HEAD
git branch -a --contains HEAD
git log --oneline -8
git diff --stat
```

Optional local verification if code changed after this note:

```bash
make build
make lint
go test ./...
```

Local ictest note: historical SafeClaude/Hermes network isolation blocked local interchaintest from inside this container (`planning/ICTEST-BLOCKER-V30.md`). Treat GitHub Actions or an outer-host run as the source of truth for ictest.

## What requires external reviewer action

Do not try to solve these by spinning more local workers unless new feedback arrives:

1. External reviewer sign-off on:
   - `app/upgrades/v30/upgrades.go`
   - `x/voting-snapshot/`
   - `app/keepers/keepers.go` / app wiring touched by the upgrade
2. Any new GitHub review comments from humans/external reviewers on PR #1202.
3. Any new CodeQL/code-scanning alert that is not already covered by the current successful filtered CodeQL check.
4. Any failed GitHub Actions job on the latest PR head.

## Watch commands

`gh` is not authenticated in this environment, so use public GitHub API reads unless credentials are intentionally configured.

PR summary:

```bash
python3 - <<'PY'
import json, urllib.request
url='https://api.github.com/repos/CosmosContracts/juno/pulls/1202'
with urllib.request.urlopen(url, timeout=30) as r:
    pr=json.load(r)
print(json.dumps({
    'number': pr['number'],
    'state': pr['state'],
    'draft': pr['draft'],
    'mergeable_state': pr.get('mergeable_state'),
    'head': pr['head']['label'],
    'head_sha': pr['head']['sha'],
    'base': pr['base']['label'],
    'updated_at': pr['updated_at'],
    'review_comments': pr['review_comments'],
    'comments': pr['comments'],
}, indent=2))
PY
```

Latest check runs for the current head:

```bash
python3 - <<'PY'
import json, urllib.request
sha='571417884e76dcbbee468ff1e334ac6ad47fb786'
url=f'https://api.github.com/repos/CosmosContracts/juno/commits/{sha}/check-runs'
req=urllib.request.Request(url, headers={'Accept':'application/vnd.github+json'})
with urllib.request.urlopen(req, timeout=30) as r:
    data=json.load(r)
for c in data.get('check_runs', []):
    print(f"{c['name']}: {c['status']} / {c['conclusion']}  {c['html_url']}")
PY
```

Latest human/reviewer activity:

```bash
python3 - <<'PY'
import json, urllib.request
base='https://api.github.com/repos/CosmosContracts/juno'
for label, path in [('reviews','pulls/1202/reviews'), ('issue comments','issues/1202/comments'), ('review comments','pulls/1202/comments')]:
    print(f'\n## {label}')
    with urllib.request.urlopen(f'{base}/{path}?per_page=100', timeout=30) as r:
        rows=json.load(r)
    for x in rows[-10:]:
        user=x.get('user',{}).get('login')
        when=x.get('submitted_at') or x.get('created_at')
        body=(x.get('body') or '').replace('\r',' ').replace('\n',' ')
        path=x.get('path')
        print(f'{when} {user} {path or ""}: {body[:240]}')
PY
```

If `gh` becomes authenticated, equivalent checks:

```bash
gh pr view 1202 --repo CosmosContracts/juno --json number,state,isDraft,mergeStateStatus,headRefName,headRefOid,baseRefName,updatedAt,reviewDecision,statusCheckRollup,comments,reviews
gh pr checks 1202 --repo CosmosContracts/juno
gh pr diff 1202 --repo CosmosContracts/juno --name-only
```

## Action rule for future autonomous workers

- If no new human review comments and all checks are green: report `blocked on external review/sign-off`; do not edit code.
- If a check failed: inspect only the failed job log, classify root cause, and make the smallest fix if it is in this repo.
- If new human review feedback appears: address that exact feedback, run the smallest relevant local verification, and update this note or the kanban card with evidence.
- If external reviewers sign off and checks remain green: next step is release/governance preparation, not more review churn.
