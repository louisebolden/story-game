// Initialise Firebase

/* global firebase */

firebase.initializeApp({
  apiKey: "AIzaSyDfU_kcKcd2KFuthYi0zwvCPXm3ibsNHcg",
  authDomain: "storygame-e828c.firebaseapp.com",
  databaseURL: "https://storygame-e828c.firebaseio.com",
  projectId: "storygame-e828c",
  storageBucket: "storygame-e828c.appspot.com",
  messagingSenderId: "819668886010"
});

let database = firebase.database();

module.exports.firebasePlayerRef = database.ref('/players/experimentUserId');
module.exports.firebaseLocationsRef = database.ref('/locations');
