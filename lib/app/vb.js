"use strict";

require("core-js/stable");
require("regenerator-runtime/runtime");

const $ = require("jquery");
const moment = require("moment");
const printf = require("printf");
const StateMachine = require("common/statemachine");

const MIME = "video/webm;codecs=h264";

class BlobSender {
  constructor(uri) {
    this.uri = uri;
    this.queue = [];
    this.state = "ready";
  }

  send(session, id, blob) {
    this.queue.push({ session, id, blob });
    console.log("state:" + this.state);
    this.startSender();
  }

  startSender() {
    if (this.state === "ready") this.sender().catch(e => console.error(e));
  }

  async sender() {
    this.state = "sending";
    while (true) {
      const chunk = this.queue.shift();
      if (!chunk) break;
      const uri = [this.uri, chunk.session, chunk.id].join("/");
      console.log("Sending chunk to " + uri);
      const fd = new FormData();
      fd.append("vid", chunk.blob, chunk.id + ".webm");
      const rs = await fetch(uri, {
        method: "POST",
        body: fd
      });
      console.log(rs);
    }
    this.state = "ready";
  }
}

class VideoBooth {
  constructor() {
    this.fsm = this._makeStateMachine();
    this._wireControls();
    this.bs = new BlobSender("/blob");
  }

  _makeStateMachine() {
    return new StateMachine({
      idle: { init: true, input: { goto: "ready", label: "Hit a button" } },
      ready: {
        input: [
          { on: "red", goto: "record", label: "Record a video" },
          { on: "green", goto: "play", label: "Review last video" },
          { on: "blue", goto: "demo", label: "Play demo" }
        ]
      },
      record: { input: { goto: "ready", label: "Stop" } },
      demo: { input: { goto: "ready", label: "Stop" } },
      play: {
        groups: ["review"],
        input: [
          { on: "red", goto: "ready", label: "Stop" },
          { on: "green", goto: "pause", label: "Pause" },
          { on: "blue", goto: "delete", label: "Delete" }
        ]
      },
      pause: {
        groups: ["review"],
        input: [
          { on: "red", goto: "ready", label: "Stop" },
          { on: "green", goto: "play", label: "Play" },
          { on: "blue", goto: "delete", label: "Delete" }
        ]
      },
      delete: {
        input: [
          { goto: "play", label: "Cancel" },
          { on: "green", goto: "purge", label: "Confirm" }
        ]
      },
      purge: { input: { goto: "ready", label: "OK" } }
    });
  }

  _wireControls() {
    const fsm = this.fsm;

    $("[data-input]").click(function() {
      fsm.input($(this).attr("data-input"));
    });

    fsm.on("enter", e =>
      $("body")
        .addClass(e.newState)
        .removeClass(e.oldState)
    );

    fsm.on("enter", e => {
      const inputs = fsm.getInputs();
      $(".controls label").each(function() {
        const target = $(this).attr("for");
        const input = $("#" + target).attr("data-input");
        $(this).text((inputs[input] || inputs["*"]).label);
      });
    });

    fsm.on("enter", e => $(".state").text(e.newState));

    $(window).keydown(function(ev) {
      const keyMap = { "1": "red", "2": "green", "3": "blue" };
      const inp = keyMap[String.fromCharCode(ev.keyCode)];
      if (inp) fsm.input(inp);
    });
  }

  async getVideoDevices() {
    const devices = await navigator.mediaDevices.enumerateDevices();

    return devices
      .filter(d => d.kind === "videoinput")
      .filter(d => d.getCapabilities)
      .map(d => ({ dev: d, cap: d.getCapabilities() }))
      .sort(
        (b, a) =>
          a.cap.width.max * a.cap.height.max -
          b.cap.width.max * b.cap.height.max
      );
  }

  _wireTimeouts() {
    const fsm = this.fsm;
    let timeout = null;

    fsm.on("enter", ev => {
      if (timeout) clearTimeout(timeout);
      if (ev.newState !== "idle" && ev.newState !== "record")
        timeout = setTimeout(() => fsm.goto("idle"), 5 * 60 * 1000);
    });
  }

  _wireRecord() {
    const fsm = this.fsm;
    let mr = null;
    let ticker = null;

    fsm.on("enterRecord", ev => {
      console.log("START");
      const id = this._timeStamp;

      mr = new MediaRecorder(this.stream, {
        mimeType: MIME,
        videoBitsPerSecond: 10 * 1024 * 1024,
        audioBitsPerSecond: 256 * 1024
      });

      mr.addEventListener("dataavailable", e => {
        console.log("chunk: " + e.data.size);
        this.bs.send(this.session, id, e.data);
      });

      mr.addEventListener("stop", () => {
        console.log("STOPPED");
        mr = null;
      });

      mr.start();
      if (ticker) clearInterval(ticker);
      ticker = setInterval(() => mr.requestData(), 1000);
    });

    fsm.on("leaveRecord", ev => {
      console.log("STOP");

      if (ticker) {
        clearInterval(ticker);
        ticker = null;
      }

      if (mr) mr.stop();
    });
  }

  _wireMisc() {
    const fsm = this.fsm;

    fsm.on("leaveIdle", ev => (this.session = this._session));
  }

  _wireStates() {
    this._wireTimeouts();
    this._wireRecord();
    this._wireMisc();
  }

  get _timeStamp() {
    return moment().format("YYYYMMDD-HHmmss");
  }

  get _unique() {
    return printf("%08x", Math.random() * 0x100000000);
  }

  get _session() {
    return [this._timeStamp, this._unique].join("-");
  }

  async run() {
    const fsm = this.fsm;
    this._wireStates();
    fsm.goto("idle");

    const vidDevices = await this.getVideoDevices();

    if (!vidDevices.length) {
      console.error("No capture devices");
      return;
    }

    const dev = vidDevices[0];

    const bs = new BlobSender("/blob");
    let id = null;

    const video = document.querySelector("video");
    let mr = null;

    setInterval(() => {
      if (mr) mr.requestData();
    }, 5000);

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: {
        width: dev.cap.width.max,
        height: dev.cap.height.max,
        deviceId: dev.dev.deviceId
      }
    });

    video.srcObject = this.stream;

    $(".start").click(function() {
      console.log("START");
      const id = moment().format("YYYYMMDD-HHmmss");

      mr = new MediaRecorder(this.stream, {
        mimeType: MIME,
        videoBitsPerSecond: 10 * 1024 * 1024,
        audioBitsPerSecond: 256 * 1024
      });

      mr.addEventListener("dataavailable", function(e) {
        console.log("chunk: " + e.data.size);
        bs.send(this.session, id, e.data);
      });

      mr.addEventListener("stop", function() {
        console.log("STOPPED");
        mr = null;
      });

      mr.start();
    });

    $(".stop").click(function() {
      console.log("STOP");
      if (mr) mr.stop();
    });
  }
}

function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

$(async () => {
  if (!hasGetUserMedia()) {
    console.error("No getUserMedia");
    return;
  }

  const vb = new VideoBooth();
  await vb.run();
});
