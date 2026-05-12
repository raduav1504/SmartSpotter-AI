# Arhitectura SmartSpotter AI

## Diagrama componentelor

```mermaid
graph TB
    User([Utilizator])

    subgraph Frontend["Frontend (React + TanStack Router)"]
        Auth[Pagina Auth]
        Dashboard[Dashboard]
        Coach["/coach — Agent Antrenor"]
        Nutrition["/nutrition — Agent Macro"]
        Workouts[Jurnal Antrenamente]
        Progress[Grafic Greutate]
        Hydration[Hidratare]
        Badges[Badges]
    end

    subgraph LocalAI["AI Local (Ollama)"]
        Llama3A["Llama3 — Antrenor"]
        Llama3B["Llama3 — Macro"]
    end

    subgraph Supabase["Supabase (Cloud)"]
        DB[(PostgreSQL)]
        AuthSvc[Auth]
    end

    User --> Frontend
    Coach -->|"prompt text"| Llama3A
    Llama3A -->|"plan JSON"| Coach
    Nutrition -->|"descriere masă"| Llama3B
    Llama3B -->|"calorii + macro JSON"| Nutrition
    Frontend <-->|"CRUD"| DB
    Frontend <-->|"login"| AuthSvc
```

## Flow Agent Antrenor
1. Utilizatorul descrie contextul în `/coach`
2. Frontend POST → `localhost:11434/api/generate`
3. Llama3 răspunde cu JSON: `{title, exercises[], notes}`
4. Utilizatorul salvează planul → Supabase

## Flow Agent Nutriție
1. Utilizatorul scrie ce a mâncat în `/nutrition`
2. Frontend POST → `localhost:11434/api/generate`
3. Llama3 extrage: `{calories, protein_g, carbs_g, fat_g}`
4. Datele se salvează → apar în dashboard