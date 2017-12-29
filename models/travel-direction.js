"use strict";

// we need a reference to the player's data in the database, so that if a travel
// direction is chosen the player's location in the game can be updated to match
const firebasePlayerRef = require("../src/firebase.js").firebasePlayerRef;

// key DOM elements
const outputEl = document.getElementsByClassName("output")[0];

// this function wraps the travelDirection information from the database with
// the functionality needed to actually allow the player to travel in that
// direction, updating their time (ticksPassed) and location attributes, and
// returns a more useful travelDirection object that includes an interactive
// element to show in the output area that the player can click on to move
function travelDirection(travelDirection) {
  let travelDirObj = Object.assign({}, travelDirection);
  let element = document.createElement('span');

  element.classList.add("interactive");
  element.innerText = travelDirection.name;

  // when this element is clicked on, the player should move to the correct new
  // location and time should pass accordingly
  element.onclick = function() {
    let newLoc = travelDirection.target;

    if (newLoc) {
      // all existing interactive elements should stop being interactive once
      // one is clicked - those choices are no longer available to the player
      Array.from(document.getElementsByClassName("interactive")).forEach((el) => {
        el.classList.remove("interactive");
        el.onclick = null;
      });

      // show the movementDescriptor in the output area
      let movementDescEl = document.createElement("p");
      movementDescEl.innerText = travelDirection.movementDescriptor;
      outputEl.appendChild(movementDescEl);

      // display a wait indicator to show the time taken for this travel
      let waitTime = travelDirection.waitTime;
      let count = 0;

      let interval = window.setInterval(function() {
        let waitIndicator = document.createElement("p");
        waitIndicator.classList.add("wait-indicator");
        waitIndicator.innerText = ".";
        outputEl.appendChild(waitIndicator);

        // wait until waitTime is up before actually completing this travel
        count++;
        if (count >= waitTime) {
          // travel takes time, so update the player's ticksPassed value with
          // the amount of ticks taken by this action, as well as updating the
          // player's location value to match their arrival destination
          firebasePlayerRef.child("ticksPassed").once("value").then((snapshot) => {
            let currentTicks = snapshot.val() || 0;
            let newTotalTicks = currentTicks + waitTime;

            firebasePlayerRef.update({location: newLoc, ticksPassed: newTotalTicks});
          });

          window.clearInterval(interval);
        }
      }, 1000);
    }
  };

  // okay, we built an interactive element with a mega onclick handler so now
  // add that to this travelDirection object ready to be displayed in the view
  travelDirObj['element'] = element;

  return travelDirObj;
}

module.exports.travelDirection = travelDirection;
