import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar, ComposedChart } from 'recharts';
import { Coins, Gauge, Home, PiggyBank, Sun, Zap } from 'lucide-react';
import meta from './data/meta.json';
import { loadMonthlyData } from './loadMonthlyData';

const currency = new Intl.NumberFormat('de-CH', { style: 'currency', currency: 'CHF', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('de-CH', { maximumFractionDigits: 2 });
const percent = new Intl.NumberFormat('de-CH', { style: 'percent', maximumFractionDigits: 1 });
const COLORS = { solar: '#f59e0b', ownUse: '#10b981', grid: '#3b82f6', export: '#8b5cf6', money: '#ef4444' };
const MONTH_LABELS = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
const toNumber = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : 0);

function Card({ children, className = '' }) {
  return <section className={`card ${className}`}>{children}</section>;
}

function StatCard({ label, value, color, icon: Icon }) {
  return (
    <Card className={`stat-card stat-${color}`}>
      <div>
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
      <div className="stat-icon-wrap"><Icon size={22} /></div>
    </Card>
  );
}

function TooltipValue({ active, payload, label, suffix = '' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="tooltip-title">{label}</div>
      {payload.map((entry) => (
        <div key={entry.name} className="tooltip-row">
          <span>{entry.name}</span>
          <strong>{number.format(entry.value)}{suffix}</strong>
        </div>
      ))}
    </div>
  );
}

function buildYearlyData(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    const year = Number(row.month.slice(0, 4));

    if (!grouped.has(year)) {
      grouped.set(year, {
        year,
        monthsConfigured: 0,
        monthsWithValues: 0,
        productionKwh: 0,
        selfConsumedKwh: 0,
        exportedKwh: 0,
        gridPurchaseKwh: 0,
        ownUseSavings: 0,
        feedInRevenue: 0,
      });
    }

    const target = grouped.get(year);
    target.monthsConfigured += 1;

    const production = toNumber(row.productionKwh);
    const selfConsumed = toNumber(row.selfConsumedKwh);
    const exported = toNumber(row.exportedKwh);
    const grid = toNumber(row.gridPurchaseKwh);
    const elec = typeof row.electricityPrice === 'number' ? row.electricityPrice : 0;
    const tariff = typeof row.feedInTariff === 'number' ? row.feedInTariff : 0;

    const hasValues = production > 0 || selfConsumed > 0 || exported > 0 || grid > 0;
    if (hasValues) target.monthsWithValues += 1;

    target.productionKwh += production;
    target.selfConsumedKwh += selfConsumed;
    target.exportedKwh += exported;
    target.gridPurchaseKwh += grid;
    target.ownUseSavings += selfConsumed * elec;
    target.feedInRevenue += exported * tariff;
  });

  return Array.from(grouped.values())
    .sort((a, b) => a.year - b.year)
    .map((item) => {
      const pvConsumptionKwh = item.productionKwh - item.exportedKwh;
      const consumptionKwh = item.selfConsumedKwh + item.gridPurchaseKwh;

      return {
        ...item,
        pvConsumptionKwh,
        consumptionKwh,
        annualBenefit: item.ownUseSavings + item.feedInRevenue,
        autarky: consumptionKwh > 0 ? item.selfConsumedKwh / consumptionKwh : null,
        selfConsumptionRate: item.productionKwh > 0 ? item.selfConsumedKwh / item.productionKwh : null,
      };
    });
}

function getHeatColor(value, maxValue) {
  if (!value || value <= 0 || !maxValue) return '#fff7ed';
  const ratio = Math.min(value / maxValue, 1);
  const lightness = 96 - ratio * 42;
  return `hsl(36 100% ${lightness}%)`;
}

function getHeatTextColor(value, maxValue) {
  if (!value || value <= 0 || !maxValue) return '#94a3b8';
  return value / maxValue > 0.58 ? '#7c2d12' : '#9a3412';
}

export default function App() {
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMonthlyData()
      .then((data) => setMonthlyData(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || 'Unbekannter Fehler'))
      .finally(() => setLoading(false));
  }, []);

  const yearlyData = useMemo(() => buildYearlyData(monthlyData), [monthlyData]);

  const totals = useMemo(() => {
    const base = yearlyData.reduce(
      (acc, row) => {
        acc.productionKwh += row.productionKwh;
        acc.selfConsumedKwh += row.selfConsumedKwh;
        acc.exportedKwh += row.exportedKwh;
        acc.gridPurchaseKwh += row.gridPurchaseKwh;
        acc.ownUseSavings += row.ownUseSavings;
        acc.feedInRevenue += row.feedInRevenue;
        acc.annualBenefit += row.annualBenefit;
        return acc;
      },
      { productionKwh: 0, selfConsumedKwh: 0, exportedKwh: 0, gridPurchaseKwh: 0, ownUseSavings: 0, feedInRevenue: 0, annualBenefit: 0 }
    );

    const consumptionKwh = base.selfConsumedKwh + base.gridPurchaseKwh;

    return {
      ...base,
      pvConsumptionKwh: base.productionKwh - base.exportedKwh,
      consumptionKwh,
      autarky: consumptionKwh > 0 ? base.selfConsumedKwh / consumptionKwh : null,
      selfConsumptionRate: base.productionKwh > 0 ? base.selfConsumedKwh / base.productionKwh : null,
      paybackYears: base.annualBenefit > 0 ? meta.netInvestment / base.annualBenefit : null,
    };
  }, [yearlyData]);

  const latestConfiguredMonth = useMemo(() => {
    const withValues = monthlyData.filter((row) =>
      [row.productionKwh, row.selfConsumedKwh, row.exportedKwh, row.gridPurchaseKwh].some(
        (v) => typeof v === 'number' && v > 0
      )
    );
    return withValues.length ? withValues[withValues.length - 1].month : '–';
  }, [monthlyData]);

  const kpis = [
    { label: 'Netto-Investition', value: currency.format(meta.netInvestment), icon: PiggyBank, color: 'rose' },
    { label: 'Ertrag bisher', value: currency.format(totals.annualBenefit), icon: Coins, color: 'amber' },
    { label: 'Autarkie', value: totals.autarky == null ? '–' : percent.format(totals.autarky), icon: Home, color: 'sky' },
    { label: 'Eigenverbrauchsquote', value: totals.selfConsumptionRate == null ? '–' : percent.format(totals.selfConsumptionRate), icon: Sun, color: 'violet' },
    { label: 'Produktion gesamt', value: `${number.format(totals.productionKwh)} kWh`, icon: Zap, color: 'emerald' },
    { label: 'Statische Amortisation', value: totals.paybackYears ? `${number.format(totals.paybackYears)} Jahre` : '–', icon: Gauge, color: 'orange' },
  ];

  const yearlyEnergyChart = yearlyData.map((row) => ({
    year: String(row.year),
    Erzeugung: row.productionKwh,
    'PV Verbrauch': row.pvConsumptionKwh,
    Einspeisung: row.exportedKwh,
    Netzbezug: row.gridPurchaseKwh,
  }));

  let cumulative = 0;
  const cumulativeSeries = yearlyData
    .filter((row) => row.monthsWithValues > 0)
    .map((row) => {
      cumulative += row.annualBenefit;
      return {
        year: String(row.year),
        'Netto-Ersparnis': row.annualBenefit,
        Kumuliert: cumulative,
      };
    });

  const maxMonthlyProduction = useMemo(
    () => monthlyData.reduce((max, row) => Math.max(max, toNumber(row.productionKwh)), 0),
    [monthlyData]
  );

  const monthlyProductionRows = useMemo(() => {
    const grouped = new Map();

    monthlyData.forEach((row) => {
      const year = row.month.slice(0, 4);
      const monthIndex = Number(row.month.slice(5, 7)) - 1;

      if (!grouped.has(year)) {
        grouped.set(year, {
          year,
          months: Array.from({ length: 12 }, (_, idx) => ({
            label: MONTH_LABELS[idx],
            value: null,
            hasValue: false,
          })),
        });
      }

      const value = typeof row.productionKwh === 'number' ? row.productionKwh : null;

      grouped.get(year).months[monthIndex] = {
        label: MONTH_LABELS[monthIndex],
        value,
        hasValue: value !== null && value > 0,
      };
    });

    return Array.from(grouped.values()).sort((a, b) => Number(a.year) - Number(b.year));
  }, [monthlyData]);

  if (loading) {
    return <div className="app-shell"><div className="hero"><h1>Lade Daten…</h1></div></div>;
  }

  if (error) {
    return <div className="app-shell"><div className="hero"><h1>Fehler beim Laden</h1><div className="hero-note">{error}</div></div></div>;
  }

  return (
    <div className="app-shell">
      <div className="hero">
        <div>
          <h1>{meta.title}</h1>
        </div>
        <div className="hero-panel">
          <div className="hero-label">Anlage seit</div>
          <div className="hero-value">{meta.start}</div>
          <div className="hero-sub">{meta.location}</div>
          <div className="hero-note">Letzter befüllter Monat: {latestConfiguredMonth}</div>
        </div>
      </div>

      <div className="meta-grid">
        <Card><div className="meta-label">Anlagengrösse</div><div className="meta-value">{number.format(meta.plantSizeKwp)} kWp</div></Card>
        <Card><div className="meta-label">Speichergrösse</div><div className="meta-value">{number.format(meta.batterySizeKwh)} kWh</div></Card>
        <Card><div className="meta-label">Netto-Investition</div><div className="meta-value">{currency.format(meta.netInvestment)}</div></Card>
        <Card><div className="meta-label">Datenstand</div><div className="meta-value meta-small">Monatlich gepflegt</div></Card>
        <Card><div className="meta-label">Zeitraum</div><div className="meta-value">2025–2030</div></Card>
      </div>

      <div className="kpi-grid">
        {kpis.map((item) => <StatCard key={item.label} {...item} />)}
      </div>

      <div className="dashboard-grid">
        <Card className="chart-card span-2">
          <div className="section-head"><div><h2>Energieflüsse pro Jahr</h2></div></div>
          <div className="chart-wrap large">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={yearlyEnergyChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip content={<TooltipValue suffix=" kWh" />} />
                <Legend />
                <Bar dataKey="Erzeugung" fill={COLORS.solar} radius={[8, 8, 0, 0]} />
                <Bar dataKey="PV Verbrauch" fill={COLORS.ownUse} radius={[8, 8, 0, 0]} />
                <Bar dataKey="Einspeisung" fill={COLORS.export} radius={[8, 8, 0, 0]} />
                <Bar dataKey="Netzbezug" fill={COLORS.grid} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="chart-card span-2">
          <div className="section-head"><div><h2>Netto-Ersparnis</h2></div></div>
          <div className="chart-wrap large">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={cumulativeSeries}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="year" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip content={<TooltipValue suffix=" CHF" />} />
                <Legend />
                <Bar dataKey="Netto-Ersparnis" fill={COLORS.solar} radius={[8, 8, 0, 0]} />
                <Line type="monotone" dataKey="Kumuliert" stroke={COLORS.ownUse} strokeWidth={3} dot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="chart-card">
          <div className="section-head"><div><h2>Pflegestatus je Jahr</h2></div></div>
          <div className="year-list">
            {yearlyData.map((row) => (
              <div key={row.year} className={`year-row ${row.monthsWithValues === 0 ? 'year-row-empty' : ''}`}>
                <div>
                  <div className="year-title">{row.year}</div>
                  <div className="year-sub">{row.monthsWithValues > 0 ? `${row.monthsWithValues} von ${row.monthsConfigured} Monaten gepflegt` : 'Noch keine Werte gepflegt'}</div>
                </div>
                <div className="year-metrics">
                  <span>{row.autarky == null ? 'Autarkie –' : `Autarkie ${percent.format(row.autarky)}`}</span>
                  <span>{row.selfConsumptionRate == null ? 'EV –' : `EV ${percent.format(row.selfConsumptionRate)}`}</span>
                  <strong>{row.annualBenefit > 0 ? currency.format(row.annualBenefit) : '–'}</strong>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="heatmap-card">
        <div className="section-head"><div><h2>PV Produktion pro Monat</h2></div></div>
        <div className="heatmap-wrap">
          <table className="heatmap-table">
            <thead>
              <tr>
                <th>Jahr</th>
                {MONTH_LABELS.map((month) => <th key={month}>{month}</th>)}
              </tr>
            </thead>
            <tbody>
              {monthlyProductionRows.map((row) => (
                <tr key={row.year}>
                  <td className="heatmap-year">{row.year}</td>
                  {row.months.map((month) => (
                    <td
                      key={`${row.year}-${month.label}`}
                      className={`heatmap-cell ${month.hasValue ? 'heatmap-cell-filled' : 'heatmap-cell-empty'}`}
                      style={{ backgroundColor: getHeatColor(month.value, maxMonthlyProduction), color: getHeatTextColor(month.value, maxMonthlyProduction) }}
                    >
                      {month.value != null && month.value > 0 ? number.format(month.value) : '–'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="footer-card">
        <div className="table-wrap">
          <table className="year-table">
            <thead>
              <tr>
                <th>Jahr</th>
                <th>Produktion</th>
                <th>PV Verbrauch</th>
                <th>Eigenverbrauch</th>
                <th>Einspeisung</th>
                <th>Netzbezug</th>
                <th>Autarkie</th>
                <th>Eigenverbrauchsquote</th>
                <th>Ersparnis EV</th>
                <th>Einspeiseertrag</th>
                <th>Total Ertrag</th>
              </tr>
            </thead>
            <tbody>
              {yearlyData.map((row) => (
                <tr key={row.year} className={row.monthsWithValues === 0 ? 'empty-row' : ''}>
                  <td className="col-year">{row.year}</td>
                  <td>{number.format(row.productionKwh)} kWh</td>
                  <td>{number.format(row.pvConsumptionKwh)} kWh</td>
                  <td>{number.format(row.selfConsumedKwh)} kWh</td>
                  <td>{number.format(row.exportedKwh)} kWh</td>
                  <td>{number.format(row.gridPurchaseKwh)} kWh</td>
                  <td>{row.autarky == null ? '–' : percent.format(row.autarky)}</td>
                  <td>{row.selfConsumptionRate == null ? '–' : percent.format(row.selfConsumptionRate)}</td>
                  <td>{row.ownUseSavings > 0 ? currency.format(row.ownUseSavings) : '–'}</td>
                  <td>{row.feedInRevenue > 0 ? currency.format(row.feedInRevenue) : '–'}</td>
                  <td className="col-total">{row.annualBenefit > 0 ? currency.format(row.annualBenefit) : '–'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
