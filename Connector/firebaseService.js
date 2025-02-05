import { initializeApp, deleteApp } from 'firebase/app';
import { getDatabase, ref, get, set, query, orderByChild, equalTo, update, remove } from 'firebase/database';
import { access } from 'fs/promises';
import { constants } from 'fs';
import dotenv from 'dotenv';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

// Obtenir le chemin du dossier du script
const __dirname = dirname(fileURLToPath(import.meta.url));

// Charger .env depuis le même dossier que le script
dotenv.config({ path: `${__dirname}/.env` });

const firebaseConfig = {
  apiKey: process.env.API_KEY,
  authDomain: process.env.AUTH_DOMAIN,
  databaseURL: process.env.DATABASE_URL,
  projectId: process.env.PROJECT_ID,
  storageBucket: process.env.STORAGE_BUCKET,
  messagingSenderId: process.env.MESSAGING_SENDER_ID,
  appId: process.env.APP_ID,
  measurementId: process.env.MEASUREMENT_ID
};

// Fonction pour initialiser Firebase
export const connectFirebase = () => {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app); // Utilisation correcte de getDatabase
  console.log("Firebase initialized.");
  return { app, db };
};

// Fonction pour écrire dans Firebase
export const writeToFirebase = async (db, nodePath, value) => {
  const nodeRef = ref(db, nodePath); // Utilisation correcte de ref
  await set(nodeRef, value); // Utilisation correcte de set
};

// Fonction pour mettre à jour un noeud dans la base
/*export const updateNode = async (db, nodePath, updates) => {
  try {
    //const db = getDatabase(); // Connexion à la base de données
    const nodeRef = ref(db, nodePath); // Référence au nœud

    // Mise à jour des données dans Firebase
    await update(nodeRef, updates);
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du nœud ${nodePath} :`, error);
    throw error;
  }
};*/

// Fonction pour mettre à jour un noeud dans la base avec une option de fusion
export const updateNode = async (db, nodePath, updates, mix = false) => {
  try {
    const nodeRef = ref(db, nodePath); // Référence au nœud
    if (mix) {
      // Récupérer les données existantes dans Firebase
      const snapshot = await get(nodeRef);

      // Si des données existent, les fusionner avec les nouvelles données
      let existingData = snapshot.exists() ? snapshot.val() : {};

      // Fusionner les anciennes données et les nouvelles données
      // Cette logique fonctionne pour n'importe quel type de données
      const deepMerge = (target, source) => {
        for (const key in source) {
          if (source.hasOwnProperty(key)) {
            // Si la clé existe déjà et que les deux sont des objets, on fusionne récursivement
            if (typeof target[key] === 'object' && typeof source[key] === 'object' && target[key] !== null && source[key] !== null) {
              target[key] = deepMerge(target[key], source[key]);
            } else {
              // Sinon, on remplace ou on ajoute la nouvelle valeur
              target[key] = source[key];
            }
          }
        }
        return target;
      };

      // Fusionner les anciennes données et les nouvelles données
      updates = deepMerge(existingData, updates);
    }
    // Mise à jour des données dans Firebase
    await update(nodeRef, updates);

    console.log(`Mise à jour réussie du nœud ${nodePath}`);
  } catch (error) {
    console.error(`Erreur lors de la mise à jour du nœud ${nodePath} :`, error);
    throw error;
  }
};

// Fonction pour lire depuis Firebase
export const readFromFirebase = async (db, nodePath) => {
  const nodeRef = ref(db, nodePath); // Utilisation correcte de ref
  const snapshot = await get(nodeRef); // Utilisation correcte de get
  if (snapshot.exists()) {
    return snapshot.val();
  } else {
    console.log(`No data found at ${nodePath}.`);
    return null;
  }
};

// Fonction pour rechercher des nœuds avec une clé spécifique et une valeur
export const searchNodes = async (db, parentNode, key, value) => {
  try {
    const parentRef = ref(db, parentNode); // Utilisation correcte de ref
    const filteredQuery = query(parentRef, orderByChild(key), equalTo(value)); // Utilisation correcte de query et autres
    const snapshot = await get(filteredQuery); // Utilisation correcte de get

    if (snapshot.exists()) {
      return snapshot.val();
    } else {
      console.log("No matching nodes found.");
      return null;
    }
  } catch (error) {
    console.error("Error searching nodes:", error);
    throw error;
  }
};

// Fonction de recherche pour les pointages avec "fetched" égal à false
export const searchPointagesWithFetchedFalse = async (db,branch, userId) => {
  try {
    // Référence au nœud des pointages de l'utilisateur
    const parentRef = ref(db, `${branch}/Pointages/${userId}`);

    // Requête pour filtrer les pointages où "fetched" == false
    const filteredQuery = query(parentRef, orderByChild('fetched'), equalTo(false));

    // Exécution de la requête
    const snapshot = await get(filteredQuery);

    if (snapshot.exists()) {
      return snapshot.val(); // Retourne les pointages correspondants
    } else {
      console.log("No matching pointages found.");
      return null;
    }
  } catch (error) {
    console.error("Error searching pointages:", error);
    throw error;
  }
};

export const deleteNode = async (db, path) => {
  try {
    const nodeRef = ref(db, path);
    await remove(nodeRef);
    console.log(`Le nœud "${path}" a été supprimé avec succès.`);
  } catch (error) {
    console.error(`Erreur lors de la suppression du nœud "${path}":`, error);
    throw error;
  }
};

// Fonction pour fermer Firebase
export const closeFirebase = async (app) => {
  await deleteApp(app);
  console.log("Firebase closed.");
};

export const checkFileExists = async (filePath) => {
  try {
    await access(filePath, constants.F_OK);
    console.log(`Le fichier ${filePath} existe.`);
    return true;
  } catch (error) {
    console.log(`Le fichier ${filePath} n'existe pas.`);
    return false;
  }
};
