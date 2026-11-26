// Pure helpers for the release flow. No git/fs side effects — unit-testable.

export function bumpVersion(version, part) {
  const parts = String(version).replace(/^v/, "").split(".").map(Number);
  const major = parts[0] || 0;
  const minor = parts[1] || 0;
  const patch = parts[2] || 0;
  switch (part) {
    case "major":
      return `${major + 1}.0.0`;
    case "minor":
      return `${major}.${minor + 1}.0`;
    case "patch":
      return `${major}.${minor}.${patch + 1}`;
    default:
      throw new Error(`无效的 bump 类型: ${part}`);
  }
}

export function validateSemver(version) {
  if (!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(version)) {
    throw new Error(`版本号格式无效: ${version}（应为 x.y.z）`);
  }
}

export function compareSemver(a, b) {
  const pa = String(a).replace(/^v/, "").split(".").map(Number);
  const pb = String(b).replace(/^v/, "").split(".").map(Number);
  for (let i = 0; i < 3; i += 1) {
    const diff = (pa[i] || 0) - (pb[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

/** 没有打过 v* tag 时回退到 package.json 的当前版本，避免首个版本从 0.1.0 倒退成 0.0.1 */
export function resolveBaseVersion(latestTag, packageVersion = "0.0.0") {
  const tagVer = String(latestTag || "").trim().replace(/^v/, "");
  const pkgVer = String(packageVersion || "").trim().replace(/^v/, "");
  const validTag = /^[0-9]+\.[0-9]+\.[0-9]+$/.test(tagVer) ? tagVer : "";
  const validPkg = /^[0-9]+\.[0-9]+\.[0-9]+$/.test(pkgVer) ? pkgVer : "";
  if (validTag && (!validPkg || compareSemver(validTag, validPkg) >= 0)) return validTag;
  return validPkg || validTag || "0.0.0";
}

export function hasOnlyAllowedWorkingTreeChange(porcelain, allowedPath) {
  if (!allowedPath) return false;
  const records = porcelain.split("\0").filter(Boolean);
  return records.length > 0 && records.every((record) => {
    const status = record.slice(0, 2);
    const filePath = record.slice(3);
    return ["??", " M"].includes(status) && filePath === allowedPath;
  });
}

export function updateCargoTomlVersion(content, version) {
  const headerMatch = /^\[package\]\r?$/m.exec(content);
  if (!headerMatch) {
    throw new Error("src-tauri/Cargo.toml 缺少 [package] 段落");
  }
  const sectionStart = headerMatch.index;
  const nextHeaderRe = /^\[[^\]]+\]\r?$/gm;
  nextHeaderRe.lastIndex = sectionStart + headerMatch[0].length;
  const nextHeaderMatch = nextHeaderRe.exec(content);
  const sectionEnd = nextHeaderMatch ? nextHeaderMatch.index : content.length;

  const section = content.slice(sectionStart, sectionEnd);
  const versionRe = /^(version\s*=\s*")[^"]*(")/m;
  if (!versionRe.test(section)) {
    throw new Error("src-tauri/Cargo.toml 缺少 [package] version");
  }
  const nextSection = section.replace(versionRe, `$1${version}$2`);
  return content.slice(0, sectionStart) + nextSection + content.slice(sectionEnd);
}

export function updateCargoLockVersion(content, pkgName, version) {
  const blockRe = /(^\[\[package\]\]\r?\n[\s\S]*?)(?=^\[\[package\]\]\r?\n|(?![\s\S]))/gm;
  let updated = false;
  const nameRe = new RegExp(`^name\\s*=\\s*"${pkgName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"\\s*$`, "m");
  const next = content.replace(blockRe, (block) => {
    if (updated || !nameRe.test(block)) return block;
    const versionRe = /^(version\s*=\s*")[^"]*(")/m;
    if (!versionRe.test(block)) return block;
    updated = true;
    return block.replace(versionRe, `$1${version}$2`);
  });
  return { content: next, updated };
}

export function parseReleaseArgs(argv) {
  let bumpType = "patch";
  let explicitVersion = "";
  let dryRun = false;
  let skipConfirm = false;
  let help = false;
  let notesFile = "";
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--") continue;
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "-y" || arg === "--yes") {
      skipConfirm = true;
    } else if (arg === "patch" || arg === "minor" || arg === "major") {
      bumpType = arg;
    } else if (/^v?[0-9]+\.[0-9]+\.[0-9]+$/.test(arg)) {
      explicitVersion = arg.replace(/^v/, "");
    } else if (arg === "-h" || arg === "--help") {
      help = true;
    } else if (arg === "--notes-file") {
      const filePath = argv[index + 1];
      if (!filePath || filePath.startsWith("-")) {
        throw new Error("--notes-file 需要提供文件路径");
      }
      notesFile = filePath;
      index += 1;
    } else {
      throw new Error(`未知参数: ${arg}\n运行 npm run release -- --help 查看用法`);
    }
  }
  return { help, bumpType, explicitVersion, dryRun, skipConfirm, notesFile };
}

export const RELEASE_HELP = `自动发布新版本：同步版本号 → 更新 CHANGELOG → 提交 → 打 tag → 推送到 origin

用法:
  npm run release                         # 自动 patch 递增 (v0.1.0 → v0.1.1)
  npm run release:patch                   # 同上
  npm run release:minor                   # v0.1.0 → v0.2.0
  npm run release:major                   # v0.1.0 → v1.0.0
  npm run release -- 0.2.0                # 指定目标版本号
  npm run release -- --notes-file notes.md  # 使用自定义 Markdown 发布说明
  npm run release -- --dry-run            # 仅预览，不改动任何文件或远程
  npm run release -- -y patch             # 跳过交互确认直接发布
`;
