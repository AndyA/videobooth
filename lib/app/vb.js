"use strict";

require("core-js/stable");
require("regenerator-runtime/runtime");

const $ = require("jquery");
const moment = require("moment");
const StateMachine = require("common/statemachine");

const MIME = "video/webm;codecs=h264";

class BlobSender {
  constructor(uri, mime) {
    this.uri = uri;
    this.mime = mime;
    this.queue = [];
    this.state = "ready";
  }

  send(session, blob) {
    this.queue.push({ session, blob });
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
      const uri = [this.uri, chunk.session].join("/");
      console.log("Sending chunk to " + uri);
      const fd = new FormData();
      fd.append("vid", chunk.blob, chunk.session + ".webm");
      const rs = await fetch(uri, {
        method: "POST",
        body: fd
      });
      console.log(rs);
    }
    this.state = "ready";
  }
}

function makeStateMachine() {
  return new StateMachine({
    idle: { init: true, input: { goto: "ready" } },
    ready: {
      input: [
        { on: "red", goto: "record" },
        { on: "green", goto: "play" },
        { on: "blue", goto: "demo" }
      ]
    },
    record: { input: { goto: "ready" } },
    demo: { input: { goto: "ready" } },
    play: {
      input: [
        { on: "red", goto: "ready" },
        { on: "green", goto: "pause" },
        { on: "blue", goto: "delete" }
      ]
    },
    pause: {
      input: [
        { on: "red", goto: "ready" },
        { on: "green", goto: "play" },
        { on: "blue", goto: "delete" }
      ]
    },
    delete: { input: [{ goto: "play" }, { on: "green", goto: "purge" }] },
    purge: { input: { goto: "ready" } }
  });
}

function wireButtons(fsm) {
  $("[data-input]").click(function() {
    fsm.input($(this).attr("data-input"));
  });
  fsm.on("enter", e =>
    $("body")
      .addClass(e.newState)
      .removeClass(e.oldState)
  );
  fsm.on("enter", e => $(".state").text(e.newState));
}

async function videoBooth() {
  const fsm = makeStateMachine();
  wireButtons(fsm);
  fsm.goto("idle");

  const devices = await navigator.mediaDevices.enumerateDevices();

  const vidDevices = devices
    .filter(d => d.kind === "videoinput")
    .filter(d => d.getCapabilities)
    .map(d => ({ dev: d, cap: d.getCapabilities() }))
    .sort(
      (b, a) =>
        a.cap.width.max * a.cap.height.max - b.cap.width.max * b.cap.height.max
    );

  if (!vidDevices.length) {
    console.error("No capture devices");
    return;
  }

  const dev = vidDevices[0];

  const bs = new BlobSender("/blob", MIME);
  let session = null;

  const video = document.querySelector("video");
  let mr = null;

  setInterval(() => {
    if (mr) mr.requestData();
  }, 5000);

  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: {
      width: dev.cap.width.max,
      height: dev.cap.height.max,
      deviceId: dev.dev.deviceId
    }
  });

  video.srcObject = stream;

  $(".controls .start").click(function() {
    console.log("START");
    session = moment().format("YYYYMMDD-HHmmss");

    mr = new MediaRecorder(stream, {
      mimeType: MIME,
      videoBitsPerSecond: 10 * 1024 * 1024,
      audioBitsPerSecond: 256 * 1024
    });

    mr.addEventListener("dataavailable", function(e) {
      console.log("chunk: " + e.data.size);
      bs.send(session, e.data);
    });

    mr.addEventListener("stop", function() {
      console.log("STOPPED");
      mr = null;
    });

    mr.start();
  });

  $(".controls .stop").click(function() {
    console.log("STOP");
    if (mr) mr.stop();
  });
}

function hasGetUserMedia() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

$(async () => {
  if (!hasGetUserMedia()) {
    console.error("No getUserMedia");
    return;
  }

  await videoBooth();
});
