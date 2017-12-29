"use strict";

// initialise Firebase to connect to our real-time database and store the most
// frequently-used references to key database locations
const firebasePlayerRef = require("./firebase.js").firebasePlayerRef;
const firebaseLocationsRef = require("./firebase.js").firebaseLocationsRef;

// models to apply consistent attributes and behaviours to game objects
const TravelDirection = require("../models/travel-direction.js").travelDirection;

// utilities
const throttle = require('lodash.throttle');

// key DOM elements
const loadingIndicator = document.getElementsByClassName("loading")[0];
const outputEl = document.getElementsByClassName("output")[0];

// observe the outputEl and, if its contents start to expand further than its
// height then scroll its overflow-scroll-hidden contents into view
if (window.MutationObserver) {
  // prepare a throttled version of the scrollTo animation function that won't
  // be called more than once per second, to avoid janky scrolling
  let throttledScrollTo = throttle(function() {
    scrollTo(outputEl, outputEl.scrollHeight - outputEl.clientHeight, 450);
  }, 1000);

  let observer = new window.MutationObserver(function() {
    if (outputEl.scrollHeight > outputEl.clientHeight) {
      throttledScrollTo();
    }
  });

  observer.observe(outputEl, {childList: true });
}

// set listener for playerRef in the database, so that when it changes the
// location description text is updated if needed
firebasePlayerRef.on("value", function(snapshot) {
  let playerData = snapshot.val();
  let playerLoc = playerData.location;

  console.log("fetched playerData:", playerData);

  if (outputEl.dataset.currentLoc != playerLoc) {
    // current location descriptor text does not match player's location, so
    // fetch updated location descriptor text to show instead
    firebaseLocationsRef.child("/" + playerLoc).once("value").then((snapshot) => {
      let newLocData = snapshot.val();
      if (newLocData) {
        // add the new location descriptor text to the output, as well as the
        // current time descriptor text (wrapped in <p></p> tags)
        let locText = document.createTextNode(`You are ${playerData.action} in ${newLocData.description}. `);
        let timeText = document.createTextNode(`It is ${currentTimeStatement(playerData.ticksPassed)}.`);
        let pEl = document.createElement("p");
        pEl.appendChild(locText);
        pEl.appendChild(timeText);
        outputEl.appendChild(pEl);

        // add the new travel direction options to the output
        outputEl.appendChild(travelDirEls(newLocData.travelDirections));

        // add this location to the output element's dataset to avoid fetching
        // it again unnecessarily
        outputEl.dataset.currentLoc = playerLoc;
      }
    });
  }

  // hide the initial loading indicator, if it's showing
  if (!loadingIndicator.classList.contains("hide")) {
    loadingIndicator.classList.add("hide");
  }
});

// check whether this is a new player, and give them initial data if so, or
// a returning player with existing data to fetch
firebasePlayerRef.once("value").then((snapshot) => {
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

  firebasePlayerRef.update(updatedData);
});

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
