// Checks that a package is ready to publish, for the Release workflow:
//   node scripts/release-check.mjs ngu-form [notes-file]
// Fails unless projects/<package>/package.json has a version that npm does not have yet, no git
// tag exists for it, and CHANGELOG.md has a dated section for it. Prints `version=`, `tag=` and
// `prerelease=` lines (for $GITHUB_OUTPUT) and writes that changelog section to the notes file.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [name, notesFile = 'release-notes.md'] = process.argv.slice(2);
const PACKAGES = ['ngu-form', 'ngu-dropdown'];
if (!PACKAGES.includes(name)) {
  fail(`Usage: node scripts/release-check.mjs <${PACKAGES.join('|')}> [notes-file]`);
}

const { version } = JSON.parse(readFileSync(`projects/${name}/package.json`, 'utf8'));
const tag = `${name}@${version}`;

const published = npmVersions(name);
if (published.includes(version)) {
  fail(`${name}@${version} is already on npm, and a version can never be published twice. Bump projects/${name}/package.json.`);
}
if (execFileSync('git', ['tag', '--list', tag], { encoding: 'utf8' }).trim()) {
  fail(`The tag ${tag} already exists.`);
}

const changelog = readFileSync(`projects/${name}/CHANGELOG.md`, 'utf8');
const heading = new RegExp(`^## ${version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\(([^)]+)\\)(.*)$`, 'm');
const match = heading.exec(changelog);
if (!match) {
  fail(`projects/${name}/CHANGELOG.md has no "## ${version} (date): title" section.`);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(match[1])) {
  fail(`The changelog section for ${version} says "(${match[1]})". Put the release date there (YYYY-MM-DD).`);
}
const start = match.index + match[0].length;
const next = changelog.slice(start).search(/^## /m);
const section = changelog.slice(start, next === -1 ? undefined : start + next).trim();
const title = match[2].replace(/^:\s*/, '').trim();
writeFileSync(notesFile, `${title ? `**${title}**\n\n` : ''}${section}\n`);

console.log(`version=${version}`);
console.log(`tag=${tag}`);
console.log(`prerelease=${version.includes('-')}`);

/** Versions on npm; none for a package that was never published. */
function npmVersions(pkg) {
  try {
    const out = execFileSync('npm', ['view', pkg, 'versions', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const parsed = JSON.parse(out);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch (error) {
    if (String(error.stderr ?? '').includes('E404')) {
      return [];
    }
    throw error;
  }
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
