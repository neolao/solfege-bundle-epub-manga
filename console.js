"use strict"

let solfege = require("solfegejs");
let KindlegenBundle = require("./lib/Bundle");

let application = solfege.factory();
application.addBundle(new KindlegenBundle);

let parameters = process.argv;
parameters.shift();
parameters.shift();
application.start(parameters);
