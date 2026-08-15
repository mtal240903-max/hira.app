# Hira Web

Interface web de Hira — messagerie de l'écosystème MTAL.

## Stack
- React 19 + Vite
- React Router (navigation)
- Socket.IO client (temps réel)
- Axios (API REST + refresh token automatique)
- CSS natif avec variables (thème sombre/clair)

## Démarrage

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer l'URL de l'API backend
cp .env.example .env
# Modifier VITE_API_URL et VITE_SOCKET_URL si besoin

# 3. Lancer le serveur de développement
npm run dev
```

L'app tourne par défaut sur `http://localhost:5173`. Le backend Hira (voir `hira-backend`) doit tourner en parallèle sur `http://localhost:5000`.

## Structure du projet

```
src/
├── api/          # appels HTTP (auth, conversations, media) + client axios
├── context/      # Auth, Theme, Socket — état global via Context API
├── components/   # composants réutilisables (Avatar, Button, ChatWindow...)
├── pages/        # AuthPage (connexion/inscription), ChatPage (écran principal)
├── App.jsx       # routing + providers
└── index.css     # système de design (variables CSS thème sombre/clair)
```

## Fonctionnalités incluses (Hira 1.0)
- Connexion / inscription (email ou téléphone)
- Liste des conversations, triée par activité récente
- Chat temps réel : envoi/réception instantanés, "en train d'écrire", accusés de réception/lecture
- Historique paginé avec scroll infini vers le haut (position de scroll préservée)
- Réponse à un message (double-clic sur un message)
- Envoi de médias (image, vidéo, audio, document) avec prévisualisation et légende avant envoi
- Réactions, modification et suppression de message (temps réel)
- Recherche de contacts pour démarrer une conversation
- Création de groupe (sélection multiple de contacts + nom)
- Gestion de groupe : voir les membres, ajouter/retirer (admin), renommer, quitter
- Écran de profil : modifier nom, bio, photo
- Thème sombre par défaut avec bascule vers le thème clair (persisté en local)
- Statut en ligne / hors ligne en temps réel
- Connexion via compte Wuro'en (écosystème MTAL)

## Fonctionnalités incluses (Hira 3.0)
- Statuts/Stories 24h : texte (avec couleur de fond) ou image/vidéo avec légende
- Bandeau de statuts en haut de la sidebar, anneau dégradé si non vu
- Visualiseur plein écran avec barres de progression et défilement automatique
- Suivi des vues (qui a vu ton statut), suppression avant expiration

## Système de design
La palette est dérivée directement du logo Hira : dégradé cyan → bleu → violet sur fond bleu nuit. Les variables sont centralisées dans `src/index.css` (`--hira-gradient`, `--bg-app`, etc.) et changent automatiquement selon `data-theme="dark"` ou `"light"` sur `<html>`.

## Prochaines étapes suggérées
- Ajout de membres a posteriori depuis le panneau de groupe (actuellement seulement à la création)
- Notifications navigateur (Web Push / Notification API)
- Version mobile (React Native) réutilisant la même logique métier
