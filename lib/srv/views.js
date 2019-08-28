"use strict";

const Promise = require("bluebird");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = Promise.promisifyAll(require("fs"));

const app = express();

app.get("/", (req, res) => {
  res.render("home", { title: "Video Booth" });
});

const upload = multer({ storage: multer.memoryStorage() });

app.post("/blob/:session", upload.single("vid"), async (req, res) => {
  const vidFile = path.join("video", req.params.session + ".webm");
  await fs.appendFileAsync(vidFile, req.file.buffer);
  res.json({ status: "OK" });
});

module.exports = app;
