"use strict";

const Promise = require("bluebird");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = Promise.promisifyAll(require("fs"));
const mkdirp = Promise.promisify(require("mkdirp"));

const app = express();

app.get("/", (req, res) => {
  res.render("home", { title: "Video Booth" });
});

const upload = multer({ storage: multer.memoryStorage() });

app.post("/blob/:session/:id", upload.single("vid"), async (req, res) => {
  const vidDir = path.join("www", "video", req.params.session);
  await mkdirp(vidDir);
  const vidFile = path.join(vidDir, req.params.id + ".webm");
  await fs.appendFileAsync(vidFile, req.file.buffer);
  res.json({ status: "OK" });
});

module.exports = app;
