// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";
import { getAuth, signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-auth.js";
import { collection, addDoc, getDocs, query, orderBy, limit, where } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";


// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyCejXgwQ9jDGSi-EbsvvEKP0AcXHM2gUHM",
    authDomain: "nonslop-game-logs.firebaseapp.com",
    projectId: "nonslop-game-logs",
    storageBucket: "nonslop-game-logs.firebasestorage.app",
    messagingSenderId: "534330213993",
    appId: "1:534330213993:web:af32470f3b6c989e3e84f8",
    measurementId: "G-E963CDCXX6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
//const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

let currentUserId = null;

// Sign in anonymously on load
signInAnonymously(auth).catch((error) => {
  console.error("Anonymous auth failed:", error);
});

// Listen for authentication state changes
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUserId = user.uid; // <-- unique anonymous user ID
  }
});

// Simple promise to wait for authentication
const authReady = new Promise((resolve, reject) => {
  // Set up auth state change listener
  onAuthStateChanged(auth, (user) => {
      if (user) {
          currentUserId = user.uid;
          console.log("Firebase authenticated");
          resolve(user.uid);
      }
  }, (error) => {
      console.error("Auth state change error:", error);
      reject(error);
  });
  
  // Start anonymous sign-in
  signInAnonymously(auth).catch((error) => {
      console.error("Anonymous auth failed:", error);
      reject(error);
  });
});

function getUserEnvironmentInfo() {
  const userAgent = navigator.userAgent;
  
  // Simple OS detection
  let os = "Unknown OS";
  if (userAgent.includes("Win")) os = "Windows";
  else if (userAgent.includes("Mac")) os = "macOS";
  else if (userAgent.includes("X11")) os = "UNIX";
  else if (userAgent.includes("Linux")) os = "Linux";
  else if (/Android/.test(userAgent)) os = "Android";
  else if (/iPhone|iPad|iPod/.test(userAgent)) os = "iOS";

  // Simple Browser detection
  let browser = "Unknown Browser";
  if (/Chrome\/(\S+)/.test(userAgent) && !/Edge|OPR/.test(userAgent)) browser = "Chrome";
  else if (/Firefox\/(\S+)/.test(userAgent)) browser = "Firefox";
  else if (/Safari\/(\S+)/.test(userAgent) && !/Chrome/.test(userAgent)) browser = "Safari";
  else if (/Edge\/(\S+)/.test(userAgent)) browser = "Edge";
  else if (/OPR\/(\S+)/.test(userAgent)) browser = "Opera";

  return {
    os,
    browser,
    userAgent // Storing full UA string can help with future debugging
  };
}


function getDateAndTime(timestamp) {
  const dateObj = new Date(timestamp);

  // Date in YYYY-MM-DD format
  const date = dateObj.getUTCFullYear() + "-" +
               (dateObj.getUTCMonth() + 1).toString().padStart(2, '0') + "-" +
               dateObj.getUTCDate().toString().padStart(2, '0');

  // Time in HH:MM format (UTC)
  const time = dateObj.getUTCHours().toString().padStart(2, '0') + ":" +
               dateObj.getUTCMinutes().toString().padStart(2, '0');

  return { date, time };
}


// Function to save interaction - now waits for auth if needed
async function saveInteraction(interaction, dbName) {

  await authReady

  const userEnv = getUserEnvironmentInfo();
  const timestamp = Date.now();
  const { date, time } = getDateAndTime(timestamp);

  try {
      const docRef = await addDoc(collection(db, dbName), {
          userId: currentUserId || "unknown",
          userEnvironment: userEnv,
          timestamp: timestamp,
          date: date,
          time: time,
          timezone: 'utc',
          interaction: interaction
      });
    
      console.log("Firebase document written with ID:", docRef.id);
      return docRef.id;
  } catch (e) {
      console.error("Error adding document to Firebase:", e);
      return null;
  }
}

async function waitForAuth() {
  if (currentUserId) {
      return currentUserId;
  }
  
  try {
      return await authReady;
  } catch (error) {
      console.error("Authentication failed:", error);
      return null;
  }
}

// Function to save a high score
async function saveHighScore(scoreData) {
  await authReady;
  
  const timestamp = Date.now();
  const { date, time } = getDateAndTime(timestamp);
  
  // Debug: Log the full score data object to check all fields
  console.log("Full scoreData object:", JSON.stringify(scoreData, null, 2));
  
  try {
    // Create the data object to save
    const highScoreData = {
      userId: currentUserId || "unknown",
      username: scoreData.username || "Anonymous Player",
      score: scoreData.score || 0,
      mode: scoreData.mode || "easy",
      timestamp: timestamp,
      date: date,
      time: time,
      timezone: 'utc',
      wordCount: scoreData.totalWordCount || 0,
      aiWordCount: scoreData.failCount || 0,
      originalWordCount: scoreData.originalWordCount || 0,
      inputText: scoreData.inputText || ""
    };
    
    // Debug: Log the exact data being saved to Firebase
    console.log("Saving to Firebase:", JSON.stringify(highScoreData, null, 2));
    
    const docRef = await addDoc(collection(db, 'highscores'), highScoreData);
    
    console.log("High score saved with ID:", docRef.id);
    
    // Debug: Verify the document was saved by retrieving it
    try {
      const savedData = await getTopScores(scoreData.mode, 1);
      console.log("Most recent saved high score:", savedData[0] ? JSON.stringify(savedData[0], null, 2) : "No data");
    } catch (readError) {
      console.error("Error verifying saved high score:", readError);
    }
    
    return docRef.id;
  } catch (e) {
    console.error("Error adding high score:", e);
    console.error("Error details:", e.message, e.code);
    return null;
  }
}

// Function to get top scores
async function getTopScores(gameMode = null, maxResults = 10) {
  await authReady;
  
  try {
    let scoresQuery;
    let indexErrorHandled = false;
    
    // Try with the ideal query first
    try {
      if (gameMode) {
        // Filter by mode if provided
        scoresQuery = query(
          collection(db, 'highscores'),
          where("mode", "==", gameMode),
          orderBy("score", "desc"),
          limit(maxResults)
        );
      } else {
        // Get all scores regardless of mode
        scoresQuery = query(
          collection(db, 'highscores'),
          orderBy("score", "desc"),
          limit(maxResults)
        );
      }
      
      const querySnapshot = await getDocs(scoresQuery);
      const scores = [];
      
      querySnapshot.forEach((doc) => {
        scores.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return scores;
    } catch (indexError) {
      // If we hit an index error, handle it with a fallback approach
      if (indexError.message && indexError.message.includes("requires an index")) {
        console.warn("Firebase index error detected. Using fallback query method.");
        indexErrorHandled = true;
        
        // Fallback: Get all scores and filter/sort client-side
        // This is less efficient but works without the composite index
        const fallbackQuery = query(collection(db, 'highscores'));
        let allScores = [];
        
        try {
          const snapshot = await getDocs(fallbackQuery);
          snapshot.forEach((doc) => {
            // Ensure we have valid score data
            const data = doc.data();
            if (data && typeof data.score === 'number') {
              allScores.push({
                id: doc.id,
                ...data
              });
            }
          });
          
          // Manual filtering and sorting
          let filteredScores = gameMode 
            ? allScores.filter(score => score.mode === gameMode)
            : allScores;
            
          // Sort by score descending - handle potential invalid score values
          filteredScores.sort((a, b) => {
            const scoreA = typeof a.score === 'number' ? a.score : 0;
            const scoreB = typeof b.score === 'number' ? b.score : 0;
            return scoreB - scoreA;
          });
          
          // Limit to requested number
          console.log(`Fallback method returned ${filteredScores.length} scores before limiting to ${maxResults}`);
          return filteredScores.slice(0, maxResults);
        } catch (fallbackError) {
          console.error("Error in fallback query method:", fallbackError);
          // Return empty array as last resort
          return [];
        }
      } else {
        // If it's not an index error, re-throw it
        throw indexError;
      }
    }
  } catch (e) {
    console.error("Error getting top scores:", e);
    if (e.message && e.message.includes("requires an index")) {
      console.error("This error requires creating a Firebase index. Please visit the following URL to create the necessary index:");
      console.error("https://console.firebase.google.com/project/nonslop-game-logs/firestore/indexes");
      console.error("You need to create a composite index on the 'highscores' collection with fields 'mode' (Ascending) and 'score' (Descending)");
      console.error("Until the index is created, the application will use a less efficient fallback method.");
    }
    return [];
  }
}

// Check if the score is a high score
async function isHighScore(score, gameMode, maxResults = 10) {
  try {
    // Validate input parameters
    if (typeof score !== 'number' || isNaN(score)) {
      console.warn("Invalid score value provided to isHighScore:", score);
      score = 0; // Default to 0 if invalid
    }
    
    // Get top scores using our improved function
    const topScores = await getTopScores(gameMode, maxResults);
    console.log(`Retrieved ${topScores.length} top scores for ${gameMode} mode`);
    
    // If we have fewer than maxResults scores, it's automatically a high score
    if (topScores.length < maxResults) {
      console.log(`Less than ${maxResults} scores on leaderboard, this is a high score`);
      return true;
    }
    
    // If the array is empty (despite expecting scores) assume it's a high score
    if (topScores.length === 0) {
      console.warn("No scores retrieved, assuming this is a high score");
      return true;
    }
    
    // Otherwise, check if this score is higher than the lowest score on the board
    const lowestScore = topScores[topScores.length - 1].score;
    const isHigh = score > lowestScore;
    console.log(`Score ${score} compared to lowest on board ${lowestScore}: ${isHigh ? "is" : "is not"} a high score`);
    return isHigh;
  } catch (e) {
    console.error("Error checking if high score:", e);
    // In case of error, assume it is a high score to give the player the benefit of the doubt
    return true;
  }
}

export { 
  saveInteraction, 
  getUserEnvironmentInfo, 
  waitForAuth, 
  saveHighScore, 
  getTopScores, 
  isHighScore 
};
