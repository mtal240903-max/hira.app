# Hira Mobile

Application mobile Hira (React Native / Expo) — messagerie de l'écosystème MTAL.

## ⚠️ Point technique important : les appels nécessitent un "dev build"

Ce projet utilise `react-native-webrtc` pour les appels audio/vidéo, qui contient du **code natif compilé**. Ça ne fonctionne **pas** dans Expo Go (l'app de test standard depuis le store). Pour tester les appels, il faut créer un build de développement :

```bash
npx expo install expo-dev-client
npx eas build --profile development --platform android   # ou ios
```

**Tout le reste de l'app (chat, groupes, statuts, profil) fonctionne normalement dans Expo Go.** Si tu veux juste tester la messagerie sans les appels, `npx expo start` suffit.

## Stack
- Expo (React Native) 57
- React Navigation (stack)
- Socket.IO client (temps réel)
- Axios (API REST + refresh token automatique)
- AsyncStorage (persistance locale — équivalent mobile de localStorage)
- react-native-webrtc (appels, nécessite dev build — voir ci-dessus)
- expo-image-picker / expo-document-picker / expo-av (médias, vocal)

## Démarrage

```bash
npm install
npx expo start
```

Scanne le QR code avec l'app **Expo Go** (Android/iOS) pour tester sur un vrai appareil, ou lance un simulateur.

### Configurer l'URL du backend

Édite `app.json`, section `expo.extra` :

```json
"extra": {
  "apiUrl": "http://TON_IP_LOCALE:5000/api",
  "socketUrl": "http://TON_IP_LOCALE:5000",
  "wuroenConnectUrl": "https://wuroen-app.onrender.com/api/auth/connect"
}
```

**Important** : sur un appareil physique, `localhost` ne fonctionne pas — remplace par l'adresse IP locale de ton ordinateur sur le réseau (ex: `192.168.1.42`), trouvable via `ipconfig` (Windows) ou `ifconfig` (Mac/Linux). Ton téléphone et ton ordinateur doivent être sur le même réseau Wi-Fi.

Une fois le backend déployé (Render), remplace ces valeurs par l'URL de production.

## Structure du projet

```
src/
├── api/          # appels HTTP (identiques en logique à la version web)
├── context/      # Auth, Theme, Socket, Call — état global
├── components/   # composants réutilisables (Avatar, Button, bulles de message...)
├── screens/      # un écran par vue (équivalent des pages web)
├── navigation/    # RootNavigator — gère auth vs app, deep links
├── hooks/         # useWebRTC (appels)
├── theme/         # palette de couleurs (équivalent des variables CSS)
└── assets/        # logo, images
App.js             # point d'entrée, assemble tous les providers
```

## Fonctionnalités incluses
- Connexion / inscription (email ou téléphone)
- Connexion via Wuro'en (deep link `hira://auth/wuroen?token=...`)
- Liste de conversations avec bandeau de statuts
- Chat temps réel : texte, images, vidéos, documents, messages vocaux (enregistrement natif), réactions, édition, suppression, "en train d'écrire"
- Groupes : création, gestion des membres, admin
- Statuts/Stories 24h : texte (couleur de fond) ou média, visualiseur plein écran avec progression
- Profil : photo, nom, bio, thème sombre/clair
- Appels audio/vidéo 1-à-1 (⚠️ nécessite un dev build, voir plus haut)

## Différences notables avec la version web
- Stockage : `AsyncStorage` au lieu de `localStorage`
- Upload média : objets `{ uri, name, mimeType }` au lieu de `File`
- Emojis : pas de sélecteur dédié — le clavier natif du téléphone a déjà un sélecteur d'emoji intégré
- Bascule caméra avant/arrière en appel vidéo (`switchCamera`) — pas d'équivalent web
- Deep link (`hira://`) pour la connexion Wuro'en au lieu d'une redirection web classique

## Prochaines étapes suggérées
- Appels de groupe (mesh, comme sur le web) — pas encore portés sur mobile
- Notifications push natives (Expo Notifications + le token déjà géré côté backend)
- Build de production (EAS Build) pour publication sur les stores
- Partage d'écran en appel (API différente sur mobile, plus limitée qu'en navigateur)
