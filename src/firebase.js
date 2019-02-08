// Initialise Firebase and export the auth method that allows us to sign users
// in, as well as reference(s) to key parts of the database

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

module.exports.auth = firebase.auth();
module.exports.db = database;
module.exports.dbLocationsRef = database.ref('/locations');
module.exports.dbItemsRef = database.ref('/objects');
