import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatFCFA } from '../../../lib/format.js';
import './GraphiqueEvolution.css';

// Couleurs lues dans index.css (une seule source de vérité)
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

// 250000 → « 250 k », 1200000 → « 1,2 M »
const compact = (n) => (Math.abs(n) >= 1e6 ? `${(n / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} M`
  : Math.abs(n) >= 1000 ? `${Math.round(n / 1000)} k` : String(n));

function Infobulle({ active, payload, label, granularite }) {
  if (!active || !payload?.length) return null;
  const d = new Date(`${label}T00:00:00`);
  const titre = granularite === 'jour'
    ? d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    : d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const ca = payload.find((p) => p.dataKey === 'ca')?.value ?? 0;
  const dep = payload.find((p) => p.dataKey === 'depenses')?.value ?? 0;
  return (
    <div className="graphe__infobulle">
      <strong>{titre}</strong>
      <span><i className="graphe__puce graphe__puce--ca" />Chiffre d’affaires : {formatFCFA(ca)}</span>
      <span><i className="graphe__puce graphe__puce--dep" />Dépenses : {formatFCFA(dep)}</span>
      <span className="graphe__resultat">Résultat : {formatFCFA(ca - dep)}</span>
    </div>
  );
}

// Chiffre d'affaires et dépenses par jour (période courte) ou par mois — un seul axe (FCFA)
export default function GraphiqueEvolution({ serie, granularite }) {
  const etiquette = (v) => {
    const d = new Date(`${v}T00:00:00`);
    return granularite === 'jour' ? String(d.getDate()) : d.toLocaleDateString('fr-FR', { month: 'short' });
  };
  return (
    <div className="graphe">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={serie} barGap={2} barCategoryGap={granularite === 'jour' ? '20%' : '30%'} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid vertical={false} stroke={css('--grille-graphe')} />
          <XAxis dataKey="debut" tickFormatter={etiquette} tickLine={false} axisLine={{ stroke: css('--bordure') }}
            tick={{ fill: css('--texte-doux'), fontSize: 12 }} interval="preserveStartEnd" minTickGap={8} />
          <YAxis tickFormatter={compact} tickLine={false} axisLine={false} width={48}
            tick={{ fill: css('--texte-doux'), fontSize: 12 }} />
          <Tooltip content={<Infobulle granularite={granularite} />} cursor={{ fill: css('--fond') }} />
          <Legend verticalAlign="top" align="right" height={30} iconType="circle" iconSize={9}
            formatter={(v) => <span className="graphe__legende">{v}</span>} />
          <Bar dataKey="ca" name="Chiffre d’affaires" fill={css('--graphe-1')} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="depenses" name="Dépenses" fill={css('--graphe-2')} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
