"use strict";

const EventEmitter = require("events");
const _ = require("lodash");

// TODO: state groups implemented as a shadow state machine

module.exports = class StateMachine extends EventEmitter {
  constructor(states, opt) {
    super();
    this._states = states;
    this.opt = Object.assign({}, {}, opt || {});
    if (this.opt.state) this.state = this.opt.state;
  }

  _validate(state) {
    if (!this.states[state]) throw new Error("Unknown state: " + state);
    return state;
  }

  _name(prefix, state) {
    return prefix + _.upperFirst(state);
  }

  _stateInfo(state) {
    return this.states[this._validate(state)];
  }

  get _current() {
    return this._stateInfo(this.state);
  }

  getInputs() {
    const inputs = {};
    for (const input of _.castArray(this._current.input || [])) {
      for (const on of _.castArray(input.on || ["*"])) {
        const error = msg => {
          throw new Error(msg + " for " + this.state + " -> input: " + on);
        };
        if (inputs[on]) error("Multiple destinations");
        if (!input.goto) error("Missing goto");
        inputs[on] = input;
      }
    }
    return inputs;
  }

  _emit(name, event) {
    const method = this._name("on", name);
    const delegate = this.opt.delegate || this;
    if (_.isFunction(delegate[method])) delegate[method].call(delegate, event);
    this.emit(name, event);
  }

  get states() {
    return this._states;
  }

  get state() {
    return this._state;
  }

  set state(state) {
    this._state = this._validate(state);
  }

  _diffGroups(oldGroups, newGroups) {
    const both = new Set(_.intersection(oldGroups, newGroups));
    return {
      oldGroups: oldGroups.filter(g => !both.has(g)),
      newGroups: newGroups.filter(g => !both.has(g))
    };
  }

  goto(state) {
    this._validate(state);

    const enter = (event, id, ev) => {
      this._emit(this._name(event, id), ev);
      this._emit(event, ev);
    };

    const leave = (event, id, ev) => {
      this._emit(event, ev);
      this._emit(this._name(event, id), ev);
    };

    if (this.state !== state) {
      const ev = { oldState: this.state, newState: state };

      const { oldGroups, newGroups } = this._diffGroups(
        (this._state && this._stateInfo(this._state).groups) || [],
        this._stateInfo(state).groups || []
      );

      if (this._state !== undefined) {
        leave("leave", this.state, ev);
        for (const group of oldGroups)
          leave("leaveGroup", group, { ...ev, group });
      }

      this.state = state;

      for (const group of newGroups)
        enter("enterGroup", group, { ...ev, group });
      enter("enter", this.state, ev);
    }
    return this;
  }

  input(tag) {
    const inputs = this.getInputs();
    const next = inputs[tag] || inputs["*"];
    if (next !== undefined) this.goto(next.goto);
    return this;
  }
};
