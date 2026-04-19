# Rahoot × ALBERT

Clone open-source de Kahoot!, auto-hébergeable, avec création de quiz assistée par l'IA [ALBERT](https://albert.api.etalab.gouv.fr) (DINUM).

## Fonctionnalités

- Parties en temps réel (Socket.io)
- **Création de quiz depuis l'interface** — éditeur visuel + génération par IA
- **Génération IA via ALBERT** — choisissez le modèle, saisissez un thème, obtenez des QCM prêts à l'emploi
- **Support LaTeX** (KaTeX) dans les questions et réponses — affiché pendant la partie
- Support image, vidéo, audio dans les questions
- QR code de connexion pour les joueurs
- Classement en temps réel avec podium

---

## Installation rapide (Node.js)

### Prérequis

- Node.js 22+
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)

### Lancer l'application

```bash
git clone https://github.com/Prof-Krapu/Rahoot-albert.git
cd Rahoot-albert

pnpm install
pnpm run dev
```

L'application est disponible sur **http://localhost:3000**

---

## Configuration

Au premier démarrage, le dossier `config/` est créé automatiquement.

### Mot de passe manager (`config/game.json`)

```json
{
  "managerPassword": "monMotDePasse"
}
```

> Le mot de passe par défaut est `"PASSWORD"` — l'accès manager est **bloqué** tant qu'il n'est pas changé.

### Clé API ALBERT (pour la génération IA)

Deux options :

**Option 1 — variable d'environnement (recommandé) :**
```bash
ALBERT_API_KEY=votre_cle pnpm run dev
```

**Option 2 — depuis l'interface manager :**
Après connexion sur `/manager`, un champ permet de saisir et sauvegarder la clé directement.

---

## Utilisation

### Manager (organisateur)

1. Aller sur **http://localhost:3000/manager**
2. Saisir le mot de passe
3. **Créer un quiz** : cliquer "Créer un nouveau quiz"
   - Rédiger les questions manuellement (supporte le LaTeX : `$E = mc^2$`)
   - Ou cliquer **"Générer avec ALBERT"** : saisir un thème, choisir un modèle, générer
4. **Lancer une partie** : sélectionner un quiz existant → Jouer
5. Partager le code de salle ou le QR code aux joueurs

### Joueurs

1. Aller sur **http://localhost:3000**
2. Saisir le code de salle
3. Choisir un pseudo et jouer

---

## Production (Docker)

```bash
# Avec Docker Compose
docker compose up -d

# Avec variable d'env ALBERT
ALBERT_API_KEY=votre_cle docker compose up -d
```

Le fichier `compose.yml` monte automatiquement `./config` pour persister les quiz et la configuration.
