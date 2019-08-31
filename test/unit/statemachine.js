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
      barker: {},
      idle: { groups: ["playing"] },
      play: { groups: ["playing", "review"] },
      pause: { groups: ["review"] }
    });

    const ec = new EventCatcher(fsm);
    ec.on([
      // States
      "enterBarker",
      "leaveBarker",
      "enterIdle",
      "leaveIdle",
      "enterPlay",
      "leavePlay",
      "enterPause",
      "leavePause",
      "enter",
      "leave",
      // Groups
      "enterGroupPlaying",
      "leaveGroupPlaying",
      "enterGroupReview",
      "leaveGroupReview",
      "enterGroup",
      "leaveGroup"
    ]);

    fsm.state = "barker";
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
        name: "enterGroupPlaying",
        event: { oldState: "barker", newState: "idle", group: "playing" },
        state: "idle"
      },
      {
        name: "enterGroup",
        event: { oldState: "barker", newState: "idle", group: "playing" },
        state: "idle"
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

    fsm.goto("play");
    expect(ec.recent()).to.deep.equal([
      {
        event: { newState: "play", oldState: "idle" },
        name: "leave",
        state: "idle"
      },
      {
        event: { newState: "play", oldState: "idle" },
        name: "leaveIdle",
        state: "idle"
      },
      {
        event: { group: "review", newState: "play", oldState: "idle" },
        name: "enterGroupReview",
        state: "play"
      },
      {
        event: { group: "review", newState: "play", oldState: "idle" },
        name: "enterGroup",
        state: "play"
      },
      {
        event: { newState: "play", oldState: "idle" },
        name: "enterPlay",
        state: "play"
      },
      {
        event: { newState: "play", oldState: "idle" },
        name: "enter",
        state: "play"
      }
    ]);
  });

  it("should respond to inputs", () => {
    const fsm = new StateMachine({
      barker: { input: { goto: "idle" } },
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
    fsm.state = "barker";
    expect(fsm.state).to.equal("barker");
    fsm.input("red");
    expect(fsm.state).to.equal("idle");
    fsm.input("red");
    expect(fsm.state).to.equal("record");
    fsm.input("red");
    expect(fsm.state).to.equal("idle");
  });

  it("should handle triggerInitialState", () => {
    const fsm = new StateMachine({
      barker: {},
      idle: {}
    });
    const ec = new EventCatcher(fsm);
    ec.on(["enter"]);
    expect(fsm.state).to.equal(undefined);
    fsm.goto("barker");
    expect(fsm.state).to.equal("barker");
    expect(ec.recent()).to.deep.equal([
      {
        name: "enter",
        event: { oldState: undefined, newState: "barker" },
        state: "barker"
      }
    ]);
  });
});
