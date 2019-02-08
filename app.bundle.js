/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	// initialise Firebase to connect to our real-time database and store the most
	// frequently-used references to key database locations

	var _require = __webpack_require__(1),
	    auth = _require.auth,
	    db = _require.db,
	    dbLocationsRef = _require.dbLocationsRef,
	    dbItemsRef = _require.dbItemsRef;

	// import this beast for managing the player/game state and updating the DOM


	var _require$globals = __webpack_require__(2).globals,
	    player = _require$globals.player,
	    dom = _require$globals.dom;

	// import models for applying consistent attributes and behaviours to game things


	var Item = __webpack_require__(6);
	var TravelDirection = __webpack_require__(3);

	// utilities
	var throttle = __webpack_require__(4);

	// observe the outputEl and, if its contents start to expand further than its
	// height then scroll its overflow-scroll-hidden contents into view
	if (window.MutationObserver) {
	  (function () {
	    var outputEl = dom.outputEl;
	    // prepare a throttled version of the scrollTo animation function that won't
	    // be called more than once per second, to avoid janky scrolling
	    var throttledScrollTo = throttle(function () {
	      scrollTo(outputEl, outputEl.scrollHeight - outputEl.clientHeight, 450);
	    }, 1000);

	    // call this throttled scrollTo animation function when the outputEl's content
	    // is longer/higher than its max-height
	    var observer = new window.MutationObserver(function () {
	      if (outputEl.scrollHeight > outputEl.clientHeight) {
	        throttledScrollTo();
	      }
	    });

	    observer.observe(outputEl, { childList: true });
	  })();
	}

	// set an observer on the current user's auth status, to respond to any logins
	// or logouts
	auth.onAuthStateChanged(function (user) {
	  if (user) {
	    console.log("user signed in:", user.uid);
	    player.ref = db.ref("/players/" + user.uid);
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
	    auth.signInAnonymously().catch(function (error) {
	      console.log("anonymous sign-in error:", error);
	    });
	  }
	});

	// set listener for playerRef in the database, so that when it changes the
	// general situation description text is updated if needed
	function setPlayerRefObserver(playerRef) {
	  playerRef.on("value", function (snapshot) {
	    var playerData = snapshot.val();
	    console.log("fetched OR updated playerData:", playerData);

	    if (playerData) {
	      // update the local information about any items the player is holding
	      dbItemsRef.orderByChild("location").equalTo("on-player").once("value", function (snapshot) {
	        var playerItems = snapshot.val();
	        var itemsArray = [];
	        if (playerItems) {
	          // store an array of objects locally
	          for (var key in playerItems) {
	            var item = playerItems[key];
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
	        var newPlayerLoc = playerData.location;
	        if (player.location != newPlayerLoc) {
	          // current location descriptor text does not match player's location, so
	          // fetch updated location descriptor text to show instead
	          dbLocationsRef.child(newPlayerLoc).once("value").then(function (snapshot) {
	            var newLocData = snapshot.val();
	            if (newLocData) {
	              // build the description text for the player's current location
	              // and append it to the output
	              dom.appendLocationDataToOutputEl({
	                playerData: playerData,
	                locationData: newLocData,
	                travelDirs: newLocData.travelDirections.map(TravelDirection),
	                items: player.items.map(Item)
	              });

	              // update global player state with this new location
	              player.location = newPlayerLoc;
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
	  playerRef.once("value").then(function (snapshot) {
	    var playerData = snapshot.val();
	    var updatedData = { "connected": true };

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

	  var animateScroll = function animateScroll() {
	    currentTime += increment;
	    var val = Math.easeInOutQuad(currentTime, start, change, duration);
	    element.scrollTop = val;
	    if (currentTime < duration) {
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
	  t /= d / 2;
	  if (t < 1) return c / 2 * t * t + b;
	  t--;
	  return -c / 2 * (t * (t - 2) - 1) + b;
	};

/***/ },
/* 1 */
/***/ function(module, exports) {

	"use strict";

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

	var database = firebase.database();

	module.exports.auth = firebase.auth();
	module.exports.db = database;
	module.exports.dbLocationsRef = database.ref('/locations');
	module.exports.dbItemsRef = database.ref('/objects');

/***/ },
/* 2 */
/***/ function(module, exports) {

	"use strict";

	var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

	var globals = {
	  dom: {
	    // store references to always-present, frequently-used elements
	    loadingIndicator: document.getElementsByClassName("loading")[0],
	    outputEl: document.getElementsByClassName("output")[0],
	    // store snapshot of locationData after rendering the current location, so
	    // it can be re-rendered if the player wants to take another look around
	    mostRecentLocationData: undefined,
	    // methods to make changes to the DOM
	    appendLocationDataToOutputEl: function appendLocationDataToOutputEl(_ref) {
	      var playerData = _ref.playerData,
	          locationData = _ref.locationData,
	          travelDirs = _ref.travelDirs,
	          items = _ref.items;

	      this.outputEl.appendChild(locationDesc(playerData, locationData));

	      // add the player's inventory items to the output
	      this.outputEl.appendChild(inventoryDesc(items));

	      // add the new travel direction options to the output, too
	      this.outputEl.appendChild(travelDirEls(travelDirs));

	      this.mostRecentLocationData = {
	        playerData: playerData,
	        locationData: locationData,
	        travelDirs: withClonedNodes(travelDirs),
	        items: withClonedNodes(items)
	      };
	    },
	    appendGoBackElToOutputEl: function appendGoBackElToOutputEl(text) {
	      var _this = this;

	      var goBackEl = document.createElement("p");
	      var span = document.createElement("span");
	      span.classList.add("interactive");
	      span.innerText = text || "Look around.";
	      span.onclick = function (event) {
	        _this.deactivateAllInteractiveEls();
	        _this.appendLocationDataToOutputEl(_this.mostRecentLocationData);
	      };
	      goBackEl.appendChild(span);
	      this.outputEl.appendChild(goBackEl);
	    },
	    appendWaitIndicatorToOutputEl: function appendWaitIndicatorToOutputEl() {
	      var waitIndicator = document.createElement("p");
	      waitIndicator.classList.add("wait-indicator");
	      waitIndicator.innerText = ".";
	      this.outputEl.appendChild(waitIndicator);
	    },
	    deactivateAllInteractiveEls: function deactivateAllInteractiveEls() {
	      Array.from(document.getElementsByClassName("interactive")).forEach(function (el) {
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

	var locationDesc = function locationDesc(playerData, locationData) {
	  // add the new location descriptor text to the output, as well as the
	  // current time descriptor text and a note about what the player is
	  // holding (all wrapped in a set of <p></p> tags)
	  var pEl = document.createElement("p");

	  pEl.innerHTML = "\n    You are " + playerData.action + " in " + locationData.description + ".\n    It is " + currentTimeStatement(playerData.ticksPassed) + ".\n  ";

	  return pEl;
	};

	// produce DOM elements that represent the player's inventory
	var inventoryDesc = function inventoryDesc(itemInstances) {
	  if (itemInstances.length > 0) {
	    var _ret = function () {
	      var itemNode = document.createElement("p");
	      var startTextNode = document.createTextNode("You are holding ");
	      var endTextNode = document.createTextNode(".");

	      itemNode.appendChild(startTextNode);

	      itemInstances.forEach(function (instance, index) {
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

	      return {
	        v: itemNode
	      };
	    }();

	    if ((typeof _ret === "undefined" ? "undefined" : _typeof(_ret)) === "object") return _ret.v;
	  }

	  return document.createTextNode("");
	};

	// this function produces the interactive DOM elements that players can click on
	// to travel in a direction
	var travelDirEls = function travelDirEls(travelDirInstances) {
	  var travelDirNode = document.createElement("p");
	  var startTextNode = document.createTextNode("There is ");
	  var endTextNode = document.createTextNode(".");

	  travelDirNode.appendChild(startTextNode);

	  travelDirInstances.forEach(function (instance) {
	    travelDirNode.appendChild(instance.element);
	  });

	  travelDirNode.appendChild(endTextNode);

	  return travelDirNode;
	};

	// ticks represent minutes in this game, woohoo!
	// so find out how many hours of the current day have elapsed, and then choose
	// the closest timeStatement from the list above
	var currentTimeStatement = function currentTimeStatement(ticksPassed) {
	  var daysPassed = Math.floor(ticksPassed / 1440);
	  var hoursPassed = Math.floor((ticksPassed - daysPassed * 1440) / 60);

	  // for hoursPassed, we'll have a number between 0-23 so divide by two and
	  // round down to get closest time statement
	  var timeStatement = timeStatements[Math.floor(hoursPassed / 2)];

	  return timeStatement;
	};

	var timeStatements = {
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
	var withClonedNodes = function withClonedNodes(objects) {
	  return objects.map(function (object) {
	    var clonedElement = object.element.cloneNode(true); // deep clone pls
	    clonedElement.onclick = object.element.onclick;
	    return Object.assign({}, object, { element: clonedElement });
	  });
	};

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	// global values for managing player/game state and storing DOM element refs

	var _require$globals = __webpack_require__(2).globals,
	    dom = _require$globals.dom,
	    player = _require$globals.player;

	// this function wraps the travelDirection information from the database with
	// the functionality needed to actually allow the player to travel in that
	// direction, and returns a more useful travelDirection object that includes an
	// interactive element to put in the output that the player can click on to move


	function travelDirection(travelDirection) {
	  var travelDirObj = Object.assign({}, travelDirection);
	  var element = document.createElement("span");

	  element.classList.add("interactive");
	  element.dataset.descriptor = travelDirection.movementDescriptor;
	  element.dataset.target = travelDirection.target;
	  element.dataset.waitTime = travelDirection.waitTime;
	  element.innerText = travelDirection.name;

	  // when this element is clicked on, the player should move to the correct new
	  // location and time should pass accordingly
	  element.onclick = travelDirClick;

	  // okay, we built an interactive element with a mega onclick handler so add
	  // it to the returned travelDirection object ready to be displayed in the view
	  travelDirObj['element'] = element;

	  return travelDirObj;
	}

	module.exports = travelDirection;

	// clicking an element in the view that represents a Travel Direction enables
	// the player to move in that direction, updating their position and the time
	// that has passed
	function travelDirClick() {
	  var travelDirection = this.dataset;
	  var newLoc = travelDirection.target;
	  var playerRef = player.ref;

	  if (!playerRef) {
	    console.log("ERROR: player cannot act in the game without authentication");
	    return false;
	  }

	  if (newLoc) {
	    (function () {
	      // all existing interactive elements should stop being interactive once
	      // one is clicked - those choices are no longer available to the player
	      dom.deactivateAllInteractiveEls();

	      // show the movementDescriptor in the output area
	      var movementDescEl = document.createElement("p");
	      movementDescEl.innerText = travelDirection.descriptor;
	      dom.outputEl.appendChild(movementDescEl);

	      // display a wait indicator to show the time taken for this travel
	      var waitTime = parseInt(travelDirection.waitTime, 10);
	      var count = 1;

	      var interval = window.setInterval(function () {
	        dom.appendWaitIndicatorToOutputEl();

	        // wait until waitTime is up before actually completing this travel
	        count++;
	        if (count >= waitTime) {
	          // travel takes time, so update the player's ticksPassed value with
	          // the amount of ticks taken by this action, as well as updating the
	          // player's location value to match their arrival destination
	          playerRef.child("ticksPassed").once("value").then(function (snapshot) {
	            var currentTicks = parseInt(snapshot.val(), 10) || 0;
	            var newTotalTicks = currentTicks + waitTime;

	            playerRef.update({ location: newLoc, ticksPassed: newTotalTicks });
	          });

	          window.clearInterval(interval);
	        }
	      }, 1000);
	    })();
	  }
	}

/***/ },
/* 4 */
/***/ function(module, exports) {

	/* WEBPACK VAR INJECTION */(function(global) {/**
	 * lodash (Custom Build) <https://lodash.com/>
	 * Build: `lodash modularize exports="npm" -o ./`
	 * Copyright jQuery Foundation and other contributors <https://jquery.org/>
	 * Released under MIT license <https://lodash.com/license>
	 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
	 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
	 */

	/** Used as the `TypeError` message for "Functions" methods. */
	var FUNC_ERROR_TEXT = 'Expected a function';

	/** Used as references for various `Number` constants. */
	var NAN = 0 / 0;

	/** `Object#toString` result references. */
	var symbolTag = '[object Symbol]';

	/** Used to match leading and trailing whitespace. */
	var reTrim = /^\s+|\s+$/g;

	/** Used to detect bad signed hexadecimal string values. */
	var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

	/** Used to detect binary string values. */
	var reIsBinary = /^0b[01]+$/i;

	/** Used to detect octal string values. */
	var reIsOctal = /^0o[0-7]+$/i;

	/** Built-in method references without a dependency on `root`. */
	var freeParseInt = parseInt;

	/** Detect free variable `global` from Node.js. */
	var freeGlobal = typeof global == 'object' && global && global.Object === Object && global;

	/** Detect free variable `self`. */
	var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

	/** Used as a reference to the global object. */
	var root = freeGlobal || freeSelf || Function('return this')();

	/** Used for built-in method references. */
	var objectProto = Object.prototype;

	/**
	 * Used to resolve the
	 * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
	 * of values.
	 */
	var objectToString = objectProto.toString;

	/* Built-in method references for those with the same name as other `lodash` methods. */
	var nativeMax = Math.max,
	    nativeMin = Math.min;

	/**
	 * Gets the timestamp of the number of milliseconds that have elapsed since
	 * the Unix epoch (1 January 1970 00:00:00 UTC).
	 *
	 * @static
	 * @memberOf _
	 * @since 2.4.0
	 * @category Date
	 * @returns {number} Returns the timestamp.
	 * @example
	 *
	 * _.defer(function(stamp) {
	 *   console.log(_.now() - stamp);
	 * }, _.now());
	 * // => Logs the number of milliseconds it took for the deferred invocation.
	 */
	var now = function() {
	  return root.Date.now();
	};

	/**
	 * Creates a debounced function that delays invoking `func` until after `wait`
	 * milliseconds have elapsed since the last time the debounced function was
	 * invoked. The debounced function comes with a `cancel` method to cancel
	 * delayed `func` invocations and a `flush` method to immediately invoke them.
	 * Provide `options` to indicate whether `func` should be invoked on the
	 * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
	 * with the last arguments provided to the debounced function. Subsequent
	 * calls to the debounced function return the result of the last `func`
	 * invocation.
	 *
	 * **Note:** If `leading` and `trailing` options are `true`, `func` is
	 * invoked on the trailing edge of the timeout only if the debounced function
	 * is invoked more than once during the `wait` timeout.
	 *
	 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
	 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
	 *
	 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
	 * for details over the differences between `_.debounce` and `_.throttle`.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Function
	 * @param {Function} func The function to debounce.
	 * @param {number} [wait=0] The number of milliseconds to delay.
	 * @param {Object} [options={}] The options object.
	 * @param {boolean} [options.leading=false]
	 *  Specify invoking on the leading edge of the timeout.
	 * @param {number} [options.maxWait]
	 *  The maximum time `func` is allowed to be delayed before it's invoked.
	 * @param {boolean} [options.trailing=true]
	 *  Specify invoking on the trailing edge of the timeout.
	 * @returns {Function} Returns the new debounced function.
	 * @example
	 *
	 * // Avoid costly calculations while the window size is in flux.
	 * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
	 *
	 * // Invoke `sendMail` when clicked, debouncing subsequent calls.
	 * jQuery(element).on('click', _.debounce(sendMail, 300, {
	 *   'leading': true,
	 *   'trailing': false
	 * }));
	 *
	 * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
	 * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
	 * var source = new EventSource('/stream');
	 * jQuery(source).on('message', debounced);
	 *
	 * // Cancel the trailing debounced invocation.
	 * jQuery(window).on('popstate', debounced.cancel);
	 */
	function debounce(func, wait, options) {
	  var lastArgs,
	      lastThis,
	      maxWait,
	      result,
	      timerId,
	      lastCallTime,
	      lastInvokeTime = 0,
	      leading = false,
	      maxing = false,
	      trailing = true;

	  if (typeof func != 'function') {
	    throw new TypeError(FUNC_ERROR_TEXT);
	  }
	  wait = toNumber(wait) || 0;
	  if (isObject(options)) {
	    leading = !!options.leading;
	    maxing = 'maxWait' in options;
	    maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
	    trailing = 'trailing' in options ? !!options.trailing : trailing;
	  }

	  function invokeFunc(time) {
	    var args = lastArgs,
	        thisArg = lastThis;

	    lastArgs = lastThis = undefined;
	    lastInvokeTime = time;
	    result = func.apply(thisArg, args);
	    return result;
	  }

	  function leadingEdge(time) {
	    // Reset any `maxWait` timer.
	    lastInvokeTime = time;
	    // Start the timer for the trailing edge.
	    timerId = setTimeout(timerExpired, wait);
	    // Invoke the leading edge.
	    return leading ? invokeFunc(time) : result;
	  }

	  function remainingWait(time) {
	    var timeSinceLastCall = time - lastCallTime,
	        timeSinceLastInvoke = time - lastInvokeTime,
	        result = wait - timeSinceLastCall;

	    return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
	  }

	  function shouldInvoke(time) {
	    var timeSinceLastCall = time - lastCallTime,
	        timeSinceLastInvoke = time - lastInvokeTime;

	    // Either this is the first call, activity has stopped and we're at the
	    // trailing edge, the system time has gone backwards and we're treating
	    // it as the trailing edge, or we've hit the `maxWait` limit.
	    return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
	      (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
	  }

	  function timerExpired() {
	    var time = now();
	    if (shouldInvoke(time)) {
	      return trailingEdge(time);
	    }
	    // Restart the timer.
	    timerId = setTimeout(timerExpired, remainingWait(time));
	  }

	  function trailingEdge(time) {
	    timerId = undefined;

	    // Only invoke if we have `lastArgs` which means `func` has been
	    // debounced at least once.
	    if (trailing && lastArgs) {
	      return invokeFunc(time);
	    }
	    lastArgs = lastThis = undefined;
	    return result;
	  }

	  function cancel() {
	    if (timerId !== undefined) {
	      clearTimeout(timerId);
	    }
	    lastInvokeTime = 0;
	    lastArgs = lastCallTime = lastThis = timerId = undefined;
	  }

	  function flush() {
	    return timerId === undefined ? result : trailingEdge(now());
	  }

	  function debounced() {
	    var time = now(),
	        isInvoking = shouldInvoke(time);

	    lastArgs = arguments;
	    lastThis = this;
	    lastCallTime = time;

	    if (isInvoking) {
	      if (timerId === undefined) {
	        return leadingEdge(lastCallTime);
	      }
	      if (maxing) {
	        // Handle invocations in a tight loop.
	        timerId = setTimeout(timerExpired, wait);
	        return invokeFunc(lastCallTime);
	      }
	    }
	    if (timerId === undefined) {
	      timerId = setTimeout(timerExpired, wait);
	    }
	    return result;
	  }
	  debounced.cancel = cancel;
	  debounced.flush = flush;
	  return debounced;
	}

	/**
	 * Creates a throttled function that only invokes `func` at most once per
	 * every `wait` milliseconds. The throttled function comes with a `cancel`
	 * method to cancel delayed `func` invocations and a `flush` method to
	 * immediately invoke them. Provide `options` to indicate whether `func`
	 * should be invoked on the leading and/or trailing edge of the `wait`
	 * timeout. The `func` is invoked with the last arguments provided to the
	 * throttled function. Subsequent calls to the throttled function return the
	 * result of the last `func` invocation.
	 *
	 * **Note:** If `leading` and `trailing` options are `true`, `func` is
	 * invoked on the trailing edge of the timeout only if the throttled function
	 * is invoked more than once during the `wait` timeout.
	 *
	 * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
	 * until to the next tick, similar to `setTimeout` with a timeout of `0`.
	 *
	 * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
	 * for details over the differences between `_.throttle` and `_.debounce`.
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Function
	 * @param {Function} func The function to throttle.
	 * @param {number} [wait=0] The number of milliseconds to throttle invocations to.
	 * @param {Object} [options={}] The options object.
	 * @param {boolean} [options.leading=true]
	 *  Specify invoking on the leading edge of the timeout.
	 * @param {boolean} [options.trailing=true]
	 *  Specify invoking on the trailing edge of the timeout.
	 * @returns {Function} Returns the new throttled function.
	 * @example
	 *
	 * // Avoid excessively updating the position while scrolling.
	 * jQuery(window).on('scroll', _.throttle(updatePosition, 100));
	 *
	 * // Invoke `renewToken` when the click event is fired, but not more than once every 5 minutes.
	 * var throttled = _.throttle(renewToken, 300000, { 'trailing': false });
	 * jQuery(element).on('click', throttled);
	 *
	 * // Cancel the trailing throttled invocation.
	 * jQuery(window).on('popstate', throttled.cancel);
	 */
	function throttle(func, wait, options) {
	  var leading = true,
	      trailing = true;

	  if (typeof func != 'function') {
	    throw new TypeError(FUNC_ERROR_TEXT);
	  }
	  if (isObject(options)) {
	    leading = 'leading' in options ? !!options.leading : leading;
	    trailing = 'trailing' in options ? !!options.trailing : trailing;
	  }
	  return debounce(func, wait, {
	    'leading': leading,
	    'maxWait': wait,
	    'trailing': trailing
	  });
	}

	/**
	 * Checks if `value` is the
	 * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
	 * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
	 *
	 * @static
	 * @memberOf _
	 * @since 0.1.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is an object, else `false`.
	 * @example
	 *
	 * _.isObject({});
	 * // => true
	 *
	 * _.isObject([1, 2, 3]);
	 * // => true
	 *
	 * _.isObject(_.noop);
	 * // => true
	 *
	 * _.isObject(null);
	 * // => false
	 */
	function isObject(value) {
	  var type = typeof value;
	  return !!value && (type == 'object' || type == 'function');
	}

	/**
	 * Checks if `value` is object-like. A value is object-like if it's not `null`
	 * and has a `typeof` result of "object".
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
	 * @example
	 *
	 * _.isObjectLike({});
	 * // => true
	 *
	 * _.isObjectLike([1, 2, 3]);
	 * // => true
	 *
	 * _.isObjectLike(_.noop);
	 * // => false
	 *
	 * _.isObjectLike(null);
	 * // => false
	 */
	function isObjectLike(value) {
	  return !!value && typeof value == 'object';
	}

	/**
	 * Checks if `value` is classified as a `Symbol` primitive or object.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to check.
	 * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
	 * @example
	 *
	 * _.isSymbol(Symbol.iterator);
	 * // => true
	 *
	 * _.isSymbol('abc');
	 * // => false
	 */
	function isSymbol(value) {
	  return typeof value == 'symbol' ||
	    (isObjectLike(value) && objectToString.call(value) == symbolTag);
	}

	/**
	 * Converts `value` to a number.
	 *
	 * @static
	 * @memberOf _
	 * @since 4.0.0
	 * @category Lang
	 * @param {*} value The value to process.
	 * @returns {number} Returns the number.
	 * @example
	 *
	 * _.toNumber(3.2);
	 * // => 3.2
	 *
	 * _.toNumber(Number.MIN_VALUE);
	 * // => 5e-324
	 *
	 * _.toNumber(Infinity);
	 * // => Infinity
	 *
	 * _.toNumber('3.2');
	 * // => 3.2
	 */
	function toNumber(value) {
	  if (typeof value == 'number') {
	    return value;
	  }
	  if (isSymbol(value)) {
	    return NAN;
	  }
	  if (isObject(value)) {
	    var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
	    value = isObject(other) ? (other + '') : other;
	  }
	  if (typeof value != 'string') {
	    return value === 0 ? value : +value;
	  }
	  value = value.replace(reTrim, '');
	  var isBinary = reIsBinary.test(value);
	  return (isBinary || reIsOctal.test(value))
	    ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
	    : (reIsBadHex.test(value) ? NAN : +value);
	}

	module.exports = throttle;

	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 5 */,
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	// global values for managing player/game state and storing DOM element refs

	var _require$globals = __webpack_require__(2).globals,
	    dom = _require$globals.dom,
	    player = _require$globals.player;

	// we'll be getting the item's actions from firebase on click


	var _require = __webpack_require__(1),
	    dbItemsRef = _require.dbItemsRef;

	// this model wraps item data that has been fetched from the database in an
	// object that has additional properties and methods, notably a DOM element that
	// can be used to display a representation of the item in the view's output
	// area so that the player can click and interact with it

	function item(item) {
	  var itemObj = Object.assign({}, item);
	  var element = document.createElement('span');

	  element.classList.add("interactive");
	  element.dataset.description = item.description;
	  element.dataset.name = item.name;
	  element.dataset.uid = item.uid;
	  element.innerText = item.name;

	  // when a player interacts with an object, its description and actions show
	  element.onclick = itemClick;

	  itemObj['element'] = element;

	  return itemObj;
	}

	module.exports = item;

	var itemClick = function itemClick(event) {
	  var playerRef = player.ref;
	  if (!playerRef) {
	    console.log("ERROR: player cannot act in the game without authentication");
	    return false;
	  }

	  // all existing interactive elements should stop being interactive once
	  // one is clicked - those choices are no longer available to the player
	  dom.deactivateAllInteractiveEls();

	  var item = event.target;
	  var actionEl = document.createElement("p");
	  actionEl.innerText = "You look at the " + item.dataset.name + ".";
	  dom.outputEl.appendChild(actionEl);

	  // a tick or two passes during this inspection of the item
	  var tickCount = 0;
	  var interval = window.setInterval(function () {
	    dom.appendWaitIndicatorToOutputEl();
	    tickCount++;

	    if (tickCount === 1) {
	      var itemDescriptionEl = document.createElement("p");
	      itemDescriptionEl.innerText = item.dataset.description;
	      dom.outputEl.appendChild(itemDescriptionEl);

	      // can also see the item's actions (if any)
	      dbItemsRef.child(item.dataset.uid).once("value", function (snapshot) {
	        var itemData = snapshot.val();
	        if (itemData && itemData.actions) {
	          (function () {
	            var permittedActionEls = filterPermittedActions(itemData).map(createItemActionEl);
	            var actionsNode = document.createElement("p");
	            actionsNode.appendChild(document.createTextNode("You could "));
	            permittedActionEls.forEach(function (el, index) {
	              actionsNode.appendChild(el);
	              actionsNode.appendChild(document.createTextNode(" the " + itemData.name));
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
	          })();
	        }

	        window.clearInterval(interval);

	        // show the 'Done' interactable once we've printed everything else
	        dom.appendGoBackElToOutputEl();
	      });

	      playerRef.child("ticksPassed").once("value").then(function (snapshot) {
	        var currentTicks = parseInt(snapshot.val(), 10) || 0;
	        playerRef.update({ ticksPassed: currentTicks + 1 });
	      });
	    }
	  }, 1000);
	};

	var filterPermittedActions = function filterPermittedActions(itemData) {
	  var actions = itemData.actions;
	  var permittedActions = [];

	  for (var key in actions) {
	    var action = actions[key];
	    var conditions = action.conditions;

	    if (conditions.includes("on-player") && itemData.location === "on-player" || conditions.includes("not-on-player") && itemData.location !== "on-player") {
	      permittedActions.push({
	        description: action.description,
	        done: action.return,
	        name: key
	      });
	    }
	  }

	  return permittedActions;
	};

	var createItemActionEl = function createItemActionEl(action) {
	  var span = document.createElement("span");
	  span.classList.add("interactive");
	  span.dataset.description = action.description;
	  span.dataset.done = action.done;
	  span.innerText = action.name;
	  span.onclick = function (event) {
	    console.log("clicked:", event.target);
	  };
	  return span;
	};

/***/ }
/******/ ]);