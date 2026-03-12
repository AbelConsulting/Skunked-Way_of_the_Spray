
/*!
 * Skunked: Way of the Spray
 * Copyright (c) 2026 Mephitideus Interactive. All Rights Reserved.
 * Proprietary and confidential — unauthorized copying, distribution, or use
 * of this file, via any medium, is strictly prohibited. See LICENSE for terms.
 */
// js/firebase.js
// Global leaderboard integration via Firebase Firestore.

import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js';
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBSLz2KAgxnSbYZ8pYGSZH3gHM5DVgI1Nk",
  authDomain: "studio-3829586481-2a2cf.firebaseapp.com",
  projectId: "studio-3829586481-2a2cf",
  storageBucket: "studio-3829586481-2a2cf.firebasestorage.app",
  messagingSenderId: "209976896356",
  appId: "1:209976896356:web:c1d442edcfe4919b892871"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const SCORES_COLLECTION = 'scores';

/**
 * Checks if Firestore is reachable.
 * @returns {Promise<boolean>}
 */
export async function checkHealth() {
  try {
    await getDocs(query(collection(db, SCORES_COLLECTION), limit(1)));
    return true;
  } catch {
    return false;
  }
}

/**
 * Submits a score to the Firestore leaderboard.
 * @param {string} name  The player name / gamer tag.
 * @param {number} score The score achieved.
 * @param {string[]} [_achievements] Unused — kept for call-site compat.
 * @returns {Promise<void>}
 */
export async function submitScore(name, score, _achievements) {
  try {
    await addDoc(collection(db, SCORES_COLLECTION), {
      initials: name,
      score: score,
      date: serverTimestamp()
    });
  } catch (e) {
    console.error('Error submitting score:', e);
  }
}

/**
 * Fetches the top scores from Firestore, ordered by score descending.
 * @param {number} [count=10] How many top scores to retrieve.
 * @returns {Promise<Array<{name: string, score: number, timestamp?: Date}>>}
 */
export async function getHighScores(count = 10) {
  try {
    const q = query(
      collection(db, SCORES_COLLECTION),
      orderBy('score', 'desc'),
      limit(count)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        name: data.initials || '???',
        score: data.score,
        timestamp: data.date ? data.date.toDate() : null,
        achievements: data.achievements || [],
      };
    });
  } catch (e) {
    console.error('Error fetching scores:', e);
    return [];
  }
}
