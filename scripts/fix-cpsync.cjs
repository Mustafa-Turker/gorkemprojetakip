// Workaround for Node 22.x + Windows: fs.cpSync silently fails (or hangs)
// when source/destination paths contain non-ASCII Unicode (e.g. "Türker") or
// DOS short names (e.g. "MUSTAF~1"). OpenNext relies on cpSync in many places.
// Replace it with a manual recursive copy that uses copyFileSync per file.
//
// Loaded via NODE_OPTIONS=--require=./scripts/fix-cpsync.cjs from npm run ship.

const fs = require("node:fs");
const path = require("node:path");

const originalCpSync = fs.cpSync.bind(fs);

function manualCp(src, dest, opts = {}) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        if (!opts.recursive) {
            // Match Node's behavior — refuse non-recursive directory copy.
            throw new Error(`EISDIR: cannot copy directory without recursive: ${src}`);
        }
        fs.mkdirSync(dest, { recursive: true });
        for (const entry of fs.readdirSync(src)) {
            manualCp(path.join(src, entry), path.join(dest, entry), opts);
        }
    } else if (stat.isSymbolicLink()) {
        const linkTarget = fs.readlinkSync(src);
        try { fs.symlinkSync(linkTarget, dest); } catch { fs.copyFileSync(src, dest); }
    } else {
        fs.copyFileSync(src, dest, opts.force === false ? fs.constants.COPYFILE_EXCL : 0);
    }
}

fs.cpSync = function patchedCpSync(src, dest, opts) {
    try {
        manualCp(src, dest, opts || {});
    } catch (err) {
        // Fall back to original cpSync only if manual copy fails for an unexpected reason.
        try {
            return originalCpSync(src, dest, opts);
        } catch {
            throw err;
        }
    }
};
