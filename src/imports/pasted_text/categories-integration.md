L'application dispose des modules suivants :
- AddProductView : formulaire d'ajout/modification de produit
- AllProductsView : liste et gestion des produits
- TransactionsView : ventes et paiements
- RepairsView : dépôts et gestion des réparations
- DebtsView : gestion des dettes
- ClientsView : gestion des clients
- HistoryView : historique des actions
- SettingsView : paramètres (Catégories, Utilisateurs, Thème)

Architecture globale :
- localStorage-first avec synchronisation Supabase en arrière-plan
- Système d'authentification par username/password, compte admin par défaut : admin / admin123
- Gestion des rôles : administrateur et utilisateur standard
- Logging centralisé via une fonction logAction(type, description, userId, metadata, timestamp)
- Chaque log contient : { type, description, userId, metadata (JSON), timestamp }

---

Implémente les 10 blocs suivants dans l'ordre indiqué. Traite un bloc à la fois, fournis le code complet, puis attends la validation avant de passer au suivant.

══════════════════════════════════════════
BLOC 1 — CATÉGORIES ACTIVES PARTOUT
══════════════════════════════════════════

La notion de catégorie existe en base (table `categories`, 6 par défaut : Batterie, Écran, Plaquette, Caméra, Connecteur, Autre) mais n'est pas encore exploitée dans l'interface. Implémenter :

1a. AddProductView :
- Ajouter un champ Select "Catégorie" obligatoire
- Charger les catégories dynamiquement depuis Supabase
- Afficher la couleur de la catégorie comme indicateur visuel dans le select
- Logger à l'ajout : type "produit_ajouté", nom, catégorie, stock initial, userId

1b. AllProductsView :
- Ajouter une barre de filtres par catégorie (chips horizontaux scrollables en haut)
- "Toutes" sélectionné par défaut, filtre en temps réel
- Afficher un badge coloré de catégorie sur chaque carte produit

1c. Recherche (partout où elle existe) :
- Inclure la catégorie dans les critères de recherche textuelle
- Permettre la recherche par nom de catégorie

1d. TransactionsView :
- Lors de la sélection d'un produit à vendre, afficher la catégorie comme information secondaire

══════════════════════════════════════════
BLOC 2 — RESTRICTIONS D'ACCÈS ADMIN
══════════════════════════════════════════

2a. AllProductsView :
- Masquer les boutons d'édition et de suppression pour les utilisateurs dont le rôle n'est pas "administrateur"
- Afficher un message explicite si un utilisateur standard tente une action protégée : "Accès réservé aux administrateurs"
- Conditionner l'affichage en lisant la variable de session contenant le rôle de l'utilisateur connecté

2b. SettingsView :
- Accès complet réservé aux admins
- Afficher un message d'erreur clair pour les utilisateurs standards qui tenteraient d'y accéder

══════════════════════════════════════════
BLOC 3 — CONTRÔLE DU STOCK À LA VENTE
══════════════════════════════════════════

Dans TransactionsView, lors de l'ajout d'un article à une vente :
- Vérifier en temps réel la quantité disponible en stock
- Si stock = 0 : afficher un badge "Rupture de stock" sur le produit, le rendre non sélectionnable
- Si quantité demandée > stock disponible : bloquer la validation et afficher "Stock insuffisant — disponible : X unités"
- À la confirmation de la vente : décrémenter le stock dans Supabase et en localStorage
- Logger : type "vente", produits vendus, quantités, montant total, userId

══════════════════════════════════════════
BLOC 4 — RÉAPPROVISIONNEMENT RAPIDE
══════════════════════════════════════════

Dans AllProductsView, ajouter un bouton "Réapprovisionner" sur chaque fiche produit (admins uniquement).
Ce bouton ouvre un bottom sheet avec :
- Nom du produit (lecture seule)
- Champ numérique : "Quantité à ajouter" (obligatoire)
- Champ optionnel : "Prix d'achat unitaire" (met à jour le coût si renseigné)
- Champ optionnel : "Note / fournisseur"
- Bouton de confirmation

À la validation :
- Incrémenter la quantité en stock (Supabase + localStorage)
- Mettre à jour le prix d'achat si renseigné
- Logger : type "réapprovisionnement", produit, quantité ajoutée, userId

══════════════════════════════════════════
BLOC 5 — SYSTÈME DE DÉPÔT RÉPARATION AVANCÉ
══════════════════════════════════════════

Refondre le formulaire de dépôt dans RepairsView avec les champs et la logique suivants :

5a. Informations de base :
- Client (sélection depuis ClientsView ou ajout rapide inline)
- Type d'appareil (ex : Samsung A10, iPhone 13…)
- Description du problème (champ texte long, obligatoire)
- État visuel à l'arrivée (ex : écran fissuré, batterie déchargée…)
- Date de dépôt (auto-remplie, modifiable)
- Statut initial automatique : "En attente de diagnostic"

5b. Pièces utilisées (section répétable) :
- Bouton "Ajouter une pièce du magasin"
- Sélection d'un produit depuis le stock (avec filtre par catégorie)
- Quantité utilisée (contrôle : ne peut pas dépasser le stock disponible)
- À l'ajout d'une pièce : décrémenter immédiatement le stock dans Supabase + localStorage
- Possibilité de retirer une pièce (restauration du stock correspondant)
- Logger : type "pièce_utilisée", pièce, réparation, quantité, userId

5c. Calcul du prix de la réparation :
- Champ "Coût main d'œuvre" (saisie manuelle)
- Calcul automatique en lecture seule : Prix minimum = Σ(prix_achat × quantité par pièce) + coût_main_oeuvre
- Alerte visible si le prix proposé est inférieur au prix minimum
- Champ "Prix proposé au client" : bloqué ou avertissement fort si < prix minimum (ne pas réparer à perte)
- Champ "Avance reçue" (facultatif)

5d. Workflow de statuts :
En attente → Diagnostic → En cours → Terminée → Récupérée | Annulée
- Chaque changement de statut : logger type "réparation", ancien → nouveau statut, userId

5e. Clôture de la réparation :
- Passage au statut "Récupérée" : enregistrement automatique du paiement final (montant total - avance déjà versée)
- Mise à jour de l'historique
- Logger : type "clôture_réparation", montant final, client, userId

══════════════════════════════════════════
BLOC 6 — HISTORIQUE EXHAUSTIF DE TOUTES LES ACTIONS
══════════════════════════════════════════

La fonction logAction doit être appelée sur l'ensemble des actions suivantes :

Ventes & paiements (TransactionsView) :
- Création d'une vente : type "vente", produits + montants
- Enregistrement d'un paiement : type "paiement", montant, client, solde restant

Réparations (RepairsView) :
- Dépôt d'un appareil : type "dépôt", client, appareil, description du problème
- Utilisation d'une pièce : type "pièce_utilisée", pièce, réparation concernée
- Changement de statut : type "réparation", ancien → nouveau statut
- Clôture / récupération : type "clôture_réparation", montant final

Produits :
- Ajout d'un produit : type "produit_ajouté", nom, catégorie, stock initial
- Modification : type "produit_modifié", champs modifiés
- Suppression : type "produit_supprimé", nom du produit
- Réapprovisionnement : type "réapprovisionnement", produit, quantité ajoutée

Dettes (DebtsView) :
- Création d'une dette : type "dette", montant, client
- Remboursement partiel ou total : type "remboursement", montant, solde restant

Clients (ClientsView) :
- Ajout d'un client : type "client_ajouté", nom
- Modification : type "client_modifié", champs modifiés

Authentification :
- Connexion : type "connexion", userId
- Déconnexion : type "déconnexion", userId

Dans HistoryView :
- S'assurer que le filtre par type couvre tous les types listés ci-dessus
- Conserver la recherche textuelle et l'affichage temporel intelligent (il y a X min/h/j)
- Chaque entrée affiche : type, description, utilisateur, horodatage

══════════════════════════════════════════
BLOC 7 — MODE CLAIR FONCTIONNEL
══════════════════════════════════════════

- Créer une variable d'état globale `appTheme` (valeurs : "dark" | "light")
- Persister le choix en localStorage et en Supabase (table `users`, colonne `theme_preference`)
- Dans SettingsView > onglet Thème : rendre le toggle Dark/Light pleinement opérationnel
- Appliquer le thème à l'ensemble de l'application via ThemeData Flutter :
  • Mode clair : fond blanc, texte sombre (#1A1A1A), accents définis
  • Mode sombre : fond sombre, texte clair, accents adaptés
- Au lancement : charger le thème depuis localStorage avant le premier rendu (éviter le flash de thème)

══════════════════════════════════════════
BLOC 8 — GESTION DES UTILISATEURS (SettingsView)
══════════════════════════════════════════

Dans SettingsView > onglet Utilisateurs (admins uniquement) :
- Lister les utilisateurs existants avec leur nom, rôle et statut actif/inactif
- Formulaire inline pour créer un nouvel utilisateur : username, mot de passe, rôle
- Modification d'un utilisateur existant : changement de rôle, réinitialisation du mot de passe
- Suppression d'un utilisateur (avec confirmation)
- Logger toutes ces actions : type "utilisateur_créé" / "utilisateur_modifié" / "utilisateur_supprimé"

══════════════════════════════════════════
BLOC 9 — GESTION DES CATÉGORIES (SettingsView)
══════════════════════════════════════════

Dans SettingsView > onglet Catégories (admins uniquement) :
- Lister les catégories existantes avec leur couleur
- Ajouter une catégorie : nom + couleur personnalisable
- Modifier une catégorie : nom et couleur
- Supprimer une catégorie (vérifier qu'aucun produit actif n'y est rattaché avant suppression, sinon avertir)
- Synchroniser en temps réel avec Supabase + localStorage

══════════════════════════════════════════
BLOC 10 — LOGGING AU NIVEAU DE L'AUTHENTIFICATION
══════════════════════════════════════════

- Sur l'écran de connexion : logger chaque connexion réussie (type "connexion", userId, timestamp)
- Sur le bouton de déconnexion dans le header : logger chaque déconnexion (type "déconnexion", userId, timestamp)
- Afficher dans le header le nom et le rôle de l'utilisateur connecté
- Si la session expire ou est invalide : rediriger vers l'écran de connexion et logger type "session_expirée"

---

CONSIGNES GÉNÉRALES :
- Implémente bloc par bloc dans l'ordre, fournis le code FlutterFlow complet (custom actions, Supabase queries, state management) pour chaque bloc
- Architecture localStorage-first obligatoire : toute écriture va d'abord en localStorage, puis sync Supabase en arrière-plan
- Messages d'erreur clairs et actionnables pour l'utilisateur final sur toutes les validations
- Chaque log contient systématiquement : { type, description, userId, metadata (JSON), timestamp }
- Les restrictions admin sont vérifiées côté UI ET côté Supabase (Row Level Security si applicable)

Commence par le BLOC 1 et arrête-toi après pour validation.