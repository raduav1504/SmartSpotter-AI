# Evaluare Agenti AI

## Agent Antrenor (Gemini 2.5 Flash)

### Teste efectuate

| Input | Output asteptat | Rezultat |
|-------|----------------|----------|
| "vreau sa fac piept si triceps, am 40 min" | JSON valid cu exercitii pentru piept/triceps | PASS |
| "ma doare genunchiul, vreau sa fac un full body workout" | Plan fara exercitii care implica strain pe genunchi| PASS |
| "sunt incepator, nu stiu ce sa fac" | Plan cu greutati mici si explicatii clare | PASS |
| Input gol / caractere random | Un workout classic, pentru oricine | Agentul interpreteaza input-ul ambiguu si genereaza un plan generic full-body — comportament acceptabil |

### Criterii de calitate
- JSON-ul returnat respecta structura `{title, duration_min, notes, exercises[]}`
- Greutatile sugerate sunt proportionale cu greutatea utilizatorului din profil
- Obiectivul utilizatorului (slabire/masa) influenteaza numarul de repetari si pauzele

---

## Agent Nutritie (Gemini 2.5 Flash)

### Teste efectuate

| Input | Output asteptat | Verificare Atwater |
|-------|----------------|-------------------|
| "o banana" | ~90 kcal, ~1g P, ~23g C, ~0g G | 1*4 + 23*4 + 0*9 = 96 ≈ PASS |
| "o saorma mica" | ~500-600 kcal | valori realiste PASS |
| "100g piept de pui fiert" | ~165 kcal, ~31g P, ~0g C, ~3.6g G | 31*4 + 0*4 + 3.6*9 ≈ 156 PASS |
| "nimic, caractere random" / input gol | 0 cal,0 P, 0 C, 0 G | PASS |

### Criterii de calitate
- Caloriile respecta formula Atwater: calories = protein_g*4 + carbs_g*4 + fat_g*9
- Portiile implicite sunt realiste
- JSON-ul returnat respecta structura `{calories, protein_g, carbs_g, fat_g}`

---

## Concluzie

Ambii agenti au trecut testele de baza. Principala limitare este ca Gemini poate halucina
valori nutritionale pentru alimente foarte specifice sau retete complexe. Formula Atwater
este respectata deoarece este inclusa explicit in prompt.