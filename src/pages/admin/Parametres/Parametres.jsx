import { useSearchParams } from 'react-router-dom';
import ParamResidence from './ParamResidence.jsx';
import ParamCategories from './ParamCategories.jsx';
import Journal from './Journal.jsx';
import './Parametres.css';

const ONGLETS = { residence: 'Résidence', categories: 'Catégories', journal: 'Journal d’activité' };

// Module « Paramètres » (admin)
export default function Parametres() {
  const [params, setParams] = useSearchParams();
  const onglet = ONGLETS[params.get('onglet')] ? params.get('onglet') : 'residence';

  return (
    <div className="param">
      <header className="param__entete">
        <h1>Paramètres</h1>
        <div className="param__onglets" role="tablist" aria-label="Section">
          {Object.entries(ONGLETS).map(([k, v]) => (
            <button key={k} type="button" role="tab" aria-selected={onglet === k}
              className={onglet === k ? 'param__onglet--actif' : ''}
              onClick={() => setParams(k === 'residence' ? {} : { onglet: k }, { replace: true })}>
              {v}
            </button>
          ))}
        </div>
      </header>
      {onglet === 'residence' && <ParamResidence />}
      {onglet === 'categories' && <ParamCategories />}
      {onglet === 'journal' && <Journal />}
    </div>
  );
}
