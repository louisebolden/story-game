"use strict";

// global values for managing player/game state and storing DOM element refs
const globals = require("../src/globals.js").globals;
const player = globals.player;
const dom = globals.elements;

// this model wraps object data that has been fetched from the database in an
// object that has additional properties and methods, notably a DOM element that
// can be used to display a representation of the object in the view's output
// area so that the player can click and interact with it

function object(object) {
  let objectObj = Object.assign({}, object);
  let element = document.createElement('span');

  element.classList.add("interactive");
  element.dataset.uid = object.key();
  element.innerText = object.name;

}
