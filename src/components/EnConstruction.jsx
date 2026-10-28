export default function EnConstruction({ titre }) {
  return (
    <div style={{ padding: 32, background: 'var(--blanc)', borderRadius: 'var(--radius)', boxShadow: 'var(--ombre)' }}>
      <h2 style={{ marginTop: 0, color: 'var(--bleu)' }}>{titre}</h2>
      <p style={{ color: 'var(--texte-doux)' }}>Module à construire — voir docs/ETAPES.md.</p>
    </div>
  );
}
