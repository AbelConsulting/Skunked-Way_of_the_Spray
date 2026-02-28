
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = Config.FIREBASE_CONFIG;

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const SCOREBOARD_COLLECTION = 'scores';

/**
 * Submits a score to the Firebase Firestore database.
 * @param {string} name The name of the player.
 * @param {number} score The score of the player.
 * @returns {Promise<void>}
 */
export async function submitScore(name, score) {
  try {
    await addDoc(collection(db, SCOREBOARD_COLLECTION), {
      name: name,
      score: score,
      timestamp: new Date()
    });
  } catch (e) {
    console.error("Error adding document: ", e);
  }
}

/**
 * Fetches the top 10 scores from the Firebase Firestore database.
 * @returns {Promise<Array<{name: string, score: number}>>} A promise that resolves to an array of the top 10 scores.
 */
export async function getHighScores() {
  const scores = [];
  try {
    const q = query(collection(db, SCOREBOARD_COLLECTION), orderBy("score", "desc"), limit(10));
    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      scores.push(doc.data());
    });
  } catch (e) {
    console.error("Error getting documents: ", e);
  }
  return scores;
}
