import assert from 'node:assert/strict';
import {
  bumpVersion,
  compareSemver,
  hasOnlyAllowedWorkingTreeChange,
  parseReleaseArgs,
  resolveBaseVersion,
  updateCargoLockVersion,
  updateCargoTomlVersion,
  validateSemver,
} from './release-lib.mjs';
import {
  buildPublishedReleaseNotes,
  extractChangelogSection,
  formatChangelogSection,
  formatReleaseNotes,
  groupCommitSubjects,
  prependChangelogSection,
} from './changelog-lib.mjs';

// ---- 版本号递增与解析 ----
assert.equal(bumpVersion('0.1.0', 'patch'), '0.1.1');
assert.equal(bumpVersion('v0.1.9', 'minor'), '0.2.0');
assert.equal(bumpVersion('1.4.2', 'major'), '2.0.0');
assert.throws(() => bumpVersion('0.1.0', 'alpha'));
validateSemver('0.1.1');
assert.throws(() => validateSemver('v0.1.1'));
assert.equal(compareSemver('0.2.0', '0.1.9'), 1);
assert.equal(compareSemver('0.1.0', '0.1.0'), 0);
assert.equal(resolveBaseVersion('', '0.1.0'), '0.1.0');
assert.equal(resolveBaseVersion('v0.1.2', '0.1.0'), '0.1.2');
assert.equal(resolveBaseVersion('v0.1.2', '0.2.0'), '0.2.0');

// ---- 参数与工作区状态校验 ----
assert.deepEqual(parseReleaseArgs(['--', 'minor', '--dry-run']), {
  help: false,
  bumpType: 'minor',
  explicitVersion: '',
  dryRun: true,
  skipConfirm: false,
  notesFile: '',
});
assert.deepEqual(parseReleaseArgs(['-y', 'v1.2.3', '--notes-file', 'notes.md']), {
  help: false,
  bumpType: 'patch',
  explicitVersion: '1.2.3',
  dryRun: false,
  skipConfirm: true,
  notesFile: 'notes.md',
});
assert.equal(hasOnlyAllowedWorkingTreeChange('?? notes.md\0', 'notes.md'), true);
assert.equal(hasOnlyAllowedWorkingTreeChange(' M package.json\0', 'notes.md'), false);

// ---- Cargo.toml & Cargo.lock 仅替换主包版本 ----
{
  const toml = [
    '[package]',
    'name = "kidbuddy"',
    'version = "0.1.0"',
    'edition = "2021"',
    '',
    '[dependencies]',
    'serde = { version = "1", features = ["derive"] }',
  ].join('\r\n');
  const updated = updateCargoTomlVersion(toml, '0.1.1');
  assert.ok(updated.includes('version = "0.1.1"\r\n'));
  assert.ok(updated.includes('serde = { version = "1"'));
}

{
  const lock = [
    '[[package]]',
    'name = "anyhow"',
    'version = "1.0.0"',
    '',
    '[[package]]',
    'name = "kidbuddy"',
    'version = "0.1.0"',
    'dependencies = []',
  ].join('\n');
  const res = updateCargoLockVersion(lock, 'kidbuddy', '0.1.1');
  assert.equal(res.updated, true);
  assert.ok(res.content.includes('name = "anyhow"\nversion = "1.0.0"'));
  assert.ok(res.content.includes('name = "kidbuddy"\nversion = "0.1.1"'));
}

// ---- CHANGELOG 与发版说明生成 ----
{
  const groups = groupCommitSubjects([
    'feat(android): 新增自动打包',
    'fix(android): 修复按住说话',
    'perf: 提升列表滚动速度',
    'ci: 忽略内部提交',
    'chore: 忽略构建提交',
  ]);
  assert.deepEqual(Object.keys(groups), ['新功能', '问题修复', '体验优化']);
  const md = formatReleaseNotes(groups);
  const sec = formatChangelogSection({ version: 'v0.1.1', date: '2026-11-25', notes: md });
  const changelog = prependChangelogSection('', sec);
  assert.equal(extractChangelogSection(changelog, 'v0.1.1'), md);

  const published = buildPublishedReleaseNotes({
    changelog,
    version: 'v0.1.1',
    installationInstructions: '## 下载\nKidBuddy_Android-arm64-v0.1.1.apk',
  });
  assert.ok(published.includes('### 新功能'));
  assert.ok(published.includes('KidBuddy_Android-arm64-v0.1.1.apk'));

  const fallbackOnly = buildPublishedReleaseNotes({
    changelog: '',
    version: 'v0.1.0',
    installationInstructions: '## 下载\nKidBuddy_Android-arm64-v0.1.0.apk',
    allowMissingChangelog: true,
  });
  assert.equal(fallbackOnly, '## 下载\nKidBuddy_Android-arm64-v0.1.0.apk');
}

console.log('release.test.mjs: ok');
