#!/usr/bin/env node
// Cross-platform release runner (replaces scripts/release.sh).
// Syncs version numbers across npm & Tauri → updates CHANGELOG.md → commits → tags → pushes to origin.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { fileURLToPath } from "node:url";

import {
  bumpVersion,
  hasOnlyAllowedWorkingTreeChange,
  parseReleaseArgs,
  RELEASE_HELP,
  resolveBaseVersion,
  updateCargoLockVersion,
  updateCargoTomlVersion,
  validateSemver
} from "./release-lib.mjs";
import {
  formatChangelogSection,
  formatReleaseNotes,
  groupCommitSubjects,
  prependChangelogSection
} from "./changelog-lib.mjs";

const rootDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
process.chdir(rootDir);

const GIT_ENV = {
  ...process.env,
  GIT_TERMINAL_PROMPT: "0",
  GCM_INTERACTIVE: "never"
};

function git(args, opts = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
    env: GIT_ENV,
    ...opts
  });
}

function gitQuiet(args) {
  git(args, { stdio: "ignore" });
}

function getRepositoryRelativePath(filePath) {
  if (!filePath) return "";
  const relativePath = path.relative(rootDir, path.resolve(rootDir, filePath));
  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) return "";
  return relativePath.split(path.sep).join("/");
}

function getLatestTag() {
  const out = git(["tag", "-l", "v[0-9]*.[0-9]*.[0-9]*", "--sort=-v:refname"], {
    stdio: ["ignore", "pipe", "ignore"]
  });
  return out.split(/\r?\n/).find((l) => l.trim().length > 0) || "";
}

function getCommitSubjectsSince(tag) {
  const range = tag ? `${tag}..HEAD` : "HEAD";
  return git(["log", "--no-merges", "--format=%s", range], {
    stdio: ["ignore", "pipe", "ignore"]
  })
    .split(/\r?\n/)
    .filter(Boolean);
}

function readReleaseNotes(notesFile, latestTag) {
  if (notesFile) {
    const notesPath = path.resolve(rootDir, notesFile);
    if (!fs.existsSync(notesPath)) {
      throw new Error(`找不到变更说明文件: ${notesFile}`);
    }
    const notes = fs.readFileSync(notesPath, "utf8").trim();
    if (!notes) throw new Error(`变更说明文件为空: ${notesFile}`);
    return notes;
  }

  const notes = formatReleaseNotes(groupCommitSubjects(getCommitSubjectsSince(latestTag)));
  return notes || "### 其他更新\n\n- 常规维护与稳定性改进";
}

function updateChangelog(version, notes) {
  const changelogPath = path.join(rootDir, "CHANGELOG.md");
  const existing = fs.existsSync(changelogPath)
    ? fs.readFileSync(changelogPath, "utf8")
    : "# Changelog\n";
  const date = new Date().toISOString().slice(0, 10);
  const section = formatChangelogSection({ version, date, notes });
  fs.writeFileSync(changelogPath, prependChangelogSection(existing, section));
}

function resolveManagedFiles() {
  const files = ["package.json", "src-tauri/tauri.conf.json", "src-tauri/Cargo.toml", "CHANGELOG.md"];
  if (fs.existsSync(path.join(rootDir, "package-lock.json"))) {
    files.splice(1, 0, "package-lock.json");
  }
  if (fs.existsSync(path.join(rootDir, "src-tauri/Cargo.lock"))) {
    files.splice(files.length - 1, 0, "src-tauri/Cargo.lock");
  }
  return files;
}

function updateVersionFiles(version) {
  const writeJson = (filePath, value) =>
    fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);

  const packageJsonPath = path.join(rootDir, "package.json");
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  const pkgName = packageJson.name || "kidbuddy";
  packageJson.version = version;
  writeJson(packageJsonPath, packageJson);

  const packageLockPath = path.join(rootDir, "package-lock.json");
  if (fs.existsSync(packageLockPath)) {
    const packageLock = JSON.parse(fs.readFileSync(packageLockPath, "utf8"));
    if ("version" in packageLock) packageLock.version = version;
    if (packageLock.packages && packageLock.packages[""]) packageLock.packages[""].version = version;
    writeJson(packageLockPath, packageLock);
  }

  const tauriConfPath = path.join(rootDir, "src-tauri/tauri.conf.json");
  const tauriConf = JSON.parse(fs.readFileSync(tauriConfPath, "utf8"));
  tauriConf.version = version;
  writeJson(tauriConfPath, tauriConf);

  const cargoTomlPath = path.join(rootDir, "src-tauri/Cargo.toml");
  const cargoToml = fs.readFileSync(cargoTomlPath, "utf8");
  fs.writeFileSync(cargoTomlPath, updateCargoTomlVersion(cargoToml, version));

  const cargoLockPath = path.join(rootDir, "src-tauri/Cargo.lock");
  if (fs.existsSync(cargoLockPath)) {
    const cargoLock = fs.readFileSync(cargoLockPath, "utf8");
    const res = updateCargoLockVersion(cargoLock, pkgName, version);
    if (res.updated) fs.writeFileSync(cargoLockPath, res.content);
  }
}

async function confirm(question) {
  if (!input.isTTY) {
    throw new Error("当前处于非交互终端，无法等待确认；请加上 -y 自动确认，或使用 --dry-run 预览");
  }
  const rl = readline.createInterface({ input, output });
  try {
    const reply = await rl.question(question);
    return /^[Yy]$/.test(reply.trim());
  } finally {
    rl.close();
  }
}

function runSteps(steps, dryRun) {
  for (const [label, fn] of steps) {
    if (dryRun) {
      console.log(`[dry-run] ${label}`);
    } else {
      console.log(`→ ${label}`);
      fn();
    }
  }
}

async function main() {
  const opts = parseReleaseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(RELEASE_HELP);
    process.exit(0);
  }

  try {
    git(["rev-parse", "--git-dir"], { stdio: "ignore" });
  } catch {
    console.error("当前目录不是 git 仓库");
    process.exit(1);
  }

  const porcelain = git(["status", "--porcelain=v1", "-z"], { stdio: ["ignore", "pipe", "ignore"] });
  if (porcelain.length > 0 && !hasOnlyAllowedWorkingTreeChange(porcelain, getRepositoryRelativePath(opts.notesFile))) {
    console.error("工作区有未提交的改动，请先 commit 或 stash：");
    console.error(git(["status", "--short"]));
    process.exit(1);
  }

  const currentBranch = git(["branch", "--show-current"], { stdio: ["ignore", "pipe", "ignore"] }).trim();
  if (!currentBranch) {
    console.error("当前处于 detached HEAD 状态，请先切换到 main 分支后再发布");
    process.exit(1);
  }
  if (currentBranch !== "main") {
    console.error(`警告: 当前分支是 '${currentBranch}'，通常应在 main 分支发布`);
    if (!opts.skipConfirm && !opts.dryRun) {
      if (!(await confirm("是否继续? [y/N] "))) process.exit(1);
    }
  }

  gitQuiet(["fetch", "origin", "--tags", "--quiet"]);

  const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const latestTag = getLatestTag();
  const baseVersion = resolveBaseVersion(latestTag, packageJson.version);
  const newVersion = opts.explicitVersion || bumpVersion(baseVersion, opts.bumpType);
  validateSemver(newVersion);
  const newTag = `v${newVersion}`;

  try {
    git(["rev-parse", newTag], { stdio: "ignore" });
    console.error(`tag ${newTag} 已存在`);
    process.exit(1);
  } catch {
    /* tag does not exist — expected */
  }

  if (latestTag && newVersion === latestTag.replace(/^v/, "")) {
    console.error(`新版本与最新 tag 相同: ${newVersion}`);
    process.exit(1);
  }

  const releaseNotes = readReleaseNotes(opts.notesFile, latestTag);
  const filesToSync = resolveManagedFiles();

  console.log("");
  console.log("发布预览");
  console.log(`  当前最新 tag      : ${latestTag || "（尚无 v* tag）"}`);
  console.log(`  package.json 版本 : ${packageJson.version}`);
  console.log(`  目标新版本        : ${newVersion}`);
  console.log(`  新 tag            : ${newTag}`);
  console.log(`  分支              : ${currentBranch}`);
  console.log(`  将更新文件        : ${filesToSync.join(", ")}`);
  console.log("");
  console.log("变更说明预览");
  console.log(releaseNotes);
  console.log("");

  if (!opts.skipConfirm && !opts.dryRun) {
    if (!(await confirm(`确认发布 ${newTag}? [y/N] `))) {
      console.log("已取消");
      process.exit(0);
    }
  }

  const steps = [
    [`git add ${filesToSync.join(" ")}`, () => gitQuiet(["add", ...filesToSync])],
    [`git commit -m "chore: release ${newTag}"`, () => gitQuiet(["commit", "-m", `chore: release ${newTag}`])],
    [`git tag ${newTag}`, () => gitQuiet(["tag", newTag])],
    [`git push origin ${currentBranch}`, () => gitQuiet(["push", "origin", currentBranch])],
    [`git push origin ${newTag}`, () => gitQuiet(["push", "origin", newTag])]
  ];

  if (opts.dryRun) {
    console.log(`[dry-run] 将更新 ${filesToSync.join(", ")} → ${newVersion}`);
    runSteps(steps, true);
    console.log("");
    console.log("[dry-run] 完成，未实际修改仓库。");
  } else {
    updateVersionFiles(newVersion);
    updateChangelog(newVersion, releaseNotes);
    runSteps(steps, false);
    console.log("");
    console.log(`发布完成: ${newTag}`);
    console.log("GitHub Actions 将自动构建并发布 Android 平板安装包。");
  }
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
