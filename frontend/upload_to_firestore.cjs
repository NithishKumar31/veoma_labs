const fs = require('fs');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyBiUFzJo3fxBdS_GH9vC4RAi-CMFQVhRow",
  authDomain: "veoma-labs.firebaseapp.com",
  projectId: "veoma-labs",
  storageBucket: "veoma-labs.firebasestorage.app",
  messagingSenderId: "858077470175",
  appId: "1:858077470175:web:670615e8f545dd6a23f86a"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function run() {
  const dataPath = path.join(__dirname, 'sync_data.json');
  if (!fs.existsSync(dataPath)) {
    console.error('sync_data.json not found!');
    process.exit(1);
  }
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log('Uploading to Firebase Cloud Firestore (veoma-labs)...');

  // Upload Customers
  for (const c of data.customers || []) {
    await setDoc(doc(db, 'customers', String(c.id)), c, { merge: true });
    console.log(`Uploaded customer: ${c.name} (${c.id})`);
  }

  // Upload Orders
  for (const o of data.orders || []) {
    await setDoc(doc(db, 'orders', String(o.id)), o, { merge: true });
    console.log(`Uploaded order: ${o.order_id || o.id}`);
  }

  // Upload Printers
  for (const p of data.printers || []) {
    await setDoc(doc(db, 'printers', String(p.id)), p, { merge: true });
    console.log(`Uploaded printer: ${p.name} (${p.id})`);
  }

  // Upload General Settings
  await setDoc(doc(db, 'settings', 'general'), {
    company_settings: {
      COMPANY_NAME: 'VEOMA LABS',
      COMPANY_GSTIN: '33HGMPK9319D1Z7',
      COMPANY_ADDRESS: '97, Kundalakeshi street, Camp road, Tambaram',
      SUPPLIER_STATE: 'Tamil Nadu'
    },
    updated_at: new Date().toISOString()
  }, { merge: true });
  console.log('Uploaded settings: general');

  console.log('=== ALL DATA SUCCESSFULLY SYNCED TO FIREBASE FIRESTORE! ===');
  process.exit(0);
}

run().catch((err) => {
  console.error('Failed to sync to Firestore:', err);
  process.exit(1);
});
