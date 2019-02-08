"use strict";

// initialise Firebase to connect to our real-time database and store the most
// frequently-used references to key database locations
const { auth, db, dbLocationsRef, dbItemsRef } = require("./firebase.js");

// import this beast for managing the player/game state and updating the DOM
const { player, dom } = require("./globals.js").globals;

// import models for applying consistent attributes and behaviours to game things
const Item = require("../models/item.js");
const TravelDirection = require("../models/travel-direction.js");

// utilities
const throttle = require('lodash.throttle');

// observe the outputEl and, if its contents start to expand further than its
// height then scroll its overflow-scroll-hidden contents into view
if (window.MutationObserver) {
  let outputEl = dom.outputEl;
  // prepare a throttled version of the scrollTo animation function that won't
  // be called more than once per second, to avoid janky scrolling
  let throttledScrollTo = throttle(function() {
    scrollTo(outputEl, outputEl.scrollHeight - outputEl.clientHeight, 450);
  }, 1000);

  // call this throttled scrollTo animation function when the outputEl's content
  // is longer/higher than its max-height
  let observer = new window.MutationObserver(function() {
    if (outputEl.scrollHeight > outputEl.clientHeight) {
      throttledScrollTo();
    }
  });

  observer.observe(outputEl, {childList: true });
}

// set an observer on the current user's auth status, to respond to any logins
// or logouts
auth.onAuthStateChanged(function(user) {
  if (user) {
    console.log("user signed in:", user.uid);
    player.ref = db.ref("/players/" + user.uid);
    player.uid = user.uid;

    // if a sign-in is observed, make sure we start observing this player's
    // database section to update the view in response to any actions they take
    setPlayerRefObserver(player.ref);

    // make sure the player has some initial player data set, if they are new
    checkInitialPlayerData(player.ref);

    // clear the output area ready for fresh new text <3
    dom.outputEl.innerHTML = "";
  } else {
    console.log("user signed out");
    dom.outputEl.innerHTML = "<p>[Logged out.]</p>";
    player.items = [];
    player.ref = undefined;
    player.uid = undefined;

    // if user not signed in, do an anonymous auth so they can still play the
    // game and optionally later do a non-anon auth to properly save their game
    console.log("attempting anon auth...");
    auth.signInAnonymously().catch(function(error) {
      console.log("anonymous sign-in error:", error);
    });
  }
});

// set listener for playerRef in the database, so that when it changes the
// general situation description text is updated if needed
function setPlayerRefObserver(playerRef) {
  playerRef.on("value", function(snapshot) {
    const playerData = snapshot.val();
    console.log("fetched OR updated playerData:", playerData);

    if (playerData) {
      // update the local information about any items the player is holding
      dbItemsRef.orderByChild("location").equalTo("on-player").once("value", function(snapshot) {
        const playerItems = snapshot.val();
        const itemsArray = [];
        if (playerItems) {
          // store an array of objects locally
          for (let key in playerItems) {
            let item = playerItems[key];
            itemsArray.push({
                description: item.description,
                name: item.name,
                size: item.size,
                uid: key
              });
          }
        }
        player.items = itemsArray;

        // check whether the player has moved to a new location
        const newPlayerLoc = playerData.location;
        if (player.location != newPlayerLoc) {
          // immediately update global player state with this new location
          player.location = newPlayerLoc;

          // current location descriptor text does not match player's location,
          // so fetch updated location descriptor text to show instead
          dbLocationsRef.child(newPlayerLoc).once("value").then(snapshot => {
            let newLocData = snapshot.val();
            if (newLocData) {
              // build the description text for the player's current location
              // and append it to the output
              dom.appendLocationDataToOutputEl({
                playerData,
                locationData: newLocData,
                travelDirs: newLocData.travelDirections.map(TravelDirection),
                items: player.items.map(Item)
              });
            }
          });
        }
      });

      // hide the initial loading indicator
      dom.loadingIndicator.classList.add("hide");
    }
  });
}

// check whether this is a new player, and give them initial data if so, or
// a returning player with existing data to fetch
function checkInitialPlayerData(playerRef) {
  playerRef.once("value").then((snapshot) => {
    let playerData = snapshot.val();
    let updatedData = {"connected": true};

    if (!playerData || !playerData.action) {
      updatedData["action"] = "standing";
    }

    if (!playerData || !playerData.description) {
      updatedData["description"] = "There's nothing unusual about your appearance.";
    }

    if (!playerData || !playerData.location) {
      updatedData["location"] = "0,0";
    }

    if (!playerData || !playerData.name) {
      updatedData["name"] = "you";
    }

    if (!playerData || !playerData.ticksPassed) {
      updatedData["ticksPassed"] = 240;
    }

    playerRef.update(updatedData);
  });
}

// animated scroll function (thanks to https://gist.github.com/andjosh/6764939)
function scrollTo(element, to, duration) {
  var start = element.scrollTop,
      change = to - start,
      currentTime = 0,
      increment = 20;

  var animateScroll = function() {
    currentTime += increment;
    var val = Math.easeInOutQuad(currentTime, start, change, duration);
    element.scrollTop = val;
    if(currentTime < duration) {
      setTimeout(animateScroll, increment);
    }
  };

  animateScroll();
}

//t = current time
//b = start value
//c = change in value
//d = duration
Math.easeInOutQuad = function (t, b, c, d) {
  t /= d/2;
	if (t < 1) return c/2*t*t + b;
	t--;
	return -c/2 * (t*(t-2) - 1) + b;
};
