import fs from "fs";

export default function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    if (!fs.existsSync("eval_log.jsonl")) {
      return res.json([]);
    }
    const lines = fs.readFileSync("eval_log.jsonl", "utf8")
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(line => JSON.parse(line));
    res.json(lines);
  } catch (err) {
    console.error("Log read error:", err.message);
    res.status(500).json({ error: "Failed to read logs" });
  }
}
