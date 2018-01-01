"use strict";

// initialise Firebase to connect to our real-time database and store the most
// frequently-used references to key database locations
const firebase = require("./firebase.js");
const firebaseAuth = firebase.firebaseAuth;
const firebaseDb = firebase.firebaseDb;
const firebaseLocationsRef = firebase.firebaseLocationsRef;
const firebaseObjectsRef = firebase.firebaseObjectsRef;

// global values for managing the player/game state and storing DOM element refs
const globals = require("./globals.js").globals;
const player = globals.player;
const dom = globals.elements;

// models to apply consistent attributes and behaviours to game objects
const TravelDirection = require("../models/travel-direction.js").travelDirection;

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
firebaseAuth.onAuthStateChanged(function(user) {
  if (user) {
    console.log("user signed in:", user.uid);
    player.ref = firebaseDb.ref("/players/" + user.uid);
    player.uid = user.uid;

    // if a sign-in is observed, make sure we start observing this player's
    // database section to update the view in response to any actions they take
    setPlayerRefObserver(player.ref);

    // make sure the player has some initial player data set, if they are new
    checkInitialPlayerData(player.ref);
  } else {
    console.log("user signed out");
    dom.outputEl.innerHTML = "<p>[Logged out.]</p>";
    player.items = [];
    player.ref = undefined;
    player.uid = undefined;

    // if user not signed in, do an anonymous auth so they can still play the
    // game and optionally later do a non-anon auth to properly save their game
    console.log("attempting anon auth...");
    firebaseAuth.signInAnonymously().catch(function(error) {
      console.log("anonymous sign-in error:", error);
    });
  }
});

// set listener for playerRef in the database, so that when it changes the
// general situation description text is updated if needed
function setPlayerRefObserver(playerRef) {
  playerRef.on("value", function(snapshot) {
    let playerData = snapshot.val();
    console.log("fetched playerData:", playerData);

    if (playerData) {
      let outputEl = dom.outputEl;

      // update the local information about any items the player is holding
      firebaseObjectsRef.orderByChild("location").equalTo(player.uid).once("value", function(snapshot) {
        let playerItems = snapshot.val();
        if (playerItems) {
          // store an array of objects locally
          let itemsArray = [];
          for (let key in playerItems) {
            let item = playerItems[key];
            itemsArray.push(
              {
                description: item.description,
                name: item.name,
                size: item.size,
                uid: key
              }
            );
          }
          player.items = itemsArray;
          console.log("updated player.items:", player.items);
        }

        // check whether the player has moved to a new location
        let newPlayerLoc = playerData.location;
        if (player.location != newPlayerLoc) {
          // current location descriptor text does not match player's location, so
          // fetch updated location descriptor text to show instead
          firebaseLocationsRef.child(newPlayerLoc).once("value").then((snapshot) => {
            let newLocData = snapshot.val();
            if (newLocData) {
              // build the bulk of the description text for the player's current
              // location and append it to the output
              let outputTextNodes = buildOutputTextNodes(playerData, newLocData, player.items);
              outputEl.appendChild(outputTextNodes);

              // add the new travel direction options to the output, too
              outputEl.appendChild(travelDirEls(newLocData.travelDirections));

              // update global player state with this new location
              player.location = newPlayerLoc;
            }
          });
        }
      });

      // hide the initial loading indicator, if it's showing
      if (!dom.loadingIndicator.classList.contains("hide")) {
        dom.loadingIndicator.classList.add("hide");
      }
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
      updatedData["description"] = "There's nothing unusual about your appearance today.";
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

function buildOutputTextNodes(playerData, locationData, inventoryItems) {
  // add the new location descriptor text to the output, as well as the
  // current time descriptor text and a note about what the player is
  // holding (all wrapped in a set of <p></p> tags)
  let locText = document.createTextNode(`You are ${playerData.action} in ${locationData.description}.`);
  let timeText = document.createTextNode(` It is ${currentTimeStatement(playerData.ticksPassed)}.`);
  let invText = document.createTextNode(inventoryString(inventoryItems));
  let pEl = document.createElement("p");
  pEl.appendChild(locText);
  pEl.appendChild(timeText);
  pEl.appendChild(invText);

  return pEl;
}

// return a string to represent the player's inventory
function inventoryString(items) {
  if (items.length < 1) {
    return "";
  } else {
    // TODO: should actually return a span containing interactive spans here,
    // rather than simple text (and update the method above to expect a non-text
    // node)

    return " You are holding [items].";
  }
}

// this function produces the interactive DOM elements that players can click on
// to travel in a direction, from the array of travelDirections that we get from
// their current location in the database
function travelDirEls(travelDirs) {
  let travelDirInstances = travelDirs.map(travelDir => TravelDirection(travelDir));
  let travelDirWrap = document.createElement("p");
  let startTextNode = document.createTextNode("There is ");
  let endTextNode = document.createTextNode(".");

  travelDirWrap.appendChild(startTextNode);

  travelDirInstances.forEach((instance) => {
    travelDirWrap.appendChild(instance.element);
  });

  travelDirWrap.appendChild(endTextNode);

  return travelDirWrap;
}

const timeStatements = {
  0: "after midnight",
  1: "just before dawn",
  2: "early morning",
  3: "mid-morning",
  4: "late morning",
  5: "around midday",
  6: "early afternoon",
  7: "mid-afternoon",
  8: "late afternoon",
  9: "early evening",
  10: "late evening",
  11: "late at night"
};

// ticks represent minutes in this game, woohoo!
// so find out how many hours of the current day have elapsed, and then choose
// the closest timeStatement from the list above
function currentTimeStatement(ticksPassed) {
  let daysPassed = Math.floor(ticksPassed / 1440);
  let hoursPassed = Math.floor((ticksPassed - (daysPassed * 1440)) / 60);

  // for hoursPassed, we'll have a number between 0-23 so divide by two and
  // round down to get closest time statement
  let timeStatement = timeStatements[Math.floor(hoursPassed/2)];

  return timeStatement;
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
