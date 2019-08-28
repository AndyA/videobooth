"use strict";

require("core-js/stable");
require("regenerator-runtime/runtime");

const $ = require("jquery");
const moment = require("moment");

const MIME = "video/webm;codecs=h264";

class BlobSender {
  constructor(uri, mime) {
    this.uri = uri;
    this.mime = mime;
    this.queue = [];
    this.state = "idle";
  }

  send(session, blob) {
    this.queue.push({ session, blob });
    console.log("state:" + this.state);
    this.startSender();
  }

  startSender() {
    if (this.state === "idle") {
      this.sender().catch(e => console.error(e));
    }
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
    this.state = "idle";
  }
}

async function videoBooth() {
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

  const constraints = {
    audio: true,
    video: {
      width: dev.cap.width.max,
      height: dev.cap.height.max,
      deviceId: dev.dev.deviceId
    }
  };

  const video = document.querySelector("video");
  let mr = null;

  setInterval(() => {
    if (mr) mr.requestData();
  }, 5000);

  const stream = await navigator.mediaDevices.getUserMedia(constraints);

  video.srcObject = stream;

  $(".controls .start").click(function() {
    console.log("START");
    session = moment().format("YYYYMMDD-HHmmss");

    mr = new MediaRecorder(stream, {
      mimeType: MIME,
      videoBitsPerSecond: 30 * 1024 * 1024,
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

$(async () => {
  console.log("Loaded and ready");
  function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  if (!hasGetUserMedia()) {
    console.error("No getUserMedia");
    return;
  }

  await videoBooth();
});
