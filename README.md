# SmartSpotter AI

Aplicație de fitness cu agenți AI locali (Ollama/Llama3).

## Echipa
- Radu Avadanei (252)
- Rares Avadanei (252)
- Bretfelean Rares (344)

## Funcționalități
- Jurnal antrenamente + istoric
- Jurnal alimentar cu estimare AI calorii și macros
- Agent AI Antrenor Personal (Llama3 local)
- Agent AI Estimator Macro (Llama3 local)
- Grafic evoluție greutate
- Urmărire hidratare
- Sistem badges motivaționale

## Cum rulezi local
1. Instalează Ollama: https://ollama.com/download
2. Descarcă modelul: `ollama pull llama3`
3. Pornește Ollama: `OLLAMA_ORIGINS=* ollama serve`
4. Clonează repo-ul: `git clone https://github.com/raduav1504/SmartSpotter-AI`
5. Instalează dependențele: `bun install`
6. Pornește aplicația: `bun run dev`
7. Mergi la: http://localhost:8080

## Tehnologii folosite
- React + TanStack Router
- Supabase (autentificare + bază de date)
- Ollama + Llama3 (agenți AI locali)
- Tailwind CSS + shadcn/ui

## Linkuri
- Backlog: [GitHub Projects](https://github.com/raduav1504/SmartSpotter-AI/projects)
- User Stories: [docs/user-stories.md](docs/user-stories.md)
- Arhitectură: [docs/architecture.md](docs/architecture.md)
- Raport AI: [AI_REPORT.md](AI_REPORT.md)