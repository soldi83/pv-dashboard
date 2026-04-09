# PV Dashboard

Vite/React-Projekt mit festen Stammdaten und **monatlicher JSON-Datenpflege**.

## Wo du später die Daten pflegst

Die Monatswerte liegen hier:

```text
(https://github.com/soldi83/pv-dashboard-data)
```

Pro Monat pflegst du nur diese Felder:

- `productionKwh`
- `directUseKwh`
- `exportedKwh`
- `gridPurchaseKwh`
- `electricityPrice`
- `feedInTariff`

Monate ohne Werte dürfen `null` bleiben. Die App behandelt diese Monate als 0 und rechnet daraus automatisch die Jahresübersichten und Diagramme.

## Beispiel eines Monatseintrags

```json
{
  "month": "2026-04",
  "productionKwh": 1880.5,
  "directUseKwh": 310.2,
  "exportedKwh": 1180.4,
  "gridPurchaseKwh": 140.8,
  "electricityPrice": 0.3165,
  "feedInTariff": 0.1
}
```

## Lokal starten

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## GitHub + Netlify

1. Projekt in ein GitHub-Repository hochladen
2. In Netlify **Add new project** wählen
3. GitHub verbinden und das Repository auswählen
4. Build command: `npm run build`
5. Publish directory: `dist`

Danach reicht für Updates:

1. `src/data/monthlyData.json` auf GitHub ändern
2. Commit speichern
3. Netlify deployt automatisch neu
