# TERRAPULSE

**Listen to Earth. Understand Change. Predict Tomorrow.**

Projet de l'équipe **Kivu EarthLab** (Bukavu, RDC) pour le **NASA Space Apps Challenge 2026**.

TerraPulse transforme des données d'observation de la Terre de la NASA en informations utiles pour prévenir les glissements de terrain et l'érosion des sols à Bukavu. C'est un outil de **prévention saisonnière** : il aide à savoir quels mois des prochains trimestres méritent une vigilance, pas à donner l'alerte en temps réel.

---

## Quel fichier ouvrir ?

Le fichier **`index.html`** est l'application : il s'ouvre directement dans un navigateur et sert aussi de page d'accueil si le dossier est publié sur GitHub Pages.

Pour lancer TerraPulse :

1. Double-cliquez sur **`index.html`** : il s'ouvre dans votre navigateur.
2. Laissez `terrapulse_data.js` dans le même dossier : c'est lui qui contient les données.
3. Gardez une connexion internet, pour le fond de carte et les bibliothèques d'affichage.

Il n'y a rien à installer ni à démarrer. Le script Python `telecharger_donnees_nasa.py` ne sert qu'à **mettre à jour les données** ; l'application fonctionne sans le relancer.

> **English quick start.** Open `index.html` in a browser (keep `terrapulse_data.js` next to it) and click **EN** in the top-right corner. To refresh the NASA data, run `python telecharger_donnees_nasa.py`.

---

## 1. Ce que fait le projet, en bref

1. Un script Python télécharge trois variables réelles pour Bukavu, de 2021 à 2025 : la pluie, l'humidité du sol et l'état de la végétation (NDVI).
2. Une page web affiche l'évolution de ces trois variables, au pas de temps choisi (jour, semaine, mois ou année).
3. Sous chaque graphique, la page explique ce que montre la courbe et ce que cela implique pour les versants de Bukavu.
4. Un modèle statistique apprend le cycle des saisons sur l'historique et prévoit les 3, 6 ou 12 mois suivants, avec une marge d'incertitude.
5. La page en tire un diagnostic de risque (glissement de terrain, érosion) mois par mois.
6. Une carte montre où se trouvent les versants les plus vulnérables, à partir de la pente du terrain et de l'état de la végétation, avec une comparaison de Kadutu, Ibanda et Bagira.
7. Les séries et les prévisions peuvent être exportées en CSV ou en JSON, avec les sources citées.

La prévision dit **quand** être vigilant, la carte dit **où** regarder en premier.

Les quatre piliers du projet correspondent ainsi à :

| Pilier | Où il se trouve aujourd'hui |
| --- | --- |
| **DETECT** | Téléchargement des trois variables NASA (`telecharger_donnees_nasa.py`) |
| **ANALYZE** | Graphiques, agrégation temporelle et interprétations de la page web |
| **PREDICT** | Modèle saisonnier, intervalles à 80 % et diagnostic de risque |
| **LOCATE** | Carte des versants vulnérables et comparaison des communes |

---

## 2. Les fichiers du dossier

| Fichier | Rôle |
| --- | --- |
| `index.html` | **L'application, fichier principal.** À ouvrir dans un navigateur. |
| `terrapulse_data.js` | Les données NASA lues par l'application. Généré par le script, ne pas modifier à la main. |
| `telecharger_donnees_nasa.py` | Le script qui télécharge les données NASA et produit les fichiers ci-dessous. |
| `bukavu_terrapulse_nasa_2021_2025.csv` | Données mensuelles (pluie, humidité, NDVI). |
| `bukavu_terrapulse_nasa_journalier_2021_2025.csv` | Pluie et humidité du sol, jour par jour. |
| `bukavu_terrapulse_nasa_ndvi_16j_2021_2025.csv` | NDVI, une valeur tous les 16 jours. |
| `cache_modis/` | Réponses brutes du serveur MODIS, conservées pour ne pas tout retélécharger. |
| `cache_carte/` | Relief SRTM (15 Mo), grille des cellules et limites des communes, conservés de la même façon. |
| `TerraPulse.ipynb` | Ancien notebook Colab. Sa seconde cellule fabriquait des données **simulées** : ne plus l'utiliser comme source. |
| `gemini-code-*.md` | Feuille de route du projet. |

---

## 3. Comment l'utiliser

### Ouvrir l'application

Double-cliquez sur `index.html` (voir « Quel fichier ouvrir ? » en haut de ce document). Il faut que `terrapulse_data.js` soit dans le même dossier, et une connexion internet pour charger les bibliothèques d'affichage (Tailwind CSS, Chart.js, Leaflet) et le fond de carte OpenStreetMap.

### Mettre à jour les données

```
python telecharger_donnees_nasa.py
```

- Aucune bibliothèque à installer : le script n'utilise que Python standard (version 3.8 ou plus).
- Aucun compte ni clé : les deux services NASA utilisés sont publics.
- Le premier téléchargement prend 5 à 15 minutes, car le serveur MODIS est lent et renvoie parfois des erreurs passagères. Le script réessaie tout seul.
- Si le script s'arrête sur une erreur réseau, relancez-le : il reprend là où il s'était arrêté grâce aux dossiers `cache_modis/` et `cache_carte/`. Une fois tout en cache, une relance prend quelques secondes.
- Si seules les données de la carte échouent, le script le signale et produit quand même le reste : l'application s'ouvre alors sans carte.
- Pour changer la période ou la zone, modifiez les paramètres en haut du script (`DEBUT`, `FIN`, `LAT`, `LON`, `KM_AUTOUR`, `COMMUNES`). Supprimez les deux dossiers de cache si vous changez la zone.

---

## 4. D'où viennent les données

| Variable | Source | Résolution | Ce que c'est exactement |
| --- | --- | --- | --- |
| Précipitations (mm) | NASA POWER, paramètre `PRECTOTCORR` | Journalière, maille d'environ 50 km | Pluie issue de la réanalyse MERRA-2 de la NASA, corrigée |
| Humidité du sol (%) | NASA POWER, paramètre `GWETTOP` | Journalière, maille d'environ 50 km | Taux de saturation de la couche superficielle du sol, calculé par le modèle MERRA-2 |
| Végétation (NDVI) | NASA MODIS/Terra, produit `MOD13Q1` v6.1, via ORNL DAAC | 250 m, tous les 16 jours | Indice de végétation mesuré par satellite |
| Relief et pente (carte) | NASA SRTM, 1 arc-seconde, tuiles HGT des Terrain Tiles Mapzen / AWS Open Data | Environ 30 m | Altitude mesurée par radar depuis la navette spatiale en 2000 |
| Limites des communes (carte) | OpenStreetMap, via Nominatim | — | Contours administratifs de Kadutu, Ibanda et Bagira. Ce n'est pas une donnée NASA. |

Points de coordonnées : centre de Bukavu (latitude −2,51, longitude 28,85).

### Traitement du NDVI

Le script récupère tous les pixels dans un carré de 10 km de côté autour de Bukavu, puis :

- écarte les pixels nuageux ou douteux, grâce à la bande de fiabilité fournie avec le produit ;
- écarte les pixels du lac Kivu (ceux dont le NDVI médian est inférieur à 0,10) ;
- fait la moyenne des pixels restants pour chaque date ;
- ignore une date si moins de 10 % de la zone terrestre a pu être observée.

### Ce qu'il faut savoir sur ces sources

- **Pluie et humidité ne sont pas des mesures directes au sol.** Ce sont des sorties d'un modèle atmosphérique de la NASA qui assimile des observations. Elles décrivent bien les saisons et les anomalies régionales, mais pas un orage localisé sur un quartier.
- **L'humidité n'est pas celle du satellite SMAP**, contrairement à ce que prévoyait le cahier des charges. SMAP demande un compte NASA Earthdata ; c'est une amélioration possible.
- **La maille de 50 km couvre bien plus que la ville.** Une seule valeur représente Bukavu et toute sa région.
- **Le NDVI mélange ville, cultures et collines boisées.** C'est une moyenne de zone, pas l'état d'un versant.

---

## 5. Comment fonctionne l'application

### Les langues : français et anglais

Deux boutons **FR** et **EN**, en haut à droite, traduisent toute la page : titres, filtres, légendes des graphiques, interprétations, diagnostic, tableaux, carte et sources. Les nombres suivent aussi la langue (virgule décimale en français, point en anglais).

- Au premier lancement, la page choisit la langue du navigateur : français si le navigateur est en français, anglais sinon.
- Le choix est mémorisé pour les ouvertures suivantes.
- Pour forcer une langue dans un lien, ajoutez `#en` ou `#fr` à la fin de l'adresse du fichier.

Trois éléments ne changent pas avec le bouton :

- **Les sélecteurs de date et le bouton « Choisir un fichier »** sont dessinés par le navigateur, dans sa propre langue.
- **Les noms de colonnes des fichiers exportés** restent identiques dans les deux langues, pour que les fichiers gardent toujours la même structure. Les lignes de commentaire et les niveaux de risque, eux, sont traduits.
- **Le script Python** affiche ses messages en français.

Pour ajouter une langue (par exemple le swahili), il suffit de copier le bloc `en` du dictionnaire `I18N` au début du script de la page, de le traduire, et d'ajouter un bouton portant `data-lang`.

### Les filtres

Une ligne de filtres en haut de page pilote tout le reste :

- **Dates de début et de fin** : la période analysée. Le modèle apprend aussi sur cette période.
- **Pas de temps** : jour, semaine, mois ou année. La pluie est additionnée, l'humidité et le NDVI sont moyennés.
- **Horizon de prévision** : 3, 6 ou 12 mois.

### Les trois graphiques

Chaque variable a son graphique, avec sa propre échelle :

- trait plein ou barres : les valeurs observées ;
- pointillés : la prévision (valeur centrale) ;
- bande colorée : l'intervalle à 80 % autour de la prévision ;
- ligne grise en pointillés fins : le seuil critique.

Les prévisions étant mensuelles, elles ne s'affichent sur les graphiques qu'au pas « Par mois ». Elles restent visibles dans le tableau à tout moment.

### Les interprétations

Sous chaque graphique, deux paragraphes sont recalculés à chaque changement de filtre :

- **Lecture de la courbe** : moyenne, maximum, minimum, nombre de mois au-delà du seuil, et tendance de fond avec sa marge d'erreur.
- **Impact pour le Kivu** : ce que cela signifie pour le ruissellement, la saturation des sols ou la tenue des versants.

### Le modèle de prévision

Pour chaque variable, le modèle estime par moindres carrés :

- une **valeur typique pour chaque mois de l'année** (le cycle des saisons) ;
- une **tendance linéaire** de fond.

Deux précautions sont intégrées :

- **La tendance n'est utilisée dans la prévision que si elle est statistiquement nette** (plus de deux fois son erreur standard). Avec cinq ans de données, prolonger une pente incertaine donnerait des prévisions fausses.
- **Il faut au moins 24 mois complets** dans la période choisie, sinon l'application refuse de prévoir et le dit.

L'intervalle à 80 % vient de la dispersion des écarts entre le modèle et l'historique : huit fois sur dix, la valeur réelle devrait tomber dans la bande, si l'avenir ressemble au passé.

### Les seuils et le diagnostic de risque

| Seuil | Valeur par défaut | Origine |
| --- | --- | --- |
| Pluie mensuelle | plus de 150 mm | Cahier des charges |
| Humidité du sol | plus du 80e centile des mois observés | Calibré sur les données (voir ci-dessous) |
| NDVI | moins de 0,40 | Cahier des charges |

Le cahier des charges fixait l'humidité critique à 75 %. Ce seuil ne convient pas à la mesure MERRA-2 : elle le dépasse presque toute l'année, et l'alerte serait permanente. L'application le remplace donc par un seuil relatif, que vous pouvez modifier dans la page comme les deux autres.

Pour chaque mois prévu, l'application calcule la probabilité de franchir chaque seuil, puis classe le mois :

| Risque | Niveau « Élevé » | Niveau « Vigilance » |
| --- | --- | --- |
| **Glissement de terrain** | Pluie forte **et** sol saturé, chacun probable à plus de 50 % | L'un des deux probable à plus de 50 % |
| **Érosion des sols** | Pluie forte **et** végétation faible, chacune probable à plus de 50 % | Pluie forte probable, ou végétation faible avec au moins 25 % de chances de pluie forte |

### La carte des versants vulnérables

La zone de 10 km sur 10 km est découpée en cellules de 231 m (la grille du satellite MODIS). Pour chacune des 1 433 cellules terrestres, le script calcule :

- la **pente moyenne**, à partir du relief SRTM à 30 m ;
- le **NDVI moyen des 12 derniers mois** de la période ;
- un **indice de vulnérabilité** de 0 à 1 qui combine les deux.

```
indice = score de pente × (0,5 + 0,5 × manque de végétation)
```

- Le score de pente vaut 0 à plat et 1 à partir de 25°.
- Le manque de végétation vaut 0 pour un NDVI d'au moins 0,60 et 1 pour un NDVI de 0,30 ou moins.
- Une pente forte bien boisée obtient donc 0,5 ; la même pente nue obtient 1.

Trois boutons changent la couche affichée : vulnérabilité, pente ou végétation. Au survol, chaque cellule donne ses valeurs et son altitude. Le lac Kivu est exclu (cellules sans végétation, ou planes à l'altitude du lac).

Sous la carte, un tableau compare les trois communes. Résultats actuels :

| Commune | Part couverte par la zone | Pente moyenne | Surface à plus de 15° | NDVI moyen | Surface en vulnérabilité modérée à très forte |
| --- | --- | --- | --- | --- | --- |
| Kadutu | 100 % | 14,1° | 40 % | 0,38 | 59 % |
| Ibanda | 86 % | 13,2° | 35 % | 0,37 | 62 % |
| Bagira | 81 % | 15,1° | 52 % | 0,54 | 35 % |

Bagira est la plus pentue mais reste mieux végétalisée, ce qui abaisse son indice ; Kadutu et Ibanda cumulent pentes et faible couvert végétal.

La carte décrit le terrain, pas la météo : elle ne change pas avec les filtres de dates. Une phrase au-dessus d'elle rappelle les mois que la prévision place en vigilance, pour relier le « quand » au « où ».

### L'export

Deux boutons téléchargent les données filtrées au pas de temps affiché, suivies des prévisions (valeur centrale, bornes, probabilités, niveaux de risque). Le fichier contient les sources NASA, la période et les seuils utilisés.

### Importer un autre fichier

Le bas de la colonne de gauche permet de remplacer les données par un CSV mensuel (colonnes : date, précipitations, humidité, NDVI). L'application signale alors que l'origine du fichier n'est pas vérifiée.

---

## 6. Limites à connaître avant de présenter le projet

- **Les niveaux de risque ne sont pas validés.** Ils n'ont été comparés à aucun inventaire de glissements de terrain survenus à Bukavu. Ils indiquent des conditions favorables, pas une probabilité de catastrophe.
- **Les seuils sont des hypothèses de travail**, pas des valeurs mesurées sur les sols de Bukavu.
- **Cinq ans d'historique, c'est court.** Le modèle connaît les saisons, pas les années exceptionnelles (El Niño, dipôle de l'océan Indien).
- **Le modèle ne prévoit pas la météo.** Il prolonge la climatologie : il dira « mars est habituellement très arrosé », jamais « il pleuvra beaucoup en mars prochain ».
- **Les probabilités supposent des écarts de loi normale**, ce qui est approximatif pour la pluie.
- **La prévision est la même pour toute la ville.** La pluie et l'humidité n'ont qu'une valeur pour la zone ; seule la carte distingue les quartiers, et uniquement par la pente et la végétation.
- **L'indice de la carte est une construction simple.** Ses paramètres (25°, NDVI 0,30 et 0,60) sont des choix de travail. Il ignore la nature des sols, les constructions, le drainage et les ravins, et n'a pas été comparé à des glissements recensés.
- **La carte ne couvre pas toute la ville.** Le carré de 10 km laisse de côté 14 % d'Ibanda et 19 % de Bagira.
- **Les cellules font 231 m.** Un talus instable de 30 m de large est invisible à cette échelle.
- **Les variables sont prévues séparément**, alors que pluie, humidité et végétation sont liées.

---

## 7. Idées d'amélioration

### Priorité haute : ce qui renforcerait le plus le projet

1. **Valider contre des événements réels.** Rassembler les dates et les lieux des glissements et inondations connus à Bukavu (presse, protection civile, Croix-Rouge, travaux de l'Université Officielle de Bukavu et du Musée royal de l'Afrique centrale). Vérifier si le modèle signalait ces mois, et si la carte colorait ces lieux. Même dix événements changeraient la crédibilité du projet, et permettraient d'ajuster les paramètres de l'indice.
2. **Affiner la carte.** Passer à des cellules de 30 m avec le NDVI de Landsat ou HLS (NASA), élargir la zone pour couvrir toute la ville, et ajouter les rivières et ravins, les routes et la densité de bâtiments d'OpenStreetMap pour estimer la population exposée.
3. **Utiliser les satellites dédiés.** Remplacer la pluie par **GPM IMERG** (10 km) et l'humidité par **SMAP** (9 km). IMERG et MODIS sont disponibles sur Microsoft Planetary Computer ; SMAP demande un compte NASA Earthdata gratuit.
4. **Allonger l'historique.** NASA POWER remonte à 1981 et MODIS à 2000. Passer à plus de 20 ans donnerait une vraie climatologie et permettrait de dire si une année est anormale.

### Priorité moyenne : mieux prévoir

5. **Afficher les anomalies.** Montrer l'écart de chaque mois par rapport à la normale (par exemple « 40 % de pluie en plus que d'habitude »), plus parlant que la valeur brute.
6. **Ajouter la pluie des jours précédents.** Les glissements dépendent surtout du cumul sur 3 à 30 jours et des pluies journalières extrêmes. Les données journalières sont déjà téléchargées : on peut compter les jours à plus de 30 mm et les cumuls glissants.
7. **Intégrer les prévisions saisonnières.** Ajouter l'état d'El Niño et du dipôle de l'océan Indien, qui influencent les pluies d'Afrique de l'Est, ou les prévisions saisonnières publiques (NMME, C3S).
8. **Tester le modèle honnêtement.** Entraîner sur 2021-2024, prévoir 2025, comparer au réel, et afficher l'erreur obtenue dans l'application.
9. **Essayer un modèle d'apprentissage** (scikit-learn : forêt aléatoire ou gradient boosting) seulement après l'étape 8, pour vérifier qu'il fait mieux que le modèle saisonnier simple.

### Priorité moyenne : mieux servir les deux publics

10. **Un mode « communauté ».** Une page simplifiée avec un feu tricolore, trois phrases et les gestes à faire. Y ajouter le swahili et le mashi : le système de traduction français / anglais est déjà prêt à accueillir d'autres langues.
11. **Un calendrier des actions.** Relier chaque niveau de risque à des tâches datées : curage des caniveaux avant septembre, reboisement en début de saison des pluies.
12. **Diffuser les bulletins.** Générer un résumé mensuel en PDF ou en texte court pour SMS, WhatsApp et radios locales.
13. **Un mode « chercheurs ».** Statistiques détaillées, corrélations entre variables, choix du seuil de confiance, et une adresse stable pour récupérer les données.

### Technique

14. **Mise à jour automatique.** Lancer le script chaque mois (tâche planifiée ou GitHub Actions) pour que l'application reste à jour sans intervention.
15. **Fonctionner hors connexion.** Inclure Tailwind, Chart.js et Leaflet dans le dossier, et prévoir un fond de carte local : utile à Bukavu quand la connexion est instable.
16. **Mettre en ligne.** Publier le dossier sur GitHub Pages pour obtenir une adresse à partager avec le jury.
17. **Créer un dépôt Git.** Le dossier n'est pas versionné : une erreur de manipulation peut faire perdre du travail.
18. **Un vrai backend** (FastAPI), comme prévu dans la feuille de route, seulement si l'application doit servir plusieurs villes ou des données à la demande. Pour une seule zone, le script actuel suffit.
19. **Étendre à d'autres villes du Kivu** (Goma, Uvira, Kalehe, touchée par les coulées de mai 2023) en changeant les coordonnées dans le script.

---

## 8. Citer les sources

- NASA POWER Project, NASA Langley Research Center : https://power.larc.nasa.gov
- Didan, K. (2021). *MODIS/Terra Vegetation Indices 16-Day L3 Global 250m SIN Grid V061*. NASA EOSDIS Land Processes DAAC. https://doi.org/10.5067/MODIS/MOD13Q1.061
- ORNL DAAC, MODIS and VIIRS Land Products Global Subsetting and Visualization Tool : https://modis.ornl.gov
- NASA Shuttle Radar Topography Mission (SRTM), 1 arc-seconde, distribué par les Terrain Tiles (Mapzen, AWS Open Data) : https://registry.opendata.aws/terrain-tiles
- Limites administratives et fond de carte : © contributeurs OpenStreetMap, licence ODbL : https://www.openstreetmap.org/copyright

---

*TERRAPULSE • Kivu EarthLab • Local Innovation, Global Impact.*
