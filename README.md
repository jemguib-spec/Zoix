# Virus Défense — tower defense pour téléphone

Les virus ont infecté l'ordinateur ! Ils traversent le circuit imprimé jusqu'au processeur :
place des **tourelles automatiques** sur le circuit, le long des couloirs qu'ils empruntent, et **améliore**-les.

HTML5 pur, sans dépendance : il suffit d'ouvrir `index.html`. Marche en mode paysage et en mode portrait, avec zoom (pincer) et déplacement (glisser).

## Contenu
- **6 grandes cartes** (26 × 15 cases) aux couloirs sinueux : (carte mère, bus d'adresse, mémoire vive, alimentation, carte graphique, processeur central), de 20 à 40 vagues chacune. Chaque zone débloque la suivante.
- **4 difficultés** : Facile, Normal, Difficile, Cauchemar (vies, crédits de départ et résistance des virus).
- **6 tourelles**, chacune améliorable jusqu'au niveau 4 :
  | Tourelle | Prix | Rôle |
  |---|---|---|
  | Pulseur | 5 cr | pas cher, idéal pour couvrir les couloirs |
  | Mitrailleuse | 12 cr | cadence très rapide |
  | Canon | 25 cr | obus explosifs (ne touche pas les volants) |
  | Cryo | 35 cr | ralentit les virus |
  | Laser | 100 cr | longue portée, gros dégâts |
  | Tesla | 150 cr | éclair qui rebondit sur plusieurs virus |
- **7 sortes de virus** : normal, coureur, essaim, blindé, volant (passe au-dessus des tourelles), mutant (se régénère) et méga-virus (boss toutes les 10 vagues).
- Animations : électricité dans les pistes, LED, portails, processeur qui pulse, tourelles qui recul/scannent, fumée, étincelles, tremblement d'écran, bannières de vague, partie de démonstration derrière le menu.
- Revente des tourelles (70 %), bonus si on lance une vague en avance, vitesse ×1/×2/×3, vague suivante automatique, score, record et 1 à 3 étoiles par zone. Sauvegarde automatique.

## Commandes
- Touche une tourelle dans le panneau, puis touche des cases du circuit (zones colorées) pour la poser.
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
