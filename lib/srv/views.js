"use strict";

const Promise = require("bluebird");
const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = Promise.promisifyAll(require("fs"));
const mkdirp = Promise.promisify(require("mkdirp"));

const app = express();

const VID_DIR = "video";

app.get("/", (req, res) => {
  res.render("home", { title: "Video Booth", width: 1920, height: 1080 });
});

const upload = multer({ storage: multer.memoryStorage() });

function sessionDir(req) {
  return path.join("www", VID_DIR, req.params.session);
}

app.post("/blob/:session/:id", upload.single("vid"), async (req, res) => {
  const vidDir = sessionDir(req);
  await mkdirp(vidDir);
  const vidFile = path.join(vidDir, req.params.id + ".webm");
  await fs.appendFileAsync(vidFile, req.file.buffer);
  res.json({ status: "OK" });
});

app.get("/session/:session", async (req, res) => {
  const vidDir = sessionDir(req);
  const ents = await fs.readdirAsync(vidDir);
  res.json(
    ents.map(e => ["", VID_DIR, req.params.session, e].join("/")).sort()
  );
});

module.exports = app;
