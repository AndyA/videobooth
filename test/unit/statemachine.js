"use strict";

const chai = require("chai");
const expect = chai.expect;
const _ = require("lodash");

require("../../lib/use");

const StateMachine = require("common/statemachine");

class EventCatcher {
  constructor(fsm) {
    this.fsm = fsm;
    this.events = [];
  }

  on(names) {
    for (const name of _.castArray(names))
      this.fsm.on(name, event =>
        this.events.push({ name, event, state: this.fsm.state })
      );
  }

  recent() {
    return this.events.splice(0);
  }
}

describe("StateMachine", () => {
  it("should handle transitions", () => {
    const fsm = new StateMachine({
      barker: { init: true },
      idle: {}
    });
    const ec = new EventCatcher(fsm);
    ec.on([
      "enterBarker",
      "leaveBarker",
      "enterIdle",
      "leaveIdle",
      "enter",
      "leave"
    ]);
    expect(fsm.state).to.equal("barker");
    fsm.goto("barker");
    expect(ec.recent()).to.deep.equal([]);
    fsm.goto("idle");
    expect(ec.recent()).to.deep.equal([
      {
        name: "leave",
        event: { oldState: "barker", newState: "idle" },
        state: "barker"
      },
      {
        name: "leaveBarker",
        event: { oldState: "barker", newState: "idle" },
        state: "barker"
      },
      {
        name: "enterIdle",
        event: { oldState: "barker", newState: "idle" },
        state: "idle"
      },
      {
        name: "enter",
        event: { oldState: "barker", newState: "idle" },
        state: "idle"
      }
    ]);
  });

  it("should respond to inputs", () => {
    const fsm = new StateMachine({
      barker: { init: true, input: { goto: "idle" } },
      idle: {
        input: [
          { on: "red", goto: "record" },
          { on: "green", goto: "demo" },
          { on: "blue", goto: "review" }
        ]
      },
      record: { input: { goto: "idle" } },
      demo: { input: { goto: "idle" } },
      review: {
        input: [
          { on: "red", goto: "idle" },
          { on: "green", goto: "pause" },
          { on: "blue", goto: "delete" }
        ]
      },
      delete: {},
      pause: {}
    });
    expect(fsm.state).to.equal("barker");
    fsm.input("red");
    expect(fsm.state).to.equal("idle");
    fsm.input("red");
    expect(fsm.state).to.equal("record");
    fsm.input("red");
    expect(fsm.state).to.equal("idle");
  });
});
