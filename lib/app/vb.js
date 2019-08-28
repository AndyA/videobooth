"use strict";

const $ = require("jquery");

$(() => {
  console.log("Loaded and ready");
  function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  if (hasGetUserMedia()) {
    const constraints = {
      video: true,
      width: 1920,
      height: 1080
    };

    const video = document.querySelector("video");

    navigator.mediaDevices.getUserMedia(constraints).then(stream => {
      video.srcObject = stream;
    });
  } else {
    alert("getUserMedia() is not supported by your browser");
  }
});
