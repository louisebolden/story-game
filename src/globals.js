const globals = {
  dom: {
    // store references to always-present, frequently-used elements
    loadingIndicator: document.getElementsByClassName("loading")[0],
    outputEl: document.getElementsByClassName("output")[0],
    // store snapshot of locationData after rendering the current location, so
    // it can be re-rendered if the player wants to take another look around
    mostRecentLocationData: undefined,
    // methods to make changes to the DOM
    appendLocationDataToOutputEl: function({playerData, locationData, travelDirs, items}) {
      this.outputEl.appendChild(locationDesc(playerData, locationData));

      // add the player's inventory items to the output
      this.outputEl.appendChild(inventoryDesc(items));

      // add the new travel direction options to the output, too
      this.outputEl.appendChild(travelDirEls(travelDirs));

      this.mostRecentLocationData = {
        playerData,
        locationData,
        travelDirs: withClonedNodes(travelDirs),
        items: withClonedNodes(items)
      };
    },
    appendGoBackElToOutputEl: function(text) {
      const goBackEl = document.createElement("p");
      const span = document.createElement("span");
      span.classList.add("interactive");
      span.innerText = text || "Look around.";
      span.onclick = event => {
        this.deactivateAllInteractiveEls();
        this.appendLocationDataToOutputEl(this.mostRecentLocationData);
      };
      goBackEl.appendChild(span);
      this.outputEl.appendChild(goBackEl);
    },
    appendWaitIndicatorToOutputEl: function() {
      const waitIndicator = document.createElement("p");
      waitIndicator.classList.add("wait-indicator");
      waitIndicator.innerText = ".";
      this.outputEl.appendChild(waitIndicator);
    },
    deactivateAllInteractiveEls: function() {
      Array.from(document.getElementsByClassName("interactive")).forEach((el) => {
        el.classList.remove("interactive");
        el.onclick = null;
      });
    }
  },
  player: {
    items: [],
    location: undefined,
    ref: undefined,
    uid: undefined
  }
};

module.exports.globals = globals;


const locationDesc = (playerData, locationData) => {
  // add the new location descriptor text to the output, as well as the
  // current time descriptor text and a note about what the player is
  // holding (all wrapped in a set of <p></p> tags)
  let pEl = document.createElement("p");

  pEl.innerHTML = `
    You are ${playerData.action} in ${locationData.description}.
    It is ${currentTimeStatement(playerData.ticksPassed)}.
  `;

  return pEl;
};

// produce DOM elements that represent the player's inventory
const inventoryDesc = itemInstances => {
  if (itemInstances.length > 0) {
    const itemNode = document.createElement("p");
    const startTextNode = document.createTextNode("You are holding ");
    const endTextNode = document.createTextNode(".");

    itemNode.appendChild(startTextNode);

    itemInstances.forEach((instance, index) => {
      itemNode.appendChild(document.createTextNode("a "));
      itemNode.appendChild(instance.element);
      if (itemInstances.length > 1) {
        if (index === itemInstances.length - 2) {
          itemNode.appendChild(document.createTextNode(" and "));
        } else if (index < itemInstances.length - 2) {
          itemNode.appendChild(document.createTextNode(", "));
        }
      }
    });

    itemNode.appendChild(endTextNode);

    return itemNode;
  }

  return document.createTextNode("");
};

// this function produces the interactive DOM elements that players can click on
// to travel in a direction
const travelDirEls = travelDirInstances => {
  let travelDirNode = document.createElement("p");
  let startTextNode = document.createTextNode("There is ");
  let endTextNode = document.createTextNode(".");

  travelDirNode.appendChild(startTextNode);

  travelDirInstances.forEach((instance) => {
    travelDirNode.appendChild(instance.element);
  });

  travelDirNode.appendChild(endTextNode);

  return travelDirNode;
};

// ticks represent minutes in this game, woohoo!
// so find out how many hours of the current day have elapsed, and then choose
// the closest timeStatement from the list above
const currentTimeStatement = ticksPassed => {
  let daysPassed = Math.floor(ticksPassed / 1440);
  let hoursPassed = Math.floor((ticksPassed - (daysPassed * 1440)) / 60);

  // for hoursPassed, we'll have a number between 0-23 so divide by two and
  // round down to get closest time statement
  let timeStatement = timeStatements[Math.floor(hoursPassed/2)];

  return timeStatement;
};

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

// when we store the most recent location data for re-rendering when the player
// looks around repeatedly, we need to make sure that the elements we're storing
// are fresh clones of the originals - i.e. with classnames and click handlers
// still attached regardless of whether the originals become non-interactive at
// any point during their lifetime
const withClonedNodes = objects => {
  return objects.map(object => {
    const clonedElement = object.element.cloneNode(true); // deep clone pls
    clonedElement.onclick = object.element.onclick;
    return Object.assign({}, object, { element: clonedElement });
  });
};