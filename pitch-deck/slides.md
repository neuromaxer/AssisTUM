---
theme: seriph
title: AssisTUM — Your Autonomous Campus Co-Pilot
author: Team AssisTUM
colorSchema: dark
aspectRatio: 16/9
canvasWidth: 980
exportFilename: assistum-pitch-deck
fonts:
  sans: Inter
  mono: Fira Code
themeConfig:
  primary: '#60a5fa'
transition: slide-left
---

# AssisTUM

Your Autonomous Campus Co-Pilot

<div class="pt-12">
  <span class="text-sm opacity-50">REPLY Makeathon 2026 — Team AssisTUM</span>
</div>

---
layout: center
---

# Students are **human APIs**

<div class="text-center mt-8">

```mermaid {scale: 0.7}
graph LR
    S((Student)) --- T[TUM Online]
    S --- M[Moodle]
    S --- E[TUM Email]
    S --- Me[Mensa]
    S --- N[NavigaTUM]
    S --- C[Club Sites]
    S --- Z[ZHS]
    style S fill:#ef4444,stroke:#dc2626,color:#fff
    style T fill:#1e293b,stroke:#334155,color:#f1f5f9
    style M fill:#1e293b,stroke:#334155,color:#f1f5f9
    style E fill:#1e293b,stroke:#334155,color:#f1f5f9
    style Me fill:#1e293b,stroke:#334155,color:#f1f5f9
    style N fill:#1e293b,stroke:#334155,color:#f1f5f9
    style C fill:#1e293b,stroke:#334155,color:#f1f5f9
    style Z fill:#1e293b,stroke:#334155,color:#f1f5f9
```

</div>

<div class="stat">30+ minutes every week</div>

Systems don't talk to each other. Students are the glue.

---
layout: image
image: /screenshot-empty.png
backgroundSize: contain
---

# What if it took **one message**?

---
layout: image
image: /screenshot-populated.png
backgroundSize: contain
---

# **30 seconds later**

---

# One message. **Seven autonomous phases.**

```mermaid {scale: 0.55}
graph TD
    Q["'Let's plan my next week'"] --> P1
    P1["1. Fetch lectures<br/><small>TUM Online + iCal</small>"] --> P2
    P2["2. Resolve rooms & add commute<br/><small>NavigaTUM</small>"] --> P3
    P3["3. Scan Moodle — fetch PDFs, summarize<br/><small>Moodle SAML</small>"] --> P4
    P4["4. Triage email into tasks<br/><small>IMAP</small>"] --> P5
    P5["5. Schedule meals by campus<br/><small>eat-api</small>"] --> P6
    P6["6. Scrape club events<br/><small>Web Scraper</small>"] --> P7
    P7["7. Summary + tomorrow's briefing"]
    style Q fill:#3b82f6,stroke:#2563eb,color:#fff
    style P1 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P2 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P3 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P4 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P5 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P6 fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style P7 fill:#22c55e,stroke:#16a34a,color:#fff
```

Each phase hits a **real external system**. No mocks. No pre-seeded data.

---

# It doesn't just fetch data — it **makes decisions**

<div class="three-cols">
<div class="col">

#### Commute

Looked up every room in NavigaTUM, determined which campus each lecture is on, added travel time.

**No one told it to.**

</div>
<div class="col">

#### Mensa

Picked the closest canteen to your actual location that day. Chose a meal based on your preferences.

**Context-aware scheduling.**

</div>
<div class="col">

#### Moodle

Downloaded PDFs from course pages, extracted text, summarized them, linked summaries in your tasks.

**Reads and understands content.**

</div>
</div>

---

# MCP-Powered Agent Architecture

```mermaid {scale: 0.55}
graph LR
    U["User"] <--> FE["React Frontend<br/><small>Real-time SSE</small>"]
    FE <--> BE["Express Backend"]
    BE <--> AG["OpenCode Agent"]
    BE <--> DB[("SQLite")]
    AG <--> T1["TUM Online<br/><small>Token / XML</small>"]
    AG <--> T2["Moodle<br/><small>SAML SSO</small>"]
    AG <--> T3["Email<br/><small>IMAP / SMTP</small>"]
    AG <--> T4["eat-api<br/><small>Public</small>"]
    AG <--> T5["NavigaTUM<br/><small>Public</small>"]
    AG <--> T6["MVV<br/><small>Public</small>"]
    AG <--> T7["ASTA Rooms<br/><small>Public</small>"]
    AG <--> T8["Web Scraper<br/><small>Cheerio</small>"]
    style U fill:#3b82f6,stroke:#2563eb,color:#fff
    style FE fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style BE fill:#1e293b,stroke:#3b82f6,color:#f1f5f9
    style AG fill:#7c3aed,stroke:#6d28d9,color:#fff
    style DB fill:#1e293b,stroke:#334155,color:#f1f5f9
    style T1 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T2 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T3 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T4 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T5 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T6 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T7 fill:#0f172a,stroke:#334155,color:#94a3b8
    style T8 fill:#0f172a,stroke:#334155,color:#94a3b8
```

<div class="flex justify-center gap-8 mt-4">
  <div class="text-center"><span class="text-3xl font-bold text-blue-400">15+</span><br/><span class="text-sm opacity-70">MCP Tools</span></div>
  <div class="text-center"><span class="text-3xl font-bold text-blue-400">7</span><br/><span class="text-sm opacity-70">Agent Skills</span></div>
  <div class="text-center"><span class="text-3xl font-bold text-blue-400">8</span><br/><span class="text-sm opacity-70">External Systems</span></div>
</div>

---

# 8 University Systems. **Real APIs. Real Auth.**

| System | Auth | Autonomous Actions |
|--------|------|--------------------|
| **Moodle** | SAML SSO | Fetches assignments, **downloads PDFs, extracts text, summarizes** |
| **TUM Online** | Token | Pulls lectures, syncs courses, fetches grades |
| **NavigaTUM** | Public | Resolves room codes → campus, **auto-generates commute blocks** |
| **Email** | IMAP/SMTP | Reads inbox, **triages into actionable tasks with deadlines** |
| **Mensa** | Public | Fetches menus, **picks closest canteen by schedule context** |
| **MVV** | Public | Live departures, **calculates when to leave** |
| **Clubs** | Web scrape | Extracts events from **arbitrary club websites** |
| **Study Rooms** | ASTA API | **Real-time availability** across campuses |
