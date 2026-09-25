# Quanta aigua tindrem? — Nit del CEAB 2026

**How much water will we have?** Public-engagement materials from the NEREIDA project for the
2026 Researchers' Night at the Centre d'Estudis Avançats de Blanes (CEAB-CSIC).

🔗 **Live:** https://nereidaca.github.io/NitRecerca2026_CEAB/

---

## The event

**La Nit del CEAB** is our centre's contribution to **La Nit de la Recerca / European
Researchers' Night**, the Europe-wide evening when research institutes open their doors to
whoever wants to walk in. It is deliberately informal, in the spirit of **Pint of Science**:
no lecture hall, no registration fee, no assumed background. Researchers stand next to their
own work and talk to their neighbours about it.

|  |  |
|---|---|
| **When** | Friday 25 September 2026, 19:00–21:00 |
| **Where** | CEAB-CSIC, C/ d'Accés a la Cala Sant Francesc 14, Blanes (Girona) |
| **Theme** | *El coneixement al servei de la natura* — conservation and restoration of the natural environment |
| **Format** | A short opening in the auditorium, then stands on the terrace where visitors meet the researchers |
| **Audience** | General public, mostly local, all ages. Free entry |
| **Language** | Catalan, the language of the town and of the visitors |

The point of the evening is **local impact**. Sau and Susqueda are the reservoirs that supply
the region the audience lives in, and most of them lived through the 2021–2024 drought and the
emergency restrictions that came with it. This is research about their own tap and their own
river, so the materials here are built around that, not around a generic "science is
interesting" pitch.

---

## What is in this repository

Two pieces, aimed at the same audience from opposite directions.

### 1. An interactive decision game (the live page)

Rather than explain what a seasonal forecast is, we let visitors **use one**. The screen puts
them in the chair of the water manager in **October 2022**, one year into the drought, with the
Sau–Susqueda system at about a third of capacity.

- They make **two allocation decisions** — the first covering October 2022 to March 2023, the
  second April to September 2023 — splitting the available water between **urban supply** (*abastament*),
  **irrigation** (*reg*) and the **environmental flow** left for the river (*cabal ecològic*).
- Each decision is run through the **same 51-member seasonal climate ensemble** the operational
  NEREIDA system uses, so the outcome is a spread of possible futures rather than a single
  number. This is the part visitors tend to find surprising: you cannot be told what will
  happen, only how the odds shift.
- The result is compared against **what the Catalan Water Agency (ACA) actually decided**, and
  then against **what actually happened**: the system bottomed out at **12.6 % on 8 March 2024**,
  with the drought emergency declared on **1 February 2024**.
- A short feedback question at the end, and a local admin view that exports participant
  responses as CSV.

It runs **fully standalone in a single HTML file** — the climate data, the simulation engine and
the interface are all embedded. No server, no runtime fetch, no network. That is a hard
requirement for an unattended kiosk on a terrace in the evening.

### 2. An A1 poster

A printed A1 (594 × 841 mm) poster for the same stand, for visitors who would rather read than
click, and as the thing the researcher gestures at while talking. It covers:

- **The Ter basin**, from the headwaters to the sea, with Sau and Susqueda in series.
- **Why a reservoir is not a pond** — the modelled summer/winter temperature profile at
  Susqueda: about **5 °C** between the surface and 49 m down in August, collapsing to a
  uniform **6 °C** when the water column mixes in February.
- **A real forecast**, issued with August 2026 data and running to February 2027, including the
  tercile probabilities and an explicit statement of what the bars do and do not mean.
- **What we cannot predict.** Reservoir volume forecasts verify well; water temperature does
  not yet beat climatology. The poster says so. Telling people where a forecast should *not* be
  trusted turned out to be one of the better conversation openers.

---

## The science behind it

Both pieces come from **NEREIDA**, an operational seasonal forecasting system for Catalan
water bodies run at CEAB-CSIC.

Once a month the pipeline takes the **ECMWF SEAS5.1 seasonal ensemble** (51 members, from the
Copernicus Climate Data Store), bias-adjusts it against ERA5, drives a catchment hydrological
model for the Ter and Tordera basins, and then drives a **GLM 3.1.1 + AED2** reservoir model for
Sau and Susqueda. It produces 1–7 month-ahead forecasts of:

- **Quantity** — combined system storage, and inflows at six river gauges
- **Quality** — outlet-gate temperature at seven gates across the two reservoirs, river
  temperature, water residence time, and saline-intrusion probability at 52 coastal wells

Every forecast is published together with its verified skill, scored against a 31-year hindcast.
Sites that fail the skill criterion (**NSE > 0 and CRPSS ≥ 0.1**) are published as low- or
no-skill rather than quietly dropped.

The operational viewers are public and update monthly:

- **Seasonal forecast viewer** — https://nereidaca.github.io/hydro_tool/
- **Saline intrusion viewer** — https://nereidaca.github.io/salintrusion_tool/

---

## Repository layout

```
.
├── index.html              # the live page: standalone, everything inlined
├── NitCEAB2026_poster_A1.pdf   # the printed A1 poster
└── build/
    ├── extract_data.py     # pulls the two forecast windows out of the NEREIDA archive
    ├── story_data.json     # the resulting embedded dataset (inflow ensembles, real plan, outcomes)
    ├── engine.js           # Sau+Susqueda water-balance simulation
    ├── app.js              # interface, screen flow, participant logging
    ├── template.html       # page shell with /*__DATA__*/ /*__ENGINE__*/ /*__APP__*/ slots
    ├── build_html.py       # substitutes the three into the template -> index.html
    └── qa/                 # walkthrough and screenshots used for checking before the event
```

### Rebuilding

```bash
python3 build/extract_data.py     # only if regenerating from the NEREIDA archive
python3 build/build_html.py       # writes index.html
```

`extract_data.py` reads from a local NEREIDA working copy and is included for provenance rather
than for portability. `build_html.py` needs nothing but the files in `build/`.

---

## Notes on the data

Being explicit about this, since the page is a public-facing simplification of real model output.

**The inflow ensembles are real** SEAS5-driven forecasts for those two windows, taken from the
NEREIDA archive — not synthetic, not tuned to make a point.

**They are bias-corrected for the game.** Every member is scaled by a single ratio so that the
ensemble mean matches the observed inflow for those (now historical) months. Without it, one
instance of the raw seasonal forecast running roughly 3× too wet in one window and about 2× too
dry in the other would have swamped the visitor's own decisions — the screen would be showing an
accident of that particular forecast rather than the consequences of the choices being made.
The same ratio is applied to every member, so the 51-member spread is preserved.

**The water-balance engine mirrors the operational R code** (`run_seasonal_hydro.R` /
`functions.R`), so a visitor's trajectory is computed the same way the real forecasts are.

**The real plan and the real outcome are hardcoded** from the verified bias-correction archive
and checked against the observed reservoir balance, rather than re-derived in the browser.

The system's maximum capacity is taken as **398.26 hm³** (Sau 165.26 + Susqueda 233).

---

## Credits

**Daniel Mercado-Bettín** · **Jordi Pagès** · **Rafael Marcé**
Centre d'Estudis Avançats de Blanes (CEAB-CSIC), Blanes, Catalonia, Spain
📧 daniel.mercado@csic.es

Thanks to the CEAB outreach team for the review pass on the Catalan text, which made it
considerably more readable for a non-specialist audience than what we started with.

## Funding

This research is part of the **NEREIDA** project, grant `RDI001/24/000044`, funded by the
**Agència Catalana de l'Aigua (ACA)** under the R+D+I call `ACC/1362/2024`.

La Nit del CEAB is held within the framework of La Nit de la Recerca. The **NitRecerCat2627**
project is an event associated with the European Union's **MSCA and Citizens** initiative,
funded under the Marie Skłodowska-Curie Actions (`HORIZON-MSCA-2025-CITIZENS-01`).
