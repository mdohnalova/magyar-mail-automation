# ✉️ Magyar Mail — asistent pro maďarskou e-mailovou komunikaci

AI nástroj pro rychlé vyřizování maďarské zákaznické podpory bez nutnosti kopírovat text do externích překladačů. Centralizuje celý workflow — analýzu, překlad, návrh odpovědi a odeslání — do jednoho rozhraní.

## Hlavní funkce

* **Analýza a kategorizace:** e-mail se automaticky vyhodnotí a zařadí podle tónu (*Formální*, *Urgentní*, *Přátelský*, *Stížnost*).
* **Překlad a shrnutí:** přesný překlad do češtiny + krátké shrnutí hlavních bodů pro rychlou orientaci.
* **Návrh odpovědi ve 4 tónech:** *Formální*, *Přátelský*, *Empatický*, *Asertivní* — jedním kliknutím.
* **Editace a zpětný překlad:** vygenerovanou odpověď lze upravit a nechat přeložit zpět do maďarštiny.
* **Odeslání:** otevření rovnou v e-mailovém klientovi (`mailto:`) nebo zkopírování textu.

## Tech stack

* **Next.js 16 (App Router)** + React 19 + TypeScript
* **Tailwind CSS** + shadcn/ui komponenty
* **Groq** (`llama-3.3-70b-versatile`) — analýza tónu, shrnutí, generování odpovědí
* **DeepL API** — překlad HU ↔ CS
* **Vitest** — testy
* Nasazeno na **Vercelu**

## Živé demo

👉 [magyar-mail-automation.vercel.app](https://magyar-mail-automation.vercel.app)

Demo je chráněné přístupovým kódem a omezené na 3 zpracované e-maily na návštěvníka (aby si ho nikdo neupletl s produkčním nástrojem na vlastní poštu). O přístupový kód napište autorce.

## Lokální spuštění

```bash
npm install
npm run dev
```

Potřebné proměnné prostředí (`.env.local`):

```
GROQ_API_KEY=...
DEEPL_API_KEY=...
ACCESS_CODE=...
```
