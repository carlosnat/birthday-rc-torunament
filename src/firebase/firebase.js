// src/firebase/firebase.js
// Inicialización del SDK de Firebase (RTDB). Proyecto: rc-race-timing.
// RTDB es la única fuente de verdad; no hay servidor que procese eventos.

import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: 'AIzaSyBiish4en_j69TTA73_kEJvWDjKkvLHq5I',
  authDomain: 'rc-race-timing.firebaseapp.com',
  databaseURL: 'https://rc-race-timing-default-rtdb.firebaseio.com',
  projectId: 'rc-race-timing',
  storageBucket: 'rc-race-timing.firebasestorage.app',
  messagingSenderId: '755470746306',
  appId: '1:755470746306:web:5ada5069c22f85fe2c715b',
  measurementId: 'G-9JVD4B1GY7',
}

const app = initializeApp(firebaseConfig)
export const db = getDatabase(app)
