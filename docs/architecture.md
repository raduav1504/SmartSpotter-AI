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
        Badges[Badges]
    end

    subgraph GeminiCloud["AI Cloud (Google Gemini 2.5 Flash)"]
        GeminiA["Gemini — Agent Antrenor"]
        GeminiB["Gemini — Agent Macro"]
    end

    subgraph Supabase["Supabase (Cloud)"]
        DB[(PostgreSQL)]
        AuthSvc[Auth]
    end

    User --> Frontend
    Coach -->|"prompt + profil utilizator"| GeminiA
    GeminiA -->|"plan JSON"| Coach
    Nutrition -->|"descriere masa"| GeminiB
    GeminiB -->|"calorii + macro JSON"| Nutrition
    Frontend <-->|"CRUD"| DB
    Frontend <-->|"login"| AuthSvc
```

## Flow Agent Antrenor
1. Utilizatorul descrie contextul in `/coach`
2. Frontend POST → `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash`
3. Promptul include profilul complet al utilizatorului (varsta, greutate, obiectiv, nivel activitate)
4. Gemini raspunde cu JSON: `{title, duration_min, notes, exercises[]}`
5. Utilizatorul salveaza planul → Supabase

## Flow Agent Nutritie
1. Utilizatorul scrie ce a mancat in `/nutrition`
2. Frontend POST → `generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash`
3. Promptul cere respectarea formulei Atwater: calories = protein_g*4 + carbs_g*4 + fat_g*9
4. Gemini extrage: `{calories, protein_g, carbs_g, fat_g}`
5. Datele se salveaza → apar in dashboard