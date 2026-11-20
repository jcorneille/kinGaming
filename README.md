# GOZA — Salle de Jeux & Domotique IoT

Application locale de gestion de salle de jeux vidéo, billetterie, fidélité et domotique.

## Développement local

```bash
npm install
npm run dev
```

Le serveur démarre sur http://localhost:3000. Les données de l'application sont
enregistrées dans le navigateur; les réservations, tickets partagés, accès du
personnel et paiements STK sont également conservés dans `.data/` sur le serveur.
Les modifications locales ne nécessitent pas Internet. WhatsApp et les paiements
opérateur nécessitent toutefois leurs services externes.

## Production sur la machine locale

```bash
npm install
npm run build
npm start
```

Le build génère l'interface et `dist/server.js`; le serveur utilise le même port
et sert l'interface ainsi que l'API locale. Copiez `.env.example` vers `.env.local`
pour les intégrations qui seront configurées plus tard. Le fichier `.env.local`
reste local et ne doit pas être partagé.

## Sauvegarde et mode hors ligne

GOZA sauvegarde automatiquement son état dans le stockage local du navigateur.
Dans **Réglages → Sauvegardes & Système**, téléchargez régulièrement une sauvegarde
JSON de l'état du navigateur et gardez une copie sur un autre disque. Les fichiers
JSON côté serveur sont dans `.data/` : incluez aussi ce dossier à vos sauvegardes
pour couvrir les données synchronisées et l'authentification serveur. La restauration
du JSON navigateur remplace l'état actuel et nécessite que le compte administrateur
présent dans la sauvegarde corresponde au compte connecté.

Une coupure d'Internet n'empêche pas l'utilisation locale si la machine GOZA et
le réseau local restent disponibles. Les paiements opérateur et les notifications
WhatsApp seront indisponibles jusqu'au retour de leur connexion. Les données du
navigateur ne sont pas automatiquement partagées entre plusieurs appareils.
