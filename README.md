# Virus Défense — tower defense pour téléphone

Les virus ont infecté l'ordinateur ! Ils traversent le circuit imprimé jusqu'au processeur :
place des **tourelles automatiques** sur le circuit, le long des couloirs qu'ils empruntent, et **améliore**-les.

HTML5 pur, sans dépendance : il suffit d'ouvrir `index.html`.

## Code
- `js/data.js` : mondes, cartes, tourelles, virus, sauvegarde, succès, missions
- `js/audio.js` : bruitages et musique générés
- `js/background.js` : mise en page, caméra et décors
- `js/game.js` : logique (construction, vagues, combat)
- `js/draw.js` : dessin
- `js/ui.js` : tactile, panneau, pouvoirs, tutoriel, éditeur
- `js/screens.js` : fin de partie, boutique, menus
- `js/main.js` : boucle et démarrage

**Tests** : `npm install` puis `npm test` (16 tests qui jouent des parties dans un navigateur sans écran). Marche en mode paysage et en mode portrait, avec zoom (pincer) et déplacement (glisser).

## Contenu
- **18 grandes cartes** réparties en **6 mondes de 3 zones**, chacun avec son identité : *Circuit imprimé* (pistes de cuivre, robots), *La Fournaise* (tôle striée, caloducs, transformateurs brûlants, braises, fissures de lave), *Flux de données* (fibres optiques, disques durs qui tournent, bits qui défilent), *Salle des serveurs* (métal brossé, baies, câbles, bandes de sécurité), *Zone cryogénique* (givre, cristaux, réservoirs d'azote, flocons) et *Cyberespace* (néons, hologrammes, balayage et parasites). Les cartes (26 × 15 cases) aux couloirs sinueux, avec ventilateurs animés et dissipateurs. Les cartes avancées ont **plusieurs entrées, plusieurs sorties et des couloirs qui se croisent** ; chaque virus suit son propre chemin. À partir de la vague 9, les vagues mélangent deux sortes de virus : (carte mère, bus d'adresse, mémoire vive, alimentation, carte graphique, processeur central, disque dur, carte réseau, carte son, serveur, pare-feu, noyau quantique, clé USB, ventirad, satellite, robot, data center, cœur de l'IA), de 20 à 60 vagues chacune, jusqu'à 4 entrées. Chaque zone débloque la suivante.
- **5 difficultés** : Facile, Normal, Difficile, Cauchemar, Légende (vies, crédits de départ et résistance des virus).
- **12 tourelles** (poseur de mines, vortex, pulseur, mitrailleuse, canon, cryo, lance-flammes, lance-missiles, laser, tesla, amplificateur qui booste ses voisines, mineur crypto qui rapporte des crédits), chacune améliorable jusqu'au **niveau 5**, qui débloque un pouvoir spécial (double tir, balles perforantes, méga-obus, gel total, napalm, salve de missiles, rayon perforant, surcharge, surpuissance, ferme de minage). Mode de visée réglable : premier, dernier, plus fort, plus proche.
  | Tourelle | Prix | Rôle |
  |---|---|---|
  | Pulseur | 5 cr | pas cher, idéal pour couvrir les couloirs |
  | Mitrailleuse | 12 cr | cadence très rapide |
  | Canon | 25 cr | obus explosifs (ne touche pas les volants) |
  | Cryo | 35 cr | ralentit les virus |
  | Laser | 100 cr | longue portée, gros dégâts |
  | Tesla | 150 cr | éclair qui rebondit sur plusieurs virus |
- **14 sortes de virus** : normal, coureur, essaim, blindé, volant, mutant (se régénère), diviseur (se coupe en deux), bouclier (bulle d'énergie), fantôme (intouchable par moments), soigneur, géant, sauteur (se téléporte), mini-virus et méga-virus (boss toutes les 10 vagues).
- **Musique originale générée en direct** (ambiances menu / partie / méga-virus) et bruitages synthétisés, réglables dans les options.
- **Cratères** : chaque virus détruit laisse un cratère noirci sur la carte, qui s'estompe doucement au fil des vagues.
- Décor vivant : petits robots de maintenance et impulsions électriques qui circulent sur le circuit (jamais dans les couloirs des virus), reflet de lumière qui balaie la carte.
- Animations : électricité dans les pistes, LED, portails, processeur qui pulse, tourelles qui recul/scannent, fumée, étincelles, tremblement d'écran, bannières de vague, partie de démonstration derrière le menu.
- Revente des tourelles (70 %), bonus si on lance une vague en avance, vitesse ×1/×2/×3, vague suivante automatique, score, record et 1 à 3 étoiles par zone. Sauvegarde automatique.

## Profondeur de jeu
- **Deux voies au niveau 5** pour chaque tourelle : A (pouvoir spécial) ou B (Pulseur lourd, balles incendiaires, mortier, blizzard, plasma bleu, ogive lourde, laser à surchauffe, tempête électrique, accélérateur, banque).
- **Combinaisons** : choc thermique (feu sur virus gelé), surtension (Tesla sur virus gelé), fusion (laser sur virus en feu), éclatement (explosions sur virus congelé).
- **Pouvoirs actifs** avec recharge : frappe orbitale (à viser), gel système, redémarrage. Bouton 👁 pour voir les couloirs mal couverts, ↶ pour annuler la dernière pose (remboursée).
- **Règle par monde** : apprentissage, cases brûlantes, portails, coupures de courant, verglas, piratage (touche la tourelle pour la réparer).
- **Virus exclusifs** (ver, braise, paquet, zombie, cryovirus, glitch) et **6 boss de monde** à la dernière vague de chaque zone (Ver Kernel, Titan de magma, Cheval de Troie, Botnet DDoS, Glacier, IA corrompue).
- **Aperçu de la vague suivante** à chaque entrée, avec le trajet des virus.
- **Séries d'éliminations** (bonus de crédits, sons de plus en plus aigus), micro-pauses et zoom sur les gros impacts, musique propre à chaque monde.

## Nouveautés
- **2 nouveaux mondes** : *Ordinateur rétro* (disquettes, clavier, écrans cathodiques ; règle « mémoire limitée » à 28 tourelles ; virus Pixel ; boss Ordinateur central qui donne des boucliers) et *Le Nuage* (ciel, serveurs flottants ; règle « orages » avec la foudre ; virus Drone volant ; boss Tempête). 24 zones au total.
- **Lisibilité** : pastilles au-dessus des virus dangereux, alerte quand un virus approche du processeur, chiffres de dégâts (option).
- **Ciblage** « Soigneurs d'abord » / « Spéciaux d'abord », bouton « ⇉ Toutes » pour régler toutes les tourelles, **double-tap** pour améliorer, **vitesse ×4** sur les zones déjà gagnées.
- **Prestige** (bonus permanents), **apparences** de tourelles, **histoire** racontée par AVA l'antivirus et une vraie fin.

## Créer et partager ses niveaux
Menu → **🛠 Créer des niveaux** : touche un bord pour placer une entrée, puis les cases du couloir (les coins sont ajoutés tout seuls). Choisis le monde (décor, règle, boss) et le nombre de vagues, teste, puis **Partager** : le niveau tient dans un petit code (ex. `VD1~Mon%20niveau~3~40~0k…`) ou un lien `#lvl=…`. Ton ami le colle dans **Importer** : aucun serveur nécessaire.

## Rejouabilité
- **2 défis par zone** (sans revente, sans pouvoir, 3 types de tourelles…), récompensés en puces.
- **Mode infini** avec record, et **zone aléatoire** générée à chaque partie
- **Mutateurs** (virus géants, rapides, tourelles chères…) qui rapportent plus de puces, **missions de la semaine**
- **Mode infini** avec record par zone et par difficulté (boss de monde toutes les 25 vagues).
- **Défi du jour** : même carte et même règle pour la journée (arsenal imposé, invasion, blindage…), meilleurs scores du jour.
- **24 succès**, **encyclopédie des virus** (avec les combinaisons découvertes) et **statistiques**.
- **Tutoriel guidé** sur la première zone (rejouable dans les options).
- Options : **économie de batterie**, **export / import de la sauvegarde** par code.

## Boutique
- Chaque partie rapporte des **puces ⬢** (victoire : selon les étoiles, la zone et la difficulté, avec un bonus la première fois ; défaite : selon les vagues tenues).
- Au début, seuls le Pulseur, la Mitrailleuse et le Canon sont disponibles : les 7 autres tourelles se **débloquent** dans la Boutique.
- Chaque tourelle a **5 niveaux de recherche** : +8 % de dégâts et +3 % de portée par niveau, le niveau 5 en partie (pouvoir spécial) se débloque à la recherche 2, et la recherche 5 réduit son prix de 10 %.
- **Améliorations permanentes** : budget de départ, vies en plus, prime par virus, bonus de vague, revente.

## Commandes
- Touche une tourelle dans le panneau, puis n'importe quelle case du circuit, ou glisse la tourelle du panneau jusqu'à la carte. Le panneau peut se mettre à gauche ou à droite (Options).
- Pince pour zoomer, glisse pour te déplacer (molette de la souris sur ordinateur).
- Touche une tourelle posée pour l'améliorer ou la vendre.
- Au clavier : touches 1 à 6 pour choisir une tourelle, Espace pour lancer la vague, U pour améliorer, S pour vendre, P pour mettre en pause.

## Jouer sur téléphone
1. Activer **GitHub Pages** sur ce dépôt (Settings → Pages → branche, dossier `/`).
2. Ouvrir l'URL sur le téléphone, puis « Ajouter à l'écran d'accueil » pour jouer en plein écran (fonctionne aussi hors ligne).

## Application Android (.apk)
À chaque mise à jour du code, GitHub Actions compile automatiquement l'application
(dossier `android/`, workflow `.github/workflows/android.yml`) et la publie dans les
**Releases** du dépôt.

1. Sur ton téléphone Android, ouvre la page **Releases** du dépôt et télécharge `VirusDefense.apk`.
2. Ouvre le fichier et autorise l'installation d'applications « de source inconnue » si Android le demande.
3. Lance **Virus Défense** depuis l'écran d'accueil.

Les nouvelles versions s'installent par-dessus l'ancienne : la progression est conservée.
Le bouton retour du téléphone met le jeu en pause ou revient au menu.
