const globals = {
  elements: {
    loadingIndicator: document.getElementsByClassName("loading")[0],
    outputEl: document.getElementsByClassName("output")[0]
  },
  player: {
    items: [],
    location: undefined,
    ref: undefined,
    uid: undefined
  }
};

module.exports.globals = globals;
