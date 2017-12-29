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

	var firebasePlayerRef = __webpack_require__(1).firebasePlayerRef;
	var firebaseLocationsRef = __webpack_require__(1).firebaseLocationsRef;

	// models to apply consistent attributes and behaviours to game objects
	var TravelDirection = __webpack_require__(2).travelDirection;

	// utilities
	var throttle = __webpack_require__(4);

	// key DOM elements
	var loadingIndicator = document.getElementsByClassName("loading")[0];
	var outputEl = document.getElementsByClassName("output")[0];

	// observe the outputEl and, if its contents start to expand further than its
	// height then scroll its overflow-scroll-hidden contents into view
	if (window.MutationObserver) {
	  (function () {
	    // prepare a throttled version of the scrollTo animation function that won't
	    // be called more than once per second, to avoid janky scrolling
	    var throttledScrollTo = throttle(function () {
	      scrollTo(outputEl, outputEl.scrollHeight - outputEl.clientHeight, 450);
	    }, 1000);

	    var observer = new window.MutationObserver(function () {
	      if (outputEl.scrollHeight > outputEl.clientHeight) {
	        throttledScrollTo();
	      }
	    });

	    observer.observe(outputEl, { childList: true });
	  })();
	}

	// set listener for playerRef in the database, so that when it changes the
	// location description text is updated if needed
	firebasePlayerRef.on("value", function (snapshot) {
	  var playerData = snapshot.val();
	  var playerLoc = playerData.location;

	  console.log("fetched playerData:", playerData);

	  if (outputEl.dataset.currentLoc != playerLoc) {
	    // current location descriptor text does not match player's location, so
	    // fetch updated location descriptor text to show instead
	    firebaseLocationsRef.child("/" + playerLoc).once("value").then(function (snapshot) {
	      var newLocData = snapshot.val();
	      if (newLocData) {
	        // add the new location descriptor text to the output, as well as the
	        // current time descriptor text (wrapped in <p></p> tags)
	        var locText = document.createTextNode("You are " + playerData.action + " in " + newLocData.description + ". ");
	        var timeText = document.createTextNode("It is " + currentTimeStatement(playerData.ticksPassed) + ".");
	        var pEl = document.createElement("p");
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
	firebasePlayerRef.once("value").then(function (snapshot) {
	  var playerData = snapshot.val();
	  var updatedData = { "connected": true };

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
	  var travelDirInstances = travelDirs.map(function (travelDir) {
	    return TravelDirection(travelDir);
	  });
	  var travelDirWrap = document.createElement("p");
	  var startTextNode = document.createTextNode("There is ");
	  var endTextNode = document.createTextNode(".");

	  travelDirWrap.appendChild(startTextNode);

	  travelDirInstances.forEach(function (instance) {
	    travelDirWrap.appendChild(instance.element);
	  });

	  travelDirWrap.appendChild(endTextNode);

	  return travelDirWrap;
	}

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

	// ticks represent minutes in this game, woohoo!
	// so find out how many hours of the current day have elapsed, and then choose
	// the closest timeStatement from the list above
	function currentTimeStatement(ticksPassed) {
	  var daysPassed = Math.floor(ticksPassed / 1440);
	  var hoursPassed = Math.floor((ticksPassed - daysPassed * 1440) / 60);

	  // for hoursPassed, we'll have a number between 0-23 so divide by two and
	  // round down to get closest time statement
	  var timeStatement = timeStatements[Math.floor(hoursPassed / 2)];

	  return timeStatement;
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

	var database = firebase.database();

	module.exports.firebasePlayerRef = database.ref('/players/experimentUserId');
	module.exports.firebaseLocationsRef = database.ref('/locations');

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	// we need a reference to the player's data in the database, so that if a travel
	// direction is chosen the player's location in the game can be updated to match

	var firebasePlayerRef = __webpack_require__(1).firebasePlayerRef;

	// key DOM elements
	var outputEl = document.getElementsByClassName("output")[0];

	// this function wraps the travelDirection information from the database with
	// the functionality needed to actually allow the player to travel in that
	// direction, updating their time (ticksPassed) and location attributes, and
	// returns a more useful travelDirection object that includes an interactive
	// element to show in the output area that the player can click on to move
	function travelDirection(travelDirection) {
	  var travelDirObj = Object.assign({}, travelDirection);
	  var element = document.createElement('span');

	  element.classList.add("interactive");
	  element.innerText = travelDirection.name;

	  // when this element is clicked on, the player should move to the correct new
	  // location and time should pass accordingly
	  element.onclick = function () {
	    var newLoc = travelDirection.target;

	    if (newLoc) {
	      (function () {
	        // all existing interactive elements should stop being interactive once
	        // one is clicked - those choices are no longer available to the player
	        Array.from(document.getElementsByClassName("interactive")).forEach(function (el) {
	          el.classList.remove("interactive");
	          el.onclick = null;
	        });

	        // show the movementDescriptor in the output area
	        var movementDescEl = document.createElement("p");
	        movementDescEl.innerText = travelDirection.movementDescriptor;
	        outputEl.appendChild(movementDescEl);

	        // display a wait indicator to show the time taken for this travel
	        var waitTime = travelDirection.waitTime;
	        var count = 1;

	        var interval = window.setInterval(function () {
	          var waitIndicator = document.createElement("p");
	          waitIndicator.classList.add("wait-indicator");
	          waitIndicator.innerText = ".";
	          outputEl.appendChild(waitIndicator);

	          // wait until waitTime is up before actually completing this travel
	          count++;
	          if (count >= waitTime) {
	            // travel takes time, so update the player's ticksPassed value with
	            // the amount of ticks taken by this action, as well as updating the
	            // player's location value to match their arrival destination
	            firebasePlayerRef.child("ticksPassed").once("value").then(function (snapshot) {
	              var currentTicks = snapshot.val() || 0;
	              var newTotalTicks = currentTicks + waitTime;

	              firebasePlayerRef.update({ location: newLoc, ticksPassed: newTotalTicks });
	            });

	            window.clearInterval(interval);
	          }
	        }, 1000);
	      })();
	    }
	  };

	  // okay, we built an interactive element with a mega onclick handler so now
	  // add that to this travelDirection object ready to be displayed in the view
	  travelDirObj['element'] = element;

	  return travelDirObj;
	}

	module.exports.travelDirection = travelDirection;

/***/ },
/* 3 */,
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

/***/ }
/******/ ]);