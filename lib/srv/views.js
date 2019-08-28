"use strict";

const express = require("express");
const multer = require("multer");

const app = express();

app.get("/", (req, res) => {
  res.render("home", { title: "Video Booth" });
});

var storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, "video/");
  },
  filename: function(req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });

app.put("/blob/:session/:id", upload.single("vid"), async (req, res) => {
  res.json({ status: "OK" });
});

module.exports = app;
