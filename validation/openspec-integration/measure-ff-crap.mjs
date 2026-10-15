#!/usr/bin/env node
// Measurement only: never writes source, changes coverage, or manufactures observations.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const workroot = path.dirname(fileURLToPath(import.meta.url));

const buildRoot = path.resolve(process.argv[4] ?? path.join(workroot, '../../tools/openspec/.build'));
const helperRoot = path.resolve(process.argv[5] ?? path.join(workroot, '../../tools/openspec'));
const require = createRequire(path.join(buildRoot, 'package.json'));
const { Linter } = require('eslint');
const complexityRule = require('eslint/use-at-your-own-risk').builtinRules.get('complexity');
const coverageDir = path.resolve(process.argv[2] ?? path.join(workroot, 'independent-e2e/final-coverage'));
const output = process.argv[3];
const hash = value => createHash('sha256').update(value).digest('hex');
function allJson(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? allJson(file) : entry.name.endsWith('.json') ? [file] : [];
  });
}
const coverageFiles = allJson(coverageDir);
const observations = coverageFiles.flatMap(file => {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  return (raw.result ?? []).map(script => ({ ...script, coverageFile: file }));
});
function functionsAndComplexities(source) {
  const functions = [];
  const capture = {
    meta: complexityRule.meta,
    create(context) {
      return complexityRule.create({
        sourceCode: context.sourceCode,
        options: [0],
        report({ node, data }) {
          functions.push({
            name: node.id?.name ?? (node.parent?.type === 'VariableDeclarator' ? node.parent.id?.name : undefined) ?? `<anonymous@${node.loc.start.line}:${node.loc.start.column + 1}>`,
            start: node.range[0], end: node.range[1], line: node.loc.start.line,
            complexity: Number(data.complexity),
          });
        },
      });
    },
  };
  const diagnostics = new Linter().verify(source, [{
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    plugins: { measure: { rules: { complexity: capture } } },
    rules: { 'measure/complexity': ['warn', 0] },
  }]);
  if (diagnostics.length) throw new Error(`AST measurement failed: ${JSON.stringify(diagnostics)}`);
  return functions.sort((a, b) => a.start - b.start);
}
function effectiveCount(ranges, start, end) {
  const covering = ranges.filter(range => range.startOffset <= start && range.endOffset >= end);
  covering.sort((a, b) => (a.endOffset - a.startOffset) - (b.endOffset - b.startOffset));
  return covering[0]?.count ?? 0;
}
function observedCoverage(fn, samples) {
  if (!samples.length) return undefined;
  const boundaries = new Set([fn.start, fn.end]);
  for (const sample of samples) for (const range of sample.ranges) {
    boundaries.add(Math.max(fn.start, range.startOffset));
    boundaries.add(Math.min(fn.end, range.endOffset));
  }
  const ordered = [...boundaries].filter(n => n >= fn.start && n <= fn.end).sort((a, b) => a - b);
  let coveredBytes = 0; let coveredBlocks = 0;
  for (let index = 0; index < ordered.length - 1; index++) {
    const start = ordered[index]; const end = ordered[index + 1];
    if (samples.some(sample => effectiveCount(sample.ranges, start, end) > 0)) {
      coveredBytes += end - start; coveredBlocks++;
    }
  }
  const blocks = Math.max(1, ordered.length - 1);
  const byteCoverage = coveredBytes / (fn.end - fn.start);
  const blockCoverage = coveredBlocks / blocks;
  return { byteCoverage, blockCoverage, coverage: Math.min(byteCoverage, blockCoverage), coveredBytes, totalBytes: fn.end - fn.start, coveredBlocks, blocks, samples: samples.length, preciseBlockCoverage: samples.every(sample => sample.isBlockCoverage) };
}
function measure(root, relativePath, typescriptPath, onlyFunction) {
  const file = path.join(root, relativePath);
  if (!fs.existsSync(file)) return { file: relativePath, status: 'NOT_MEASURED', reason: 'Compiled source not found' };
  const source = fs.readFileSync(file, 'utf8');
  const scriptSamples = observations.filter(script => {
    try {
      if (script.url.startsWith('repo:tools/openspec/.build/')) return path.resolve(buildRoot, script.url.slice('repo:tools/openspec/.build/'.length)) === file;
      if (script.url.startsWith('repo:tools/openspec/')) return path.resolve(helperRoot, script.url.slice('repo:tools/openspec/'.length)) === file;
      return fileURLToPath(script.url) === file;
    } catch { return false; }
  });
  const functions = functionsAndComplexities(source).filter(fn => !onlyFunction || fn.name === onlyFunction).map(fn => {
    const matching = scriptSamples.flatMap(script => script.functions).filter(sample => sample.ranges[0]?.startOffset === fn.start && sample.ranges[0]?.endOffset === fn.end);
    const coverage = observedCoverage(fn, matching);
    if (!coverage) return { ...fn, status: 'NOT_MEASURED', reason: 'No exact-offset V8 function coverage', crap: null };
    const crap = fn.complexity ** 2 * (1 - coverage.coverage) ** 3 + fn.complexity;
    return { ...fn, ...coverage, crap, hardGate: crap <= 50 ? 'PASS' : 'FAIL', target: crap <= 10 ? 'PASS' : 'ABOVE_TARGET', status: 'MEASURED' };
  });
  return {
    file, relativePath, sha256: hash(source), scope: onlyFunction ?? 'all functions',
    typescript: typescriptPath && fs.existsSync(path.join(root, typescriptPath)) ? { file: typescriptPath, sha256: hash(fs.readFileSync(path.join(root, typescriptPath))) } : undefined,
    status: scriptSamples.length && functions.length && functions.some(fn => fn.status === 'MEASURED') ? 'MEASURED_WITH_LIMITATIONS' : scriptSamples.length && !functions.length ? 'MODULE_EXECUTED_NO_FUNCTIONS' : 'NOT_MEASURED',
    scriptSamples: scriptSamples.length, functions,
  };
}
const report = {
  generatedAt: new Date().toISOString(), coverageDir, buildRoot, helperRoot,
  method: {
    complexity: 'Actual installed ESLint classic complexity rule, threshold zero, on compiled JavaScript AST; function node ranges retained. No estimated branch count.',
    coverage: 'Exact V8 function start/end matching. Union observed executions across processes; most-specific V8 range wins. Split at every observed range boundary; conservative coverage is min(executed segment fraction, executed byte fraction). Missing observations are NOT_MEASURED.',
    formula: 'CRAP = CC^2 * (1 - coverage)^3 + CC; hard limit 50, target 10.',
    limitations: 'V8 range-segment coverage is not Istanbul statement/branch coverage. Unobserved branch boundaries cannot be inferred. Built-source hashes are recorded at measurement time; V8 JSON does not contain a source hash, so caller must ensure unchanged build during collection. Nested callbacks are measured separately. NOT_MEASURED is not a pass.',
  },
  coverageFiles: coverageFiles.map(file => ({ file, sha256: hash(fs.readFileSync(file)) })),
  files: [
    measure(buildRoot, 'dist/core/ff-validity.js', 'src/core/ff-validity.ts'),
    measure(buildRoot, 'dist/core/ff-close.js', 'src/core/ff-close.ts'),
    measure(buildRoot, 'dist/core/archive.js', 'src/core/archive.ts', 'beforeFFMutation'),
    measure(helperRoot, 'ff-snapshot.mjs'),
    measure(helperRoot, 'build.mjs'),
  ],
};
report.summary = {
  measuredFunctions: report.files.flatMap(file => file.functions ?? []).filter(fn => fn.status === 'MEASURED').length,
  unmeasuredFunctions: report.files.flatMap(file => file.functions ?? []).filter(fn => fn.status === 'NOT_MEASURED').length,
  hardFailures: report.files.flatMap(file => file.functions ?? []).filter(fn => fn.hardGate === 'FAIL').map(fn => ({ name: fn.name, complexity: fn.complexity, coverage: fn.coverage, crap: fn.crap })),
  aboveTarget: report.files.flatMap(file => file.functions ?? []).filter(fn => fn.target === 'ABOVE_TARGET').map(fn => ({ name: fn.name, complexity: fn.complexity, coverage: fn.coverage, crap: fn.crap })),
};
// Publish logical repository-relative paths, never host workspace locations.
const repositoryRoot = path.resolve(helperRoot, '../..');
function logicalPaths(value) {
  if (Array.isArray(value)) return value.map(logicalPaths);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, logicalPaths(item)]));
  if (typeof value === 'string' && path.isAbsolute(value)) {
    const relative = path.relative(repositoryRoot, value);
    return relative.startsWith('..') ? 'external-evidence/' + path.basename(value) : relative.split(path.sep).join('/');
  }
  return value;
}
const serialized = JSON.stringify(logicalPaths(report), null, 2) + '\n';
if (output) fs.writeFileSync(path.resolve(output), serialized);
process.stdout.write(serialized);
