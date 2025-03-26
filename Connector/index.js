import fs from 'fs';
import fsp from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import * as firebaseService from './firebaseService.js';
import util from 'util';
import readline from 'readline';
import dotenv from 'dotenv';
import { dirname } from 'path';

// Obtenir le chemin du fichier actuel
const __filename = fileURLToPath(import.meta.url);
// Obtenir le répertoire du fichier actuel
const __dirname = path.dirname(__filename);

process.stdin.setEncoding('utf8');
process.stdout.setEncoding('utf8');

// Charger .env depuis le même dossier que le script
dotenv.config({ path: `${__dirname}/.env` });

var branch = process.env.branch;
console.error("branch :", branch);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});


const { app, db } = firebaseService.connectFirebase();


const argv = yargs(hideBin(process.argv))
  .option('g', {
    alias: 'get',
    describe: 'lit les données de la base, e.g., configs, utilisateurs ou pointages',
    type: 'string',
    choices: ['configs', 'users', 'point']
  })
  .option('s', {
    alias: 'set',
    describe: 'écrit/update les données dans la base, e.g., configs, utilisateurs',
    type: 'string',
    choices: ['configs', 'users', 'point'],
  })
  .option('t', {
    alias: 'temp',
    describe: 'ne marque pas les pointages comme lu',
    type: 'boolean',
  })
  .check((argv) => {
    if (!argv.g && !argv.s) {
      throw new Error("Vous devez préciser au moins l'option '--get' ou '--set'.");
    }
    if (argv.g && argv.s) {
      throw new Error("Vous ne devez préciser qu'une seule option '--get' ou '--set'.");
    }
    return true;
  })
  .help()
  .argv;

// Crée un sous-dossier local s'il n'existe pas
function ensureLocalFolder(folderName) {
    const localFolderPath = path.join(__dirname, folderName);
    if (!fs.existsSync(localFolderPath)) {
        fs.mkdirSync(localFolderPath, { recursive: true });
    }
    return localFolderPath;
}

// Fonction pour exporter l'objet dans un fichier JSON
async function exportToJsonFile(data, filePath) {
  try {
    // Convertit l'objet en chaîne JSON avec indentation
    const jsonString = JSON.stringify(data, null, 2);

    // Écrit la chaîne JSON dans le fichier
    await fsp.writeFile(filePath, jsonString);
  } catch (error) {
    console.error("Erreur lors de l'exportation des données :", error);
  }
}


async function getConfig(){
  const data = await firebaseService.readFromFirebase(db, `${branch}/configs`);
  console.log(util.inspect(data, false, null, true /* enable colors */))
  // Obtenir le chemin local du sous-dossier où se trouve le fichier
  const localFolderPath = ensureLocalFolder(`data/${branch}`);
  const localFilePath = path.join(localFolderPath, "configs.json");
  await exportToJsonFile(data, localFilePath);
}

async function setConfig(){
  // Lire le fichier configs.json
  const configPath = path.join(__dirname, `data/${branch}/configs.json`);
  const configs = JSON.parse(fs.readFileSync(configPath));
  await firebaseService.updateNode(db, `${branch}/configs`,configs)
}

async function getAllPoint(){
  const data = await firebaseService.readFromFirebase(db, `${branch}/Users`);
  if (data){
    for (const [user,udata] of Object.entries(data)){
      await getUserPoint(user) ;
      await getUserCorrect(user) ;
    }
    await getVName();
  }
}

async function getUsers(){
  const data = await firebaseService.readFromFirebase(db, `${branch}/Users`);
  if (data){
    for (const [user,udata] of Object.entries(data)){
      delete data[user].deviceId
      delete data[user].LastPointage
      delete data[user].PtStartTime
      delete data[user].versionName
    }
    const localFolderPath = ensureLocalFolder(`data/${branch}`);
    const localFilePath = path.join(localFolderPath, `users.json`);
    await exportToJsonFile(data, localFilePath);
  }
}

async function getVName(){
  const data = await firebaseService.readFromFirebase(db, `${branch}/Users`);
  if (data){
    for (const [user,udata] of Object.entries(data)){
      delete data[user].deviceId
      delete data[user].LastPointage
      delete data[user].PtStartTime
      delete data[user].Name
    }
    const localFolderPath = ensureLocalFolder(`data/${branch}`);
    const localFilePath = path.join(localFolderPath, `vnames.json`);
    await exportToJsonFile(data, localFilePath);
  }
}

async function setUsers(){
  // Lire le fichier users.json
  const usersPath = path.join(__dirname, `data/${branch}/users.json`);
  const users = JSON.parse(fs.readFileSync(usersPath));
  await firebaseService.updateNode(db,`${branch}/Users`,users,true)
  const data = await firebaseService.readFromFirebase(db, `${branch}/Users`);
  for (const [user,udata] of Object.entries(data)){
    if (!users[user]){
      firebaseService.deleteNode(db,`${branch}/Users/${user}`);
    }
  }
}

async function getUserPoint(user){
  const localFolderPath = ensureLocalFolder(`data/${branch}`);
  const localFilePath = path.join(localFolderPath, `${user}.json`);
  //charge le contenu du fichier localFilePath dans old_data
  let old_data = {};
  if (fs.existsSync(localFilePath)) {
    old_data = JSON.parse(fs.readFileSync(localFilePath));
  }
  
  const data = await firebaseService.searchPointagesWithFetchedFalse(db, branch, user);
  if (data){
    if (!argv.t) {
      for (const [keyId,point] of Object.entries(data)){
        data[keyId].fetched = true
      }
      await firebaseService.updateNode(db, `${branch}/Pointages/${user}`, data);
    }
    for (const [keyId,point] of Object.entries(data)){
      //supprime fetched dans l'objet data car inutile en sortie fichier
      delete data[keyId].fetched
    }
    //fusionner old_data avec data avant d'exporter (éviter les doublons)
    const expdata = { ...old_data, ...data };
    await exportToJsonFile(expdata, localFilePath);
  }
}

async function getUserCorrect(user){
  const localFolderPath = ensureLocalFolder(`data/${branch}`);
  const localFilePath = path.join(localFolderPath, `co_${user}.json`);
  //charge le contenu du fichier localFilePath dans old_data
  let old_data = {};
  if (fs.existsSync(localFilePath)) {
    old_data = JSON.parse(fs.readFileSync(localFilePath));
  }

  const data = await firebaseService.searchCorrectionsWithFetchedFalse(db, branch, user);
  if (data){
    if (!argv.t) {
      for (const [keyId,point] of Object.entries(data)){
        data[keyId].fetched = true
      }
      await firebaseService.updateNode(db, `${branch}/Corrections/${user}`, data);
    }
    for (const [keyId,point] of Object.entries(data)){
      //supprime fetched dans l'objet data car inutile en sortie fichier
      delete data[keyId].fetched
    }

    //fusionner old_data avec data avant d'exporter (éviter les doublons)
    const expdata = { ...old_data, ...data };
    await exportToJsonFile(expdata, localFilePath);
  }
}

async function setAllPoint(){
  const data = await firebaseService.readFromFirebase(db, `${branch}/Users`);
  if (data){
    for (const [user,udata] of Object.entries(data)){
      await setUserPoint(user) ;
    }
  }
}

async function setUserPoint(user){
  // Lire le fichier configs.json
  const pointPath = path.join(__dirname, `data/${branch}/${user}.json`);
  if (await firebaseService.checkFileExists(pointPath)){
    const points = JSON.parse(fs.readFileSync(pointPath));
    await firebaseService.updateNode(`${branch}/Pointages/${user}`,points)
  }
}

// Exécuter l'opération en fonction des arguments
if (argv.g === 'configs') {
  await getConfig();
} else if (argv.g === 'point') {
  await getAllPoint();
} else if (argv.g === 'users') {
  await getUsers();
} else if (argv.s === 'configs') {
  await setConfig();
} else if (argv.s === 'users') {
  await setUsers();
} else if (argv.s === 'point') {
  await setAllPoint();
}

await firebaseService.closeFirebase(app);
/*rl.question('Appuyez sur Entrée pour quitter...', () => {
  rl.close();
});*/
process.exit(0); // Quitte le programme avec succès





/*
opérations :
*-Get users list
*-Update users list
*-Get Pointages
*-Get Pointages temp (not mark as fetched)
*-read config
*-write config
*/
