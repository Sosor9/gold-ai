export default async function handler(req, res) {
res.setHeader("Access-Control-Allow-Origin", "*");
res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

if (req.method === "OPTIONS") {
return res.status(200).end();
}

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;
const secret = process.env.GOLD_AI_SECRET;

if (!redisUrl || !redisToken || !secret) {
return res.status(500).json({ error: "Configuration manquante" });
}

if (req.method === "POST") {
if (req.headers.authorization !== `Bearer ${secret}`) {
return res.status(401).json({ error: "Non autorisé" });
}

const tick = req.body;

if (
!tick ||
tick.symbol !== "XAUUSD" ||
!Number.isFinite(Number(tick.bid)) ||
!Number.isFinite(Number(tick.ask))
) {
return res.status(400).json({ error: "Cotations invalides" });
}

const response = await fetch(redisUrl, {
method: "POST",
headers: {
Authorization: `Bearer ${redisToken}`,
"Content-Type": "application/json"
},
body: JSON.stringify([
"SET",
"goldai:latest",
JSON.stringify({ ...tick, receivedAt: Date.now() }),
"EX",
"30"
])
});

if (!response.ok) {
return res.status(502).json({ error: "Stockage indisponible" });
}

return res.status(200).json({ success: true });
}

if (req.method === "GET") {
const response = await fetch(`${redisUrl}/get/goldai%3Alatest`, {
headers: { Authorization: `Bearer ${redisToken}` }
});

if (!response.ok) {
return res.status(502).json({ error: "Lecture impossible" });
}

const result = await response.json();
const tick = result.result ? JSON.parse(result.result) : null;

return res.status(200).json({ tick });
}

return res.status(405).json({ error: "Méthode non autorisée" });
}
