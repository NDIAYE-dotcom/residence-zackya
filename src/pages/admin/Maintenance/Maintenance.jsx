import { useSearchParams } from 'react-router-dom';
import Pannes from './Pannes.jsx';
import Inventaire from './Inventaire.jsx';
import './Maintenance.css';

// Module « Maintenance & inventaire » (tout le personnel) : deux onglets
export default function Maintenance() {
  const [params, setParams] = useSearchParams();
  const onglet = params.get('onglet') === 'inventaire' ? 'inventaire' : 'pannes';

  return (
    <div className="maint">
      <header className="maint__entete">
        <h1>Maintenance</h1>
        <div className="maint__onglets" role="tablist" aria-label="Section">
          <button type="button" role="tab" aria-selected={onglet === 'pannes'} className={onglet === 'pannes' ? 'maint__onglet--actif' : ''}
            onClick={() => setParams({}, { replace: true })}>Pannes</button>
          <button type="button" role="tab" aria-selected={onglet === 'inventaire'} className={onglet === 'inventaire' ? 'maint__onglet--actif' : ''}
            onClick={() => setParams({ onglet: 'inventaire' }, { replace: true })}>Inventaire</button>
        </div>
      </header>
      {onglet === 'pannes' ? <Pannes /> : <Inventaire />}
    </div>
  );
}
