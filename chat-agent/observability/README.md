# Chat-Agent Observability Stack

Self-hosted Prometheus + Grafana stack co-located with the chat-agent on the same EC2 instance. Scrapes `/agent/metrics` from the chat-agent container, retains 30 days of TSDB on a named docker volume, and ships a provisioned dashboard ready to render the moment a fresh Grafana boots.

---

## Live URLs (production)

| Service | URL | Auth |
|---|---|---|
| **Grafana dashboard** | `http://13.213.105.94:3000/d/chat-agent-prod` | Anonymous viewer enabled — no login needed to view. Admin: `admin` / value of `GRAFANA_ADMIN_PASSWORD` |
| Prometheus UI | `http://13.213.105.94:9090` | None (network-restricted via SG) |
| Chat-agent `/metrics` | `http://13.213.105.94:8010/agent/metrics` | None |

Open ports `3000` and `9090` in the EC2 security group inbound rules before access works from outside the VPC.

---

## What is shipped

```
chat-agent/
├── prometheus.yml                                # scrape config
├── docker-compose.aws.yml                        # adds prometheus + grafana services
└── observability/
    └── grafana/
        ├── dashboards/
        │   └── chat-agent.json                   # the dashboard JSON (8 panels)
        └── provisioning/
            ├── datasources/
            │   └── prometheus.yml                # datasource with uid=prometheus
            └── dashboards/
                └── dashboards.yml                # tells Grafana to auto-load dashboards/
```

`scripts/deploy-chat-agent.sh` rsyncs the whole `observability/` tree so the dashboard re-provisions on every deploy without manual UI edits.

---

## Dashboard panels

The provisioned dashboard `Chat Agent — Production` (uid `chat-agent-prod`) has eight panels arranged top-to-bottom.

| # | Panel | Type | PromQL | What it tells you |
|---|---|---|---|---|
| 1 | **Requests / sec (1m rate)** | stat | `sum(rate(agent_request_total[1m]))` | Current chat traffic. Green up to 100 rps |
| 2 | **Fallback ratio (5m)** | stat | `sum(rate(agent_fallback_total[5m])) / clamp_min(sum(rate(agent_request_total[5m])), 0.0001)` | Share of requests that hit any tool fallback. Yellow > 5%, red > 20% |
| 3 | **Mean latency (ms, 5m)** | stat | `sum(rate(agent_latency_ms_sum[5m])) / clamp_min(sum(rate(agent_latency_ms_count[5m])), 0.0001)` | End-to-end mean latency. Yellow > 1.5s, red > 3.5s |
| 4 | **Tool errors (5m)** | stat | `sum(increase(agent_tool_error_total[5m]))` | Raw count of non-success tool calls (BE catalog, order, recommender, knowledge). Red ≥ 1 |
| 5 | **Mean latency per LangGraph node** | timeseries | `sum by (node) (rate(agent_node_latency_ms_sum[5m])) / clamp_min(sum by (node) (rate(agent_node_latency_ms_count[5m])), 0.0001)` | Find the slow node. Usually `refine_grounded_answer_with_llm` dominates because it makes an OpenAI call |
| 6 | **Intent distribution (total)** | donut | `sum by (intent) (agent_intent_total)` | Where users are spending time: FAQ vs product vs handoff. Useful for content/CS planning |
| 7 | **Tool call rate by tool** | timeseries | `sum by (tool) (rate(agent_tool_latency_ms_count[5m]))` | Which downstream is most stressed — `catalog.search` vs `recommend.personalized` vs `knowledge.retrieve` |
| 8 | **Response type distribution (total)** | donut | `sum by (response_type) (agent_response_type_total)` | Did we end on an `answer`, `product_results`, `recommendations`, or `empty_result`? Empty_result spikes are quality flags |

Dashboard auto-refreshes every 10 seconds and defaults to the last 30 minutes.

---

## Metrics inventory (chat-agent → Prometheus)

All metrics are exported by `app/services/metrics_service.py` and exposed on `GET /agent/metrics`.

| Metric | Type | Labels | Notes |
|---|---|---|---|
| `agent_request_total` | counter | `intent`, `response_type` | One per request reaching the handler |
| `agent_latency_ms` | summary | (none) | Whole-request latency. `_sum` + `_count` only — no quantiles |
| `agent_intent_total` | counter | `intent` | Cache hits short-circuit BEFORE this increments |
| `agent_response_type_total` | counter | `response_type` | `answer`, `product_results`, `recommendations`, `order_status`, `empty_result`, `support_handoff` |
| `agent_node_latency_ms` | summary | `node`, `status` | One sample per LangGraph node execution via the `trace_node` decorator |
| `agent_tool_latency_ms` | summary | `tool`, `status` | One sample per call to catalog / order / knowledge / recommender |
| `agent_tool_error_total` | counter | `tool`, `error_class` | Increments on any non-`success` tool status |
| `agent_fallback_total` | counter | `fallback_from`, `fallback_to` | Tool A failed, fell back to tool B |

A summary in `prometheus_client` only exports `_sum` and `_count`, not quantiles. The dashboard therefore plots **mean** latency, not p50/p95/p99. Switching to histograms is a future-work item; see "Future work" below.

---

## How to access from your laptop

```bash
# 1. Open the dashboard
open http://13.213.105.94:3000/d/chat-agent-prod

# 2. Fire some traffic so panels light up
for q in "what is your return policy" "show me jackets" "recommend a hoodie" "speak to manager"; do
  curl -sS -X POST http://13.213.105.94:8010/agent/chat \
    -H 'Content-Type: application/json' \
    -d "{\"sessionId\":\"smoke-$RANDOM\",\"message\":\"$q\"}" > /dev/null
done

# 3. Wait ~15s for the next Prometheus scrape, then refresh Grafana.
```

If a panel still says `No Data` after ~30 seconds, the most common causes are:

- Prometheus has not yet scraped (15s interval) — wait one full interval.
- Security-group rule on port 9090/3000 missing on the EC2.
- Datasource UID mismatch — the provisioned datasource MUST have `uid: prometheus` so the dashboard JSON references resolve. Re-check `observability/grafana/provisioning/datasources/prometheus.yml`.

---

## Running the stack

### From a fresh EC2

`scripts/deploy-chat-agent.sh` brings up everything in one shot — chat-agent, qdrant, prometheus, grafana — using the names declared in `docker-compose.aws.yml`. Set these env vars before running:

```bash
export EC2_HOST=13.213.105.94
export SSH_KEY=~/.ssh/recommender-key.pem
export OPENAI_API_KEY=sk-...
export BACKEND_BASE_URL=https://eshop-api-5dx33.ondigitalocean.app
export RECOMMENDER_BASE_URL=http://18.143.45.118:8000
export GRAFANA_ADMIN_PASSWORD='your-real-password'   # default is 'changeme' — script will warn
./scripts/deploy-chat-agent.sh
```

### Just restart Grafana / Prometheus on the EC2

```bash
ssh -i ~/.ssh/recommender-key.pem ubuntu@13.213.105.94 \
  'cd ~/e-shop/chat-agent && docker compose -f docker-compose.aws.yml restart grafana prometheus'
```

### Inspect Prometheus targets

```bash
curl -s http://13.213.105.94:9090/api/v1/targets \
  | python3 -c "import json,sys;[print(t['labels']['job'], t['health'], t['scrapeUrl']) for t in json.load(sys.stdin)['data']['activeTargets']]"
```

Expected output: `chat-agent up http://chat-agent:8010/agent/metrics`

---

## Changing the dashboard

Two ways:

1. **Source-of-truth edit (recommended)** — modify `observability/grafana/dashboards/chat-agent.json` locally, redeploy. The provisioned dashboard is `disableDeletion: true` and `allowUiUpdates: false`, so a UI edit will not persist past the next Grafana restart.

2. **Quick experiment in the UI** — log in as admin, *Save As* a copy in a different folder, iterate, then export and replace `chat-agent.json` in the repo when done.

Grafana re-reads provisioned files every 30s (`updateIntervalSeconds: 30` in `dashboards.yml`) — no restart needed for dashboard JSON edits already on the EC2 disk.

---

## Adding a new metric end-to-end

```python
# 1. In app/services/metrics_service.py — register the metric
MY_METRIC = Counter("agent_my_metric_total", "Description", labelnames=["foo"])

# 2. Increment from a node / service
metrics_service.increment("agent_my_metric_total", labels={"foo": "bar"})

# 3. Redeploy — Prometheus picks up the new series on next scrape
# 4. Add a panel in chat-agent.json that queries `sum by (foo) (agent_my_metric_total)`
```

---

## Future work

| Item | Why |
|---|---|
| Convert `agent_latency_ms` summary → histogram | Enables `histogram_quantile(0.95, ...)` for real p95/p99 dashboards |
| Recommender + Spring BE expose `/metrics` | End-to-end visibility — current dashboard only shows chat-agent perspective |
| Loki + Promtail | Correlate logs ↔ metrics in Grafana Explore. JSON logs are already shipped to stdout — Promtail just needs to ingest them |
| Alert rules | Grafana → Slack/email for `mean_latency > 5s` or `fallback_ratio > 20%` (5m windows) |
| Add panel: response-cache hit ratio | The cache currently has no dedicated counter — add one and a panel |
| Restrict ports 3000/9090 to office IP CIDR | Current SG opens to 0.0.0.0/0 — fine for demo, tighten for real prod |
| Move Grafana behind a reverse proxy with TLS | Avoids plaintext admin password over the wire |

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| All panels `No Data` | Datasource UID mismatch | Check `observability/grafana/provisioning/datasources/prometheus.yml` has `uid: prometheus`; restart Grafana |
| Only some panels `No Data` | Metric not yet emitted (e.g. `tool_error_total` stays 0 until a tool fails) | Fire traffic that exercises the metric path |
| Prometheus target shows `down` | Wrong target hostname | `prometheus.yml` should target `chat-agent:8010`, not `localhost` or `host.docker.internal` |
| Grafana keeps reverting your UI edit | Provisioned dashboards are read-only by design | Edit `chat-agent.json` in the repo and redeploy |
| `Connection refused` on port 3000 | EC2 SG closed | AWS Console → EC2 → SG → Inbound → add TCP 3000 from `0.0.0.0/0` or your office IP |
| Grafana welcome wizard appears | Admin password env var not propagated | Re-run deploy with `GRAFANA_ADMIN_PASSWORD` exported; the script bakes it into the remote `.env` |

---

## Why this stack and not Grafana Cloud / Datadog?

- Stack lives on the same EC2 as the chat-agent → zero egress, near-zero latency for scrape
- t3.large has spare RAM (~5 GB free) — Prometheus + Grafana together use ~300 MB
- Free tier; no vendor lock-in; full PromQL access
- LangSmith already covers per-request LLM tracing — this stack covers infra-level RPS/latency/errors that LangSmith doesn't surface
