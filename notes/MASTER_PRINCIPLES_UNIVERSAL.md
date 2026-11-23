# CLAUDE CODE MASTER PRINCIPLES
### Universal Build Standards — Drop Into Any Claude Code Session

> **How to use this file:** Paste into your Claude Code project as a context file.
> Every build follows these principles regardless of what you're building.
> This is a living document — update it when new lessons are learned.

---

## THE CORE PHILOSOPHY

> *"Real builds, thoroughly thought out and processed before building and applying."*

Build as if a real client's business is running on it — because eventually one will be. Never throw together demos. Never bolt on security later. Never automate a fuzzy process. Build clean, build secure, build to last.

**Before writing a single line of code, answer these:**
1. What is the exact scope of this build? What does it explicitly NOT touch?
2. What does the data model look like before any routes are written?
3. Where do secrets live? (Answer: always environment variables, never code)
4. What role-based access does this need from day one?
5. Does this AI feature have a retrieval layer, or is it generating freely?

---

## PART 1 — AGENT ARCHITECTURE

### 1.1 The Operator + Sub-Agent Pattern

Any workflow with more than 3–4 distinct steps should be broken into an operator agent with scoped sub-agents. Never build one giant prompt that tries to do everything.

**Structure:**
```
Operator Agent (Orchestrator)
    │
    ├── Sub-Agent A  →  scoped tools only  →  specific output
    ├── Sub-Agent B  →  scoped tools only  →  specific output
    ├── Sub-Agent C  →  scoped tools only  →  specific output
    └── Sub-Agent D  →  scoped tools only  →  specific output
```

**Rules:**
- The operator routes — sub-agents never call each other directly
- Each sub-agent has ONLY the tools it needs for its specific responsibility
- Sub-agents receive focused context, not the entire conversation history
- Operator aggregates outputs before passing to the next stage

**Why:** Scoped agents are more predictable, easier to debug, more secure, and produce better outputs than one large prompt trying to do everything.

---

### 1.2 Sub-Agent Design Rules

When designing a sub-agent, define these four things before writing any code:

```
Name:        [What is this agent called]
Inputs:      [Exactly what data it receives]
Tools:       [Exhaustive list — nothing extra]
Output:      [Exactly what it produces — type and format]
```

**Example:**
```
Name:        Diagnostic Agent
Inputs:      intake_data (dict), retrieved_patterns (list), domain (str)
Tools:       pattern_matching, opportunity_scoring
             (NOT: RAG retrieval, DB write, report generation)
Output:      findings (list of dicts with severity, category, recommendation)
```

---

### 1.3 Context Files Over Long System Prompts

Never stuff everything into the system prompt. Use context files that agents read at runtime.

**Benefits:**
- Knowledge is updatable without touching code
- Prompts stay clean and focused
- Different agents can load different context files
- Context files can be version-controlled separately from code

**Pattern:**
```python
def load_context(context_path: str) -> str:
    with open(f"/contexts/{context_path}", "r") as f:
        return f.read()

# At agent invocation time
domain_context = load_context(f"domains/{project_domain}.md")
config_context = load_context("project/config.md")

prompt = f"""
{domain_context}

{config_context}

Situation: {input_data}

Your task: {specific_task}
"""
```

**Context file structure:**
```
/contexts/
  {project_name}/
    system.md              # Core agent instructions
    domain_knowledge.md    # What the agent needs to know
    constraints.md         # What it must never do
    output_format.md       # Exact output schema
```

---

## PART 2 — THE SCRATCHPAD PATTERN

### 2.1 What It Is

A scratchpad is a persistent log of what an agent did, learned, or observed during a run — stored OUTSIDE the context window so it doesn't consume tokens on future runs.

**This is how your builds learn from themselves over time without retraining.**

---

### 2.2 When to Use It

Add a scratchpad to any AI feature where:
- The output should improve based on accumulated history
- Patterns across many runs would be valuable to surface
- You want the system to get smarter without manual updates
- Audit trails of AI decisions are needed

---

### 2.3 Implementation Pattern

```python
import json
import psycopg2
from datetime import datetime

# ── WRITE to scratchpad ──────────────────────────────────────────────────────
def write_scratchpad(conn, agent_name: str, run_id: str, data: dict):
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO agent_scratchpad
            (agent_name, run_id, data, created_at)
        VALUES (%s, %s, %s, %s)
    """, (agent_name, run_id, json.dumps(data), datetime.utcnow()))
    conn.commit()

# ── READ from scratchpad ─────────────────────────────────────────────────────
def read_scratchpad(conn, agent_name: str, filters: dict = None, limit: int = 10):
    cur = conn.cursor()
    where_clauses = ["agent_name = %s"]
    params = [agent_name]

    if filters:
        for key, value in filters.items():
            where_clauses.append(f"data->>'{key}' = %s")
            params.append(value)

    where_sql = " AND ".join(where_clauses)
    cur.execute(f"""
        SELECT data FROM agent_scratchpad
        WHERE {where_sql}
        ORDER BY created_at DESC
        LIMIT %s
    """, params + [limit])

    return [row[0] for row in cur.fetchall()]

# ── USAGE at start of agent run ──────────────────────────────────────────────
prior_learnings = read_scratchpad(
    conn,
    agent_name="your_agent_name",
    filters={"domain": input_domain},
    limit=10
)

learnings_context = "\n".join([
    f"- {l.get('pattern', '')}" for l in prior_learnings
])
```

**Database schema:**
```sql
CREATE TABLE agent_scratchpad (
    id          SERIAL PRIMARY KEY,
    agent_name  VARCHAR(100) NOT NULL,
    run_id      VARCHAR(100) NOT NULL,
    data        JSONB NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_scratchpad_agent ON agent_scratchpad(agent_name);
CREATE INDEX idx_scratchpad_data ON agent_scratchpad USING GIN(data);
```

---

### 2.4 The Recursive Learning Loop

```
Run 1:  Agent processes → writes findings to scratchpad
Run 2:  Agent reads prior scratchpad → processes → writes updated findings
Run N:  System has accumulated N runs of patterns → outputs are significantly
        smarter than Run 1 with zero model retraining
```

**Key principle:** The scratchpad is data, not prompts. You're building a knowledge base, not a conversation history. Structure it so it's queryable — JSONB in PostgreSQL with GIN indexes is ideal.

---

## PART 3 — RAG (RETRIEVAL-AUGMENTED GENERATION)

### 3.1 The Core Rule

**Never send raw user input directly to the model. Always retrieve relevant context first.**

```python
# ✗ WRONG — free generation, no grounding
response = model.generate(prompt=user_input)

# ✓ RIGHT — retrieval before generation
relevant_docs = rag.retrieve(query=user_input, corpus="knowledge_base", top_k=5)
grounded_prompt = f"Context:\n{relevant_docs}\n\nUser situation:\n{user_input}"
response = model.generate(prompt=grounded_prompt)
```

---

### 3.2 RAG Implementation Pattern (Chroma)

```python
import chromadb
from chromadb.utils import embedding_functions

client = chromadb.PersistentClient(path="/path/to/chroma_db")
embedding_fn = embedding_functions.DefaultEmbeddingFunction()

collection = client.get_or_create_collection(
    name="knowledge_base",
    embedding_function=embedding_fn
)

def add_to_corpus(docs: list[dict]):
    """Each doc: {id, text, metadata}"""
    collection.add(
        ids=[d["id"] for d in docs],
        documents=[d["text"] for d in docs],
        metadatas=[d.get("metadata", {}) for d in docs]
    )

def retrieve(query: str, top_k: int = 5, filters: dict = None) -> str:
    results = collection.query(
        query_texts=[query],
        n_results=top_k,
        where=filters
    )
    docs = results["documents"][0]
    return "\n\n---\n\n".join(docs)
```

---

### 3.3 Corpus Planning Template

Define this before writing any retrieval code:

```
Source Type          | Content                    | Metadata Tags
---------------------|----------------------------|---------------------------
Past outputs         | Previous AI-generated work | domain, date, outcome
Domain knowledge     | Reference material         | category, source
Process docs         | SOPs, frameworks           | process_type, version
Outcome data         | What worked, what didn't   | result, context
```

---

### 3.4 Prompt Injection Protection for RAG

Any user input going into a retrieval query or prompt must be sanitized:

```python
def sanitize_for_prompt(user_input: str, max_length: int = 2000) -> str:
    dangerous_patterns = [
        "ignore previous instructions",
        "ignore all instructions",
        "system:",
        "assistant:",
        "human:",
        "forget everything",
        "new instructions",
        "disregard",
        "<|im_start|>",
        "```system",
        "act as if"
    ]
    for pattern in dangerous_patterns:
        user_input = user_input.replace(pattern, "[removed]")
        user_input = user_input.replace(pattern.title(), "[removed]")

    return user_input[:max_length].strip()
```

---

## PART 4 — SECURITY PRINCIPLES

### 4.1 Authentication & Authorization

**Never trust the client. Verify role server-side on every request.**

```python
# ✗ WRONG — only checking on page load
@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

# ✓ RIGHT — checking on every API endpoint too
@app.route('/api/data', methods=['GET'])
@login_required
def get_data():
    if current_user.role not in ['allowed_role', 'admin']:
        abort(403)
```

**JWT rules:**
- Short expiry: 15–60 minutes maximum
- Use refresh tokens for longevity, not long-lived access tokens
- Store tokens in httpOnly cookies, not localStorage
- Rotate refresh tokens on each use
- Blacklist tokens on logout

---

### 4.2 Secrets Management

```
NEVER:
  - Hardcode API keys, passwords, or tokens in any file
  - Commit .env files to GitHub
  - Log environment variables (even accidentally)
  - Share secrets across environments (dev/prod get separate keys)

ALWAYS:
  - Use platform environment variables for all secrets
  - Prefix with environment: PROD_DATABASE_URL vs DEV_DATABASE_URL
  - Rotate credentials after any team member departure
  - Audit secret access regularly
```

**Secret naming convention:**
```
PROD_DATABASE_URL
PROD_ANTHROPIC_API_KEY
PROD_SECRET_KEY
DEV_DATABASE_URL
DEV_ANTHROPIC_API_KEY
```

---

### 4.3 Database Security

```python
# ✓ ALWAYS — parameterized queries (never string concatenation)
cur.execute(
    "SELECT * FROM records WHERE user_id = %s AND status = %s",
    (user_id, status)
)

# ✗ NEVER — SQL injection vulnerability
cur.execute(f"SELECT * FROM records WHERE user_id = {user_id}")

# ✓ ALWAYS — catch and sanitize DB errors before returning to client
try:
    cur.execute("SELECT * FROM records WHERE user_id = %s", (user_id,))
    results = cur.fetchall()
except psycopg2.Error as e:
    app.logger.error(f"DB error: {e}")           # Log server-side
    return jsonify({"error": "Unable to retrieve data"}), 500  # Generic to client
finally:
    cur.close()
```

**Database user privileges:**
- App DB user: SELECT, INSERT, UPDATE, DELETE only
- Never grant DROP, CREATE, ALTER to the application user
- Migration scripts use a separate privileged user

---

### 4.4 API Security & Rate Limiting

```python
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["500 per day", "100 per hour"]
)

# Tighter limits on auth endpoints
@app.route('/login', methods=['POST'])
@limiter.limit("5 per minute")
def login():
    ...
```

**CORS — always explicit allowlist, never wildcard:**
```python
# ✗ NEVER
CORS(app, origins="*")

# ✓ ALWAYS
CORS(app, origins=[
    "https://yourdomain.com",
    "https://app.yourdomain.com"
])
```

---

### 4.5 Input Validation

```python
def validate_input(data: dict) -> tuple[bool, str]:
    """Whitelist validation — define what's allowed, reject everything else."""

    required_fields = ['field_one', 'field_two', 'field_three']
    for field in required_fields:
        if field not in data or not data[field]:
            return False, f"Missing required field: {field}"

    # Enum fields must be from allowed list
    allowed_values = ["option_a", "option_b", "option_c"]
    if data.get('enum_field') not in allowed_values:
        return False, "Invalid value"

    # Text fields: length cap
    text_field = data.get('text_field', '')
    if len(text_field) > 2000:
        return False, "Input too long (max 2000 characters)"

    return True, ""
```

---

### 4.6 AI-Specific Security

```python
# ── SCOPE ENFORCEMENT — never give agents tools they don't need ──────────────
AGENT_TOOL_REGISTRY = {
    "intake_agent":         ["parse_input", "validate_fields"],
    "research_agent":       ["rag_retrieve", "vector_search"],
    "diagnostic_agent":     ["pattern_match", "score"],
    "reporting_agent":      ["generate_output", "format"],
}

def get_agent_tools(agent_name: str) -> list:
    tools = AGENT_TOOL_REGISTRY.get(agent_name)
    if not tools:
        raise ValueError(f"Unknown agent: {agent_name}")
    return tools  # Only these tools, nothing else

# ── HUMAN IN THE LOOP — never auto-send AI output externally ─────────────────
def queue_for_review(output: dict, output_type: str, record_id: str):
    cur.execute("""
        INSERT INTO ai_output_review_queue
            (output_type, record_id, content, status, created_at)
        VALUES (%s, %s, %s, 'pending_review', NOW())
    """, (output_type, record_id, json.dumps(output)))
    conn.commit()

# ── LOG ALL AI INPUTS AND OUTPUTS ────────────────────────────────────────────
def log_ai_call(input_data: dict, output_data: dict, agent_name: str, run_id: str):
    cur.execute("""
        INSERT INTO ai_call_log
            (agent_name, run_id, input_hash, output_preview, created_at)
        VALUES (%s, %s, %s, %s, NOW())
    """, (
        agent_name,
        run_id,
        hash(str(input_data)),
        str(output_data)[:500]
    ))
    conn.commit()
```

---

## PART 5 — BUILD PATTERNS & DISCIPLINE

### 5.1 The Pre-Build Checklist

Run through this before starting any new build:

```
[ ] Scope defined — what this build does and explicitly does NOT do
[ ] Data model sketched — tables, columns, relationships before any routes
[ ] Auth strategy defined — what roles exist, what each can access
[ ] Secrets plan — where do all credentials live
[ ] AI features identified — does each one have a retrieval layer
[ ] Scratchpad needed — does this feature benefit from learning over time
[ ] Agent architecture — single agent or operator + sub-agents
[ ] Context files — what knowledge does each agent need at runtime
[ ] Existing infrastructure checked — what can be reused vs rebuilt
[ ] Security checklist — rate limiting, input validation, CORS, error handling
```

---

### 5.2 Prompting Standards

Every Claude Code prompt should follow this structure:

```
CONTEXT:
  [What project this is, what's already built, what stack is in use]

TASK:
  [Exactly what needs to be built — specific and unambiguous]

SCOPE:
  [What to touch and — CRITICALLY — what NOT to touch]

CONSTRAINTS:
  [Stack constraints, style rules, SQL dialect, etc.]

OUTPUT:
  [Exactly what files should be created/modified and where they live]
```

**Always plan mode first, then one complete self-contained prompt per round.**

---

### 5.3 Error Handling Standards

```python
# ── DATABASE ERRORS ───────────────────────────────────────────────────────────
try:
    cur.execute(query, params)
    result = cur.fetchall()
except psycopg2.OperationalError as e:
    app.logger.error(f"DB connection error: {e}")
    return jsonify({"error": "Service temporarily unavailable"}), 503
except psycopg2.Error as e:
    app.logger.error(f"DB query error: {e}")
    return jsonify({"error": "Unable to process request"}), 500
finally:
    cur.close()

# ── AI API ERRORS ─────────────────────────────────────────────────────────────
try:
    response = ai_client.messages.create(...)
except RateLimitError:
    app.logger.warning("Rate limit hit")
    return jsonify({"error": "Please try again in a moment"}), 429
except APIError as e:
    app.logger.error(f"AI API error: {e}")
    return jsonify({"error": "AI service unavailable"}), 503

# ── NEVER EXPOSE INTERNAL ERRORS TO CLIENT ────────────────────────────────────
# Log the real error server-side
# Return a generic, safe message to the client
# Use appropriate HTTP status codes (400, 401, 403, 404, 500, 503)
```

---

## PART 6 — LESSONS LEARNED (UPDATE AS YOU BUILD)

> This section is the most important. Add to it after every build session.

### Universal Lessons
- Document the manual process before automating it — automate clarity, not confusion
- Build Phase 1 proven before adding Phase 2 complexity — especially true for agentic architecture
- The scratchpad pattern is more valuable than it looks — start logging early even if you don't use the data yet
- Scope creep is the primary cause of timeline overrun — define and defend the scope boundary on every build
- Build dashboards after sufficient data accumulates, not preemptively
- All SQL uses `%s` placeholders (psycopg2 style) — never `?` or string formatting
- Scroll animations must be scroll-position-driven, not fire-and-forget
- Never introduce unnecessary framework complexity mid-build — the risk of breaking existing work is too high

### Your Lessons (Add Here)
- Lead scraper: API keys never go in config.json — they live in .env (gitignored) and load via python-dotenv. Pass tokens in headers, not URL query strings, so they can't leak into error messages or logs.
- Empowered dashboard: Railway's filesystem is wiped on every deploy. Any JSON flat-file store needs a Railway Volume plus a DATA_DIR env var, and the app should seed the volume from the repo copy on first boot.

---

*This is a living document. Update it every time a new pattern is discovered or a mistake is made.*
