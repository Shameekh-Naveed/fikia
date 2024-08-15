import * as admin from 'firebase-admin';

const serviceAccount = require('../serviceKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://devdb-13a7b-default-rtdb.firebaseio.com',
});

export const firebaseAdmin = admin;
