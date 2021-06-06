"use strict";

// global values for managing player/game state and storing DOM element refs
const { dom, player } = require("../src/globals.js").globals;

// we'll be getting the item's actions from firebase on click
const { dbItemsRef } = require("../src/firebase.js");

// this model wraps item data that has been fetched from the database in an
// object that has additional properties and methods, notably a DOM element that
// can be used to display a representation of the item in the view's output
// area so that the player can click and interact with it

function item(item) {
  let itemObj = Object.assign({}, item);
  let element = document.createElement("span");

  element.classList.add("interactive");
  element.dataset.description = item.description;
  element.dataset.name = item.name;
  element.dataset.uid = item.uid;
  element.innerText = item.name;

  // when a player interacts with an object, its description and actions show
  element.onclick = itemClick;

  itemObj["element"] = element;

  return itemObj;
}

module.exports = item;

const itemClick = (event) => {
  if (!player.checkRef()) {
    return false;
  }

  // all existing interactive elements should stop being interactive once
  // one is clicked - those choices are no longer available to the player
  dom.deactivateAllInteractiveEls();

  const item = event.target;
  const actionEl = document.createElement("p");
  actionEl.innerText = `You look at the ${item.dataset.name}.`;
  dom.outputEl.appendChild(actionEl);

  // a tick or two passes during this inspection of the item
  let tickCount = 0;
  const interval = window.setInterval(() => {
    dom.appendWaitIndicatorToOutputEl();
    tickCount++;

    if (tickCount === 1) {
      // after a moment, show the item's full description
      const itemDescriptionEl = document.createElement("p");
      itemDescriptionEl.innerText = item.dataset.description;
      dom.outputEl.appendChild(itemDescriptionEl);
    }

    if (tickCount === 2) {
      // after another moment, can see the item's actions (if any)
      dbItemsRef.child(item.dataset.uid).once("value", (snapshot) => {
        const itemData = snapshot.val();
        console.log("itemData:", itemData);
        if (itemData && itemData.actions) {
          const permittedActionEls =
            filterPermittedActions(itemData).map(createItemActionEl);
          const actionsNode = document.createElement("p");

          actionsNode.appendChild(document.createTextNode("You could "));

          permittedActionEls.forEach((el, index) => {
            actionsNode.appendChild(el);

            actionsNode.appendChild(
              document.createTextNode(` the ${itemData.name}`)
            );

            if (permittedActionEls.length > 1) {
              if (index === permittedActionEls.length - 2) {
                actionsNode.appendChild(document.createTextNode(" or "));
              } else if (index < permittedActionEls.length - 2) {
                actionsNode.appendChild(document.createTextNode(", "));
              }
            }
          });

          actionsNode.appendChild(document.createTextNode("."));
          dom.outputEl.appendChild(actionsNode);
        }

        window.clearInterval(interval);

        // show the 'Done' interactable once we've printed everything else
        dom.appendGoBackElToOutputEl();

        // add a dot of breathing space
        dom.appendWaitIndicatorToOutputEl();
      });

      player.increaseTicksPassedBy(1);
    }
  }, 1000);
};

const filterPermittedActions = (itemData) => {
  const actions = itemData.actions;
  const permittedActions = [];

  for (let key in actions) {
    const action = actions[key];
    const conditions = action.conditions;

    if (
      (conditions.includes("on-player") && itemData.location === "on-player") ||
      (conditions.includes("not-on-player") &&
        itemData.location !== "on-player")
    ) {
      permittedActions.push({
        description: action.description,
        done: action.return,
        itemName: itemData.name,
        name: key,
        ticksRequired: action.ticksRequired,
      });
    }
  }

  return permittedActions;
};

const createItemActionEl = (action) => {
  const span = document.createElement("span");
  span.classList.add("interactive");
  span.innerText = action.name;
  span.onclick = (event) => {
    if (!player.checkRef()) {
      return false;
    }

    const ticksRequired = parseInt(action.ticksRequired, 10);
    let tickCount = 0;

    // show statement of action taken immediately
    const actionStatement = document.createElement("p");
    actionStatement.innerText = `You ${action.name} the ${action.itemName}.`;
    dom.outputEl.appendChild(actionStatement);

    // start interval timer according to ticksRequired
    const interval = window.setInterval(() => {
      dom.appendWaitIndicatorToOutputEl();
      tickCount++;

      // after 1 tick, show description/result of action
      if (tickCount === 1) {
        const actionDescription = document.createElement("p");
        actionDescription.innerText = action.description;
        dom.outputEl.appendChild(actionDescription);

        // and the goBack action also
        dom.appendGoBackElToOutputEl(`${action.done} the ${action.itemName}`);
      }

      if (tickCount === ticksRequired) {
        player.increaseTicksPassedBy(ticksRequired);
        window.clearInterval(interval);
      }
    }, 1000);
  };
  return span;
};
