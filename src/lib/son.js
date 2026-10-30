// Petit carillon (deux notes) joué sans fichier audio, via Web Audio
let contexte = null;

export function deverrouillerSon() {
  // Les navigateurs n'autorisent le son qu'après un clic : à appeler dans un clic
  contexte = contexte ?? new (window.AudioContext || window.webkitAudioContext)();
  if (contexte.state === 'suspended') contexte.resume();
}

export function jouerCarillon() {
  try {
    deverrouillerSon();
    const debut = contexte.currentTime;
    [[880, 0], [1318.5, 0.16]].forEach(([frequence, decalage]) => {
      const oscillateur = contexte.createOscillator();
      const volume = contexte.createGain();
      oscillateur.type = 'sine';
      oscillateur.frequency.value = frequence;
      volume.gain.setValueAtTime(0.0001, debut + decalage);
      volume.gain.exponentialRampToValueAtTime(0.25, debut + decalage + 0.02);
      volume.gain.exponentialRampToValueAtTime(0.0001, debut + decalage + 0.45);
      oscillateur.connect(volume).connect(contexte.destination);
      oscillateur.start(debut + decalage);
      oscillateur.stop(debut + decalage + 0.5);
    });
  } catch { /* son indisponible : l'alerte visuelle suffit */ }
}
