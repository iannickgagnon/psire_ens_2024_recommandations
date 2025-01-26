# psire_ens_2024_recommandations
Ceci est le dépôt pour le code généré dans le cadre du projet PSIRE-ENS intitulé Développement d’un système multi-agents pour le support de la génération de rapports contenant des rétroactions de projets dans des cours de programmation.

Pour l'installation, vous devez d'abord installer l'environnement d'exécution Node.js (https://nodejs.org/en) puis d'exécuter les commandes suivantes au terminal à la racine du projet : 

```
>>> npm install
>>> npm update
```

Vous devez créer un fichier nommé `.env` qui contient les valeurs suivantes qui viennent de la plateforme OpenAI (https://platform.openai.com/docs/overview) :

```
OPENAI_API_KEY="..."
OPENAI_ORG_ID="..."
OPENAI_PROJECT_ID="..."
```

Finalement, pour lancer l'application : 

```
>>> npm start
```

Vous devriez voir le message suivant s'afficher au terminal : `Server is running on http://localhost:5000`. Appuyez sur `ctrl` ou `cmd` puis cliquez sur le lien, sinon copiez-collez l'adresse dans un navigateur et appuyez sur `entrée`.