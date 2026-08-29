const { Client } = require("ssh2");
const serverService = require("./serverService");
const { sshExec } = require("../infrastructure/ssh/sshExec");

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

/**
 * Parses `df -BG /` output into used/total GB.
 * Example line: /dev/sda1       100G     45G     55G  45% /
 * @param {string} output
 * @returns {{ usedGb: number, totalGb: number } | null}
 */
const parseDisk = (output) => {
  const line = output.trim().split("\n")[1];
  if (!line) return null;

  const parts = line.trim().split(/\s+/);
  // With -k, values are in 1K blocks — no "G" suffix to strip
  const totalKb = parseInt(parts[1], 10);
  const usedKb = parseInt(parts[2], 10);

  if (isNaN(totalKb) || isNaN(usedKb)) return null;
  return {
    usedGb: parseFloat((usedKb / 1024 / 1024).toFixed(2)),
    totalGb: parseFloat((totalKb / 1024 / 1024).toFixed(2)),
  };
};

/**
 * Parses two successive /proc/stat reads (taken 500ms apart) to compute
 * CPU usage percentage. Returns 0–100.
 * @param {string} stat1 - first /proc/stat read
 * @param {string} stat2 - second /proc/stat read
 * @returns {number}
 */
const parseCpu = (stat1, stat2) => {
  const parse = (stat) => {
    const line = stat.split("\n")[0]; // "cpu  ..." aggregate line
    const nums = line
      .replace(/^cpu\s+/, "")
      .trim()
      .split(/\s+/)
      .map(Number);
    // user, nice, system, idle, iowait, irq, softirq, steal
    const idle = nums[3] + (nums[4] || 0); // idle + iowait
    const total = nums.reduce((a, b) => a + b, 0);
    return { idle, total };
  };

  const a = parse(stat1);
  const b = parse(stat2);

  const totalDiff = b.total - a.total;
  const idleDiff = b.idle - a.idle;

  if (totalDiff === 0) return 0;
  return Math.round(((totalDiff - idleDiff) / totalDiff) * 100);
};

/**
 * Parses /proc/meminfo output into a usage percentage.
 * @param {string} output
 * @returns {number}
 */
const parseMemory = (output) => {
  const getValue = (key) => {
    const match = output.match(new RegExp(`^${key}:\\s+(\\d+)`, "m"));
    return match ? parseInt(match[1], 10) : null;
  };

  const total = getValue("MemTotal");
  const available = getValue("MemAvailable") ?? getValue("MemFree");

  if (!total || !available) return null;
  return Math.round(((total - available) / total) * 100);
};

/**
 * Parses /proc/uptime into total seconds.
 * @param {string} output
 * @returns {number}
 */
const parseUptime = (output) => {
  const seconds = parseFloat(output.trim().split(" ")[0]);
  return isNaN(seconds) ? null : Math.floor(seconds);
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

/**
 * Fetches CPU, memory, disk, and uptime stats from a remote server via SSH.
 * CPU is measured over a 500ms sample window for accuracy.
 *
 * @param {string} serverId
 * @returns {Promise<{
 *   disk:          { usedGb: number, totalGb: number } | null,
 *   cpu:           number | null,
 *   memory:        number | null,
 *   uptimeSeconds: number | null,
 * }>}
 */
const getServerStats = async (serverId) => {
  const connectConfig = await serverService.getServerOptions(serverId);

  // Take two /proc/stat readings 500ms apart for a CPU delta measurement.
  // All other stats are single reads so we batch them in one SSH session.
  const [cpuStat1, results] = await Promise.all([
    sshExec(connectConfig, "cat /proc/stat"),
    // Small delay then read everything else + second CPU sample together
    new Promise((resolve) =>
      setTimeout(async () => {
        try {
          const output = await sshExec(
            connectConfig,
            "cat /proc/stat && echo '---' && cat /proc/meminfo && echo '---' && cat /proc/uptime && echo '---' && df -k /",
          );
          resolve(output);
        } catch (err) {
          resolve(null);
        }
      }, 500),
    ),
  ]);

  if (!results) {
    return { disk: null, cpu: null, memory: null, uptimeSeconds: null };
  }

  // Split the combined output on our separator
  const [cpuStat2Raw, memRaw, uptimeRaw, diskRaw] = results.split("---\n");

  return {
    cpu: cpuStat2Raw ? parseCpu(cpuStat1, cpuStat2Raw) : null,
    memory: memRaw ? parseMemory(memRaw) : null,
    uptimeSeconds: uptimeRaw ? parseUptime(uptimeRaw) : null,
    disk: diskRaw ? parseDisk(diskRaw) : null,
  };
};

const getServerStatsHandler = async (req, res) => {
  const { serverId } = req.params;

  if (!serverId) {
    return res.status(400).json({ error: "Missing serverId" });
  }

  try {
    const stats = await getServerStats(serverId);
    res.json(stats);
  } catch (err) {
    console.error(`Stats fetch failed for server ${serverId}:`, err.message);
    res.status(500).json({ error: "Failed to retrieve server stats" });
  }
};

module.exports = { getServerStatsHandler };
