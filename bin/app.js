"use strict";

require("../lib/use");

const express = require("express");
const exphbs = require("express-handlebars");
const bodyParser = require("body-parser");

const WEBROOT = "www";
const app = express();

app.engine(
  ".hbs",
  exphbs({
    defaultLayout: "main",
    extname: ".hbs"
  })
);

app.set("view engine", ".hbs");

// TODO should this be here?
app.use(bodyParser.json());
app.use(require("srv/views.js"));

app.use(express.static(WEBROOT));

app.listen(31793);
