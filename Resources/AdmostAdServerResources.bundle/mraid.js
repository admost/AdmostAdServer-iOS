/*
 * mraid.js - AdmostAdServer
 *
 * The creative facing half of the SDK's MRAID 3.0 bridge. Injected at document start into
 * every HTML creative that references MRAID, so `window.mraid` exists before the creative's
 * own script runs. Calls the creative makes go to native through the `aasMraid` message
 * handler; native pushes state and geometry back through `window.aasMraidBridge`.
 *
 * Supported: state machine, ready / stateChange / viewableChange / exposureChange /
 * sizeChange / error events, open, close, unload, expand (one and two part), orientation
 * properties, position and size queries. Not supported, and reported as such through
 * `supports()` and an `error` event: resize, sms, tel, calendar, storePicture, location.
 */
(function () {
  if (window.mraid) { return; }

  var VERSION = '3.0';
  var HANDLER = 'aasMraid';

  var state = 'loading';
  var placementType = 'inline';
  var viewable = false;
  var listeners = {};

  var screenSize = { width: 0, height: 0 };
  var maxSize = { width: 0, height: 0 };
  var defaultPosition = { x: 0, y: 0, width: 0, height: 0 };
  var currentPosition = { x: 0, y: 0, width: 0, height: 0 };
  var lastExposure = null;

  var expandProperties = { width: 0, height: 0, useCustomClose: false, isModal: true };
  var orientationProperties = { allowOrientationChange: true, forceOrientation: 'none' };
  var appOrientation = { orientation: 'portrait', locked: false };

  var features = {
    sms: false,
    tel: false,
    calendar: false,
    storePicture: false,
    inlineVideo: true,
    vpaid: false,
    location: false
  };

  function post(message) {
    try {
      window.webkit.messageHandlers[HANDLER].postMessage(message);
    } catch (e) {
      // Not inside the SDK's web view; nothing to talk to.
    }
  }

  function clone(object) {
    var copy = {};
    for (var key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) { copy[key] = object[key]; }
    }
    return copy;
  }

  function fire(event) {
    var args = Array.prototype.slice.call(arguments, 1);
    var handlers = (listeners[event] || []).slice();
    for (var i = 0; i < handlers.length; i++) {
      try {
        handlers[i].apply(null, args);
      } catch (e) {
        post({ action: 'log', message: 'listener for ' + event + ' threw: ' + e });
      }
    }
  }

  function error(message, action) {
    post({ action: 'log', message: 'mraid error (' + action + '): ' + message });
    fire('error', message, action);
  }

  function isValidNumber(value) {
    return typeof value === 'number' && isFinite(value);
  }

  var mraid = {
    getVersion: function () { return VERSION; },

    addEventListener: function (event, listener) {
      if (typeof event !== 'string' || typeof listener !== 'function') {
        error('addEventListener needs an event name and a function', 'addEventListener');
        return;
      }
      if (!listeners[event]) { listeners[event] = []; }
      if (listeners[event].indexOf(listener) === -1) { listeners[event].push(listener); }
    },

    removeEventListener: function (event, listener) {
      if (!listeners[event]) { return; }
      if (typeof listener !== 'function') {
        // Per spec, no listener means every listener for the event goes.
        delete listeners[event];
        return;
      }
      var index = listeners[event].indexOf(listener);
      if (index !== -1) { listeners[event].splice(index, 1); }
    },

    getState: function () { return state; },
    getPlacementType: function () { return placementType; },
    isViewable: function () { return viewable; },

    open: function (url) {
      if (typeof url !== 'string' || url.length === 0) {
        error('open needs a URL', 'open');
        return;
      }
      post({ action: 'open', url: url });
    },

    close: function () { post({ action: 'close' }); },
    unload: function () { post({ action: 'unload' }); },

    expand: function (url) {
      if (placementType === 'interstitial') {
        error('expand is not available for an interstitial', 'expand');
        return;
      }
      if (state !== 'default') {
        error('expand is only allowed from the default state', 'expand');
        return;
      }
      post({ action: 'expand', url: (typeof url === 'string' && url.length > 0) ? url : null });
    },

    resize: function () {
      error('resize is not supported', 'resize');
    },

    // MRAID 2.0 API. The SDK always draws its own close indicator on an expanded ad, which
    // is also what 3.0 requires, so the flag is recorded and otherwise ignored.
    useCustomClose: function (flag) {
      expandProperties.useCustomClose = !!flag;
      post({ action: 'log', message: 'useCustomClose(' + !!flag + ') ignored; the SDK draws the close button' });
    },

    getExpandProperties: function () { return clone(expandProperties); },

    setExpandProperties: function (properties) {
      if (!properties || typeof properties !== 'object') {
        error('setExpandProperties needs an object', 'setExpandProperties');
        return;
      }
      if (isValidNumber(properties.width)) { expandProperties.width = properties.width; }
      if (isValidNumber(properties.height)) { expandProperties.height = properties.height; }
      if (typeof properties.useCustomClose === 'boolean') { expandProperties.useCustomClose = properties.useCustomClose; }
      post({ action: 'setExpandProperties', properties: clone(expandProperties) });
    },

    getResizeProperties: function () { return {}; },

    setResizeProperties: function () {
      error('resize is not supported', 'setResizeProperties');
    },

    getOrientationProperties: function () { return clone(orientationProperties); },

    setOrientationProperties: function (properties) {
      if (!properties || typeof properties !== 'object') {
        error('setOrientationProperties needs an object', 'setOrientationProperties');
        return;
      }
      if (typeof properties.allowOrientationChange === 'boolean') {
        orientationProperties.allowOrientationChange = properties.allowOrientationChange;
      }
      if (properties.forceOrientation === 'portrait' ||
          properties.forceOrientation === 'landscape' ||
          properties.forceOrientation === 'none') {
        orientationProperties.forceOrientation = properties.forceOrientation;
      }
      post({ action: 'setOrientationProperties', properties: clone(orientationProperties) });
    },

    getCurrentAppOrientation: function () { return clone(appOrientation); },

    getCurrentPosition: function () { return clone(currentPosition); },
    getDefaultPosition: function () { return clone(defaultPosition); },
    getMaxSize: function () { return clone(maxSize); },
    getScreenSize: function () { return clone(screenSize); },

    supports: function (feature) { return features[feature] === true; },

    playVideo: function (url) {
      if (typeof url !== 'string' || url.length === 0) {
        error('playVideo needs a URL', 'playVideo');
        return;
      }
      post({ action: 'playVideo', url: url });
    },

    storePicture: function () {
      error('storePicture is not supported', 'storePicture');
    },

    createCalendarEvent: function () {
      error('createCalendarEvent is not supported', 'createCalendarEvent');
    },

    getLocation: function () { return -1; }
  };

  // Native side of the conversation. Every setter takes plain values so the Swift side can
  // build the call with JSON serialised arguments.
  window.aasMraidBridge = {
    setPlacementType: function (type) {
      if (type === 'inline' || type === 'interstitial') { placementType = type; }
    },

    setSupports: function (map) {
      for (var key in map) {
        if (Object.prototype.hasOwnProperty.call(map, key)) { features[key] = map[key] === true; }
      }
    },

    setScreenSize: function (width, height) {
      screenSize = { width: width, height: height };
    },

    setMaxSize: function (width, height) {
      maxSize = { width: width, height: height };
    },

    setDefaultPosition: function (x, y, width, height) {
      defaultPosition = { x: x, y: y, width: width, height: height };
    },

    setCurrentPosition: function (x, y, width, height) {
      var sizeChanged = currentPosition.width !== width || currentPosition.height !== height;
      currentPosition = { x: x, y: y, width: width, height: height };
      if (sizeChanged && state !== 'loading') { fire('sizeChange', width, height); }
    },

    setAppOrientation: function (orientation, locked) {
      appOrientation = { orientation: orientation, locked: !!locked };
    },

    setState: function (newState) {
      if (newState === state) { return; }
      state = newState;
      fire('stateChange', state);
    },

    setIsViewable: function (flag) {
      flag = !!flag;
      if (flag === viewable) { return; }
      viewable = flag;
      fire('viewableChange', viewable);
    },

    setExposure: function (percentage, rect) {
      if (lastExposure === percentage) { return; }
      lastExposure = percentage;
      fire('exposureChange', percentage, rect || null, null);
    },

    // `initialState` is 'expanded' for the second part of a two part expansion, whose
    // document starts life already expanded; everything else becomes 'default'.
    fireReady: function (initialState) {
      if (state !== 'loading') { return; }
      state = (initialState === 'expanded') ? 'expanded' : 'default';
      fire('stateChange', state);
      fire('ready');
    },

    fireError: function (message, action) {
      error(message, action);
    }
  };

  window.mraid = mraid;
  post({ action: 'init' });
})();
