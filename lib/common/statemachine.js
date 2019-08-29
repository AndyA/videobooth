"use strict";

const EventEmitter = require("events");
const _ = require("lodash");

class StateMachine extends EventEmitter {
  constructor(states, opt) {
    super();
    this.states = states;
    this.opt = Object.assign({}, {}, opt || {});
    this._init();
  }

  _init() {
    const initStates = Object.entries(this.states)
      .filter(([k, v]) => v.init)
      .map(([k, v]) => k);
    if (initStates.length > 1) throw new Error("Multiple init states");
    this.state = initStates[0] || "init";
  }

  _validate(state) {
    if (!this.states[state]) throw new Error("Unknown state: " + state);
    return state;
  }

  _eventName(prefix, state) {
    return prefix + _.upperFirst(state);
  }

  _stateInfo(state) {
    return this.states[this._validate(state)];
  }

  _getInputs() {
    const inputs = {};
    for (const input of _.castArray(this._current.input || [])) {
      for (const on of _.castArray(input.on || ["_"])) {
        if (inputs[on]) throw new Error("Multiple mappings for input " + on);
        if (!input.goto) throw new Error("Missing goto for " + on);
        inputs[on] = input.goto;
      }
    }
    return inputs;
  }

  get _current() {
    return this._stateInfo(this.state);
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = this._validate(state);
  }

  goto(state) {
    this._validate(state);
    if (this.state !== state) {
      const ev = { oldState: this.state, newState: state };
      this.emit("leave", ev);
      this.emit(this._eventName("leave", this.state), ev);
      this.state = state;
      this.emit(this._eventName("enter", this.state), ev);
      this.emit("enter", ev);
    }
    return this;
  }

  input(tag) {
    const inputs = this._getInputs();
    const next = inputs[tag] || inputs["_"];
    if (next !== undefined) this.goto(next);
    return this;
  }
}

module.exports = StateMachine;
