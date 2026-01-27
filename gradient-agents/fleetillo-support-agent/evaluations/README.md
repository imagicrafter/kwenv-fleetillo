# OptiRoute Support Agent - Evaluation Suite

Comprehensive guide for using DigitalOcean's Gradient evaluation platform to test agent production-readiness.

---

## Quick Start

```bash
cd gradient-agents/optiroute-support-agent
./evaluate.sh
```

**View Results**: https://cloud.digitalocean.com/gen-ai/agent-workspaces/optiroute-support-agent/evaluations

---

## Critical Learnings - DigitalOcean Gradient Evaluation API

### 1. CSV Dataset Format Requirements

**CRITICAL**: The `query` column must contain **full JSON payloads** with properly escaped strings.

✅ **Correct Format**:
```csv
query,expected_response
"{""messages"":[{""role"":""user"",""content"":""How many active customers?""}]}","There are 4 active customers."
```

❌ **Incorrect Format** (will fail):
```csv
query,expected_response
How many active customers?,4 customers
```

**Why**: Gradient evaluation API sends the exact `query` value as the HTTP request body to your agent.

### 2. Message Format Handling in Agent Code

**CRITICAL BUG TO AVOID**: Your `@entrypoint` function must handle **TWO different message formats**:

```python
@entrypoint
async def main(body: Dict, context: Dict):
    # Handle both formats:
    if "input" in body:
        # Web-launcher/deployment format: {"input": {"messages": [...]}}
        messages = body["input"]["messages"]
    else:
        # Gradient evaluation format: {"messages": [...]}
        messages = body["messages"]
```

**Why Two Formats**:
- **Deployment API** (web-launcher, production): Wraps messages in `{"input": {...}}`
- **Evaluation API** (Gradient platform): Direct `{"messages": [...]}`

**Symptom if missing**: Agent returns greeting for all evaluation queries but works fine in production.

### 3. Expected Response Formatting

**IMPORTANT**: Expected responses should be complete, semantically accurate sentences, not fragments.

✅ **Good**:
```csv
"There are 4 active customers in the system."
"The contact information for Perkins is: Email: perkins@mail.com, Phone: 888-222-3333"
"I couldn't find a customer named mcburgers."
```

❌ **Bad** (too vague for LLM judge):
```csv
"active customers"
"perkins@mail.com"
"not found"
```

**Why**: Gradient uses LLM-as-judge for semantic similarity. Complete sentences score higher than fragments.

### 4. Evaluation Metrics

Gradient provides **11 metrics** across 3 categories:

**Correctness**:
- Correctness (general hallucinations) <- **Star metric**
- Instruction following
- Ground truth faithfulness

**User Outcomes**:
- User goal progress
- Retrieved context relevance
- Response-context completeness

**Safety & Security**:
- Toxicity
- Sexism  
- Prompt injection
- Personally identifiable information leaks
- Tone

**Star Metric**: Defaults to first metric (Correctness) if not specified. Set with `--star-metric-name`.

### 5. Success Thresholds

Default: **80.0%** for star metric

```bash
gradient agent evaluate \
  --success-threshold 80.0  # Customize as needed
```

Typical targets:
- Production-ready: ≥ 80%
- Development: ≥ 60%
- Experimental: ≥ 40%

---

## Test Dataset Structure

### Current Test Cases (10 total)

| Category | Count | Purpose |
|----------|-------|---------|
| Tool Execution | 3 | Verify correct tool calls |
| Anti-Hallucination | 2 | No data fabrication |
| Response Quality | 2 | Clean formatting |
| No Tool Leakage | 2 | Silent execution |
| Natural Language | 1 | Conversational handling |

### Adding New Tests

1. **Edit** `test_dataset.csv`
2. **Format** query as JSON payload (see format above)
3. **Write** complete expected response
4. **Run** `./evaluate.sh`

---

## Running Evaluations

### Command Line

```bash
./evaluate.sh
```

### Manual (with options)

```bash
gradient agent evaluate \
  --test-case-name "My Test Run" \
  --dataset-file evaluations/test_dataset.csv \
  --categories "correctness,user_outcomes,safety_and_security" \
  --success-threshold 80.0 \
  --no-interactive
```

### Viewing Results

1. **Console**: Results print after completion
2. **Web Dashboard**: https://cloud.digitalocean.com/gen-ai/agent-workspaces/optiroute-support-agent/evaluations
3. **Test Case UUID**: Saved in console output for direct links

---

## Common Issues & Solutions

### Issue: All Metrics Score 0.00

**Symptoms**:
- Correctness: 0.00
- Ground truth: 0.00
- Agent works fine in production

**Root Cause**: Message format mismatch in agent code

**Solution**: Add dual-format handling (see section 2 above)

**Verification**:
```bash
curl -X POST "https://agents.do-ai.run/.../run" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"messages": [{"role": "user", "content": "test query"}]}'
```

### Issue: CSV Upload Fails

**Error**: "Invalid dataset format"

**Causes**:
- Missing double-quote escaping in JSON
- Using plain text instead of JSON payloads
- Wrong column names (use `query` not `user_query`)

**Solution**: Use this exact format:
```csv
query,expected_response
"{""messages"":[{""role"":""user"",""content"":""text""}]}","expected text"
```

### Issue: Low Correctness Scores Despite Working Agent

**Cause**: Expected responses too vague/fragmented

**Solution**: Update to complete sentences matching agent's actual output style

---

## Environment Setup

### Required Variables

Set in `.env`:
```bash
DIGITALOCEAN_API_TOKEN=dop_v1_xxx
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=eyJxxx
```

### Verification

```bash
source .env
echo $DIGITALOCEAN_API_TOKEN  # Should print token
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Agent Evaluation
on: [pull_request]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install Gradient CLI
        run: curl -sSL https://cli.do-ai.run/install.sh | sh
      - name: Run Evaluation
        env:
          DIGITALOCEAN_API_TOKEN: ${{ secrets.DO_API_TOKEN }}
        run: |
          cd gradient-agents/optiroute-support-agent
          ./evaluate.sh
```

---

## Files

- `test_dataset.csv` - Test cases (Gradient JSON format)
- `../evaluate.sh` - Automated evaluation runner
- `../main.py` - Agent code (ensure dual-format support)
- `results/` - Timestamped evaluation outputs

---

## Best Practices

1. **Start Small**: 10-20 tests initially, expand to 50-100 for production
2. **Version Control**: Commit test_dataset.csv changes with code changes
3. **Iterate**: Run eval → review failures → improve prompts → re-run
4. **Monitor Trends**: Track metric scores over time to catch regressions
5. **Test Edge Cases**: Empty results, special characters, multi-turn conversations

---

## Resources

- [Gradient Evaluation Docs](https://docs.digitalocean.com/products/genai-platform/)
- [Test Case Dashboard](https://cloud.digitalocean.com/gen-ai/agent-workspaces/optiroute-support-agent/evaluations)
- [Gradient CLI Reference](https://github.com/digitalocean/gradient-cli)
