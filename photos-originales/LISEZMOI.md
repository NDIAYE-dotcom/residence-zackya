# Photos originales de la résidence

Photos en pleine qualité (PNG ~2,3 Mo chacune), **non publiées sur le site**.
Les versions optimisées pour le web sont dans `public/hero/` :

| Original     | Web (ordinateur 1600 px / téléphone 900 px) | Sujet                    |
|--------------|---------------------------------------------|--------------------------|
| zk-img4.png  | hero-1.jpg / hero-1-mobile.jpg              | Façade                   |
| zk-img.png   | hero-2.jpg / hero-2-mobile.jpg              | Salon cuir, mur en pierre |
| zk-img1.png  | hero-3.jpg / hero-3-mobile.jpg              | Cuisine et espace repas  |
| zk-img2.png  | hero-4.jpg / hero-4-mobile.jpg              | Salon, mur en mosaïque   |
| zk-img3.png  | hero-5.jpg / hero-5-mobile.jpg              | Salon, tableaux          |

Pour ajouter une photo au diaporama : la convertir (ex. `sips -s format jpeg -s formatOptions 58 -Z 1600`)
dans `public/hero/`, puis l'ajouter à la liste `DIAPOS` de `src/pages/public/Home/HeroDefilant.jsx`.
