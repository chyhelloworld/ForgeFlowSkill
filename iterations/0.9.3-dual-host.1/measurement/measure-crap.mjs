// Independent, fail-closed production-function CC + actual V8 coverage measurement.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { canonical, files, snapshot, inventoryCoverage, sha256 } from './scope.mjs';

const normalizeKey = file => process.platform === 'win32' ? path.normalize(file).toLowerCase() : path.normalize(file);
const functionTypes = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

export function loadTools(dependencyRoot) {
  const req = createRequire(path.join(canonical(dependencyRoot), 'package.json'));
  const { Linter } = req('eslint');
  const rule = req('eslint/use-at-your-own-risk').builtinRules.get('complexity');
  const eslintPackage = req.resolve('eslint/package.json');
  const eslintRoot = path.dirname(eslintPackage);
  const ruleFile = path.join(eslintRoot, 'lib/rules/complexity.js');
  const espreePackage = req.resolve('espree/package.json');
  return { Linter, rule, provenance: {
    eslint: { version: req('eslint/package.json').version, package: eslintPackage, packageSha256: sha256(fs.readFileSync(eslintPackage)), rule: ruleFile, ruleSha256: sha256(fs.readFileSync(ruleFile)) },
    espree: { version: JSON.parse(fs.readFileSync(espreePackage, 'utf8')).version, package: espreePackage, packageSha256: sha256(fs.readFileSync(espreePackage)) }
  } };
}

export function astFunctions(source, tools) {
  const nodes = [];
  const reports = [];
  const diagnostics = new tools.Linter().verify(source, [{
    languageOptions: { ecmaVersion: 2022, sourceType: 'module' },
    plugins: { independent: { rules: { cc: {
      meta: tools.rule.meta,
      create(context) {
        const listeners = tools.rule.create({ sourceCode: context.sourceCode, options: [{ max: 0, variant: 'classic' }], report({ node, data }) { reports.push({ node, complexity: Number(data.complexity), label: data.name }); } });
        for (const type of functionTypes) listeners[type] = node => nodes.push(node);
        return listeners;
      }
    } } } }, rules: { 'independent/cc': ['warn', { max: 0, variant: 'classic' }] }
  }]);
  if (diagnostics.length) throw new Error(`AST diagnostics: ${JSON.stringify(diagnostics)}`);
  const result = nodes.map(node => {
    const parent = node.parent;
    const method = parent?.type === 'MethodDefinition' || (parent?.type === 'Property' && (parent.method || parent.kind === 'get' || parent.kind === 'set'));
    const spans = [{ start: node.range[0], end: node.range[1], mapping: 'AST function range' }];
    if (method) {
      spans.push({ start: parent.range[0], end: parent.range[1], mapping: 'AST method/property range' });
      spans.push({ start: parent.key.range[0], end: parent.range[1], mapping: 'AST method key through body (V8 may omit static/accessor prefix)' });
    }
    const uniqueSpans = spans.filter((span, i) => spans.findIndex(other => other.start === span.start && other.end === span.end) === i);
    const cc = reports.filter(report => report.node === node && !/^Class (field initializer|static block)$/i.test(report.label));
    const name = node.id?.name ?? (method ? parent.key.name ?? String(parent.key.value ?? '<computed>') : undefined) ?? (parent?.type === 'VariableDeclarator' ? parent.id.name : undefined) ?? `<anonymous@${node.loc.start.line}:${node.loc.start.column + 1}>`;
    return { name, line: node.loc.start.line, column: node.loc.start.column + 1, astStart: node.range[0], astEnd: node.range[1], kind: method ? 'method' : node.type, complexity: cc.length === 1 && Number.isFinite(cc[0].complexity) && cc[0].complexity >= 1 ? cc[0].complexity : null, complexityReason: cc.length === 1 ? undefined : `Expected one explicit-function CC report, found ${cc.length}`, spans: uniqueSpans };
  });
  // Implicit class code paths must remain visible instead of silently disappearing.
  for (const report of reports.filter(report => /^Class (field initializer|static block)$/i.test(report.label))) {
    result.push({ name: report.label, line: report.node.loc.start.line, column: report.node.loc.start.column + 1, astStart: report.node.range[0], astEnd: report.node.range[1], kind: 'implicit-class-function', complexity: report.complexity, spans: [], mappingReason: 'Implicit class code path needs a separately validated V8 mapping' });
  }
  return result.sort((a, b) => a.astStart - b.astStart || a.astEnd - b.astEnd);
}

function validRanges(sample, start, end) {
  if (!sample.ranges.length || !sample.ranges.every(range => Number.isInteger(range.startOffset) && Number.isInteger(range.endOffset) && range.startOffset >= start && range.endOffset <= end && range.startOffset < range.endOffset && Number.isInteger(range.count) && range.count >= 0)) return false;
  return !sample.ranges.some((a, i) => sample.ranges.some((b, j) => j > i && ((a.startOffset === b.startOffset && a.endOffset === b.endOffset) || (a.startOffset < b.startOffset && b.startOffset < a.endOffset && a.endOffset < b.endOffset) || (b.startOffset < a.startOffset && a.startOffset < b.endOffset && b.endOffset < a.endOffset))));
}
function effectiveCount(ranges, start, end) {
  const enclosing = ranges.filter(range => range.startOffset <= start && range.endOffset >= end).sort((a, b) => (a.endOffset - a.startOffset) - (b.endOffset - b.startOffset));
  if (!enclosing.length) throw new Error('No V8 range covers interval');
  if (enclosing.length > 1 && enclosing[0].endOffset - enclosing[0].startOffset === enclosing[1].endOffset - enclosing[1].startOffset && enclosing[0].count !== enclosing[1].count) throw new Error('Ambiguous V8 interval counts');
  return enclosing[0].count;
}
export function observedCoverage(span, samples, nested) {
  if (!samples.length) return { reason: 'NO_EXACT_FUNCTION_RANGE' };
  if (samples.some(sample => !validRanges(sample, span.start, span.end))) return { reason: 'INVALID_V8_RANGES' };
  // An uncalled function root with count 0 proves real zero coverage. An executed
  // function without block coverage does not prove its internal branch coverage.
  if (samples.some(sample => sample.ranges[0].count > 0 && sample.isBlockCoverage !== true)) return { reason: 'EXECUTED_FUNCTION_WITHOUT_PRECISE_BLOCK_COVERAGE' };
  const boundaries = new Set([span.start, span.end]);
  for (const sample of samples) for (const range of sample.ranges) { boundaries.add(range.startOffset); boundaries.add(range.endOffset); }
  const exclusions = nested.filter(fn => fn.astStart > span.start && fn.astEnd < span.end).map(fn => ({ start: fn.astStart, end: fn.astEnd }));
  for (const excluded of exclusions) { boundaries.add(excluded.start); boundaries.add(excluded.end); }
  const points = [...boundaries].sort((a, b) => a - b);
  let totalCodeUnits = 0, coveredCodeUnits = 0, segments = 0, coveredSegments = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i], end = points[i + 1];
    if (exclusions.some(excluded => excluded.start <= start && excluded.end >= end)) continue;
    totalCodeUnits += end - start;
    segments++;
    if (samples.some(sample => effectiveCount(sample.ranges, start, end) > 0)) { coveredCodeUnits += end - start; coveredSegments++; }
  }
  if (!totalCodeUnits || !segments) return { reason: 'EMPTY_EFFECTIVE_FUNCTION_RANGE' };
  const codeUnitCoverage = coveredCodeUnits / totalCodeUnits;
  const segmentCoverage = coveredSegments / segments;
  return { coverage: Math.min(codeUnitCoverage, segmentCoverage), codeUnitCoverage, segmentCoverage, coveredCodeUnits, totalCodeUnits, coveredSegments, segments, exactRangeSamples: samples.length, nestedFunctionSpansExcluded: exclusions.length, allExecutedSamplesHavePreciseBlockCoverage: true };
}

function validateCapture(provenanceFile, repo, current) {
  const bytes = fs.readFileSync(provenanceFile);
  const data = JSON.parse(bytes);
  const problems = [];
  if (data.schema !== 1) problems.push('Unknown provenance schema');
  if (normalizeKey(data.repo ?? '') !== normalizeKey(repo)) problems.push('Repository path differs');
  if (data.result?.code !== 0 || data.result?.error || data.result?.signal) problems.push('Captured test command did not exit successfully');
  if (!data.unchanged || JSON.stringify(data.before) !== JSON.stringify(data.after)) problems.push('Source changed during capture');
  if (JSON.stringify(data.before) !== JSON.stringify(current)) problems.push('Current source does not match captured source');
  const coverageDir = canonical(data.coverageDir);
  const actual = inventoryCoverage(coverageDir);
  if (!actual.length || JSON.stringify(actual) !== JSON.stringify(data.coverageFiles)) problems.push('Raw coverage inventory/hash mismatch or empty');
  const observations = [];
  if (!problems.length) for (const file of actual) {
    const raw = JSON.parse(fs.readFileSync(path.join(coverageDir, file.file), 'utf8'));
    if (!Array.isArray(raw.result)) { problems.push(`Invalid V8 result: ${file.file}`); continue; }
    for (const observation of raw.result) observations.push({ ...observation, evidence: { provenance: provenanceFile, rawFile: file.file, rawSha256: file.sha256, scriptId: observation.scriptId } });
  }
  return { provenance: { file: provenanceFile, sha256: sha256(bytes), collector: data.collector, command: data.command, result: data.result, startedAt: data.startedAt, completedAt: data.completedAt, coverageDir, rawFiles: actual, problems }, observations };
}

export function measure(repoArg, dependencyArg, provenanceFiles) {
  const repo = canonical(repoArg), tools = loadTools(dependencyArg), current = snapshot(repo);
  const captures = provenanceFiles.map(file => validateCapture(path.resolve(file), repo, current));
  const provenanceProblems = captures.flatMap(capture => capture.provenance.problems.map(problem => ({ provenance: capture.provenance.file, problem })));
  if (!captures.length) provenanceProblems.push({ problem: 'No capture provenance supplied' });
  const observations = provenanceProblems.length ? [] : captures.flatMap(capture => capture.observations);
  const fileReports = files.map(file => {
    const stamp = current.find(item => item.file === file);
    if (stamp.error) return { ...stamp, status: 'NOT_MEASURED', reason: 'SOURCE_FILE_UNAVAILABLE', functions: [] };
    const absolute = canonical(path.join(repo, file)), sourceBytes = fs.readFileSync(absolute), source = sourceBytes.toString('utf8');
    if (sha256(sourceBytes) !== stamp.sha256) return { ...stamp, status: 'NOT_MEASURED', reason: 'SOURCE_CHANGED_DURING_MEASUREMENT', functions: [] };
    let functions;
    try { functions = astFunctions(source, tools); }
    catch (error) { return { ...stamp, status: 'NOT_MEASURED', reason: error.message, functions: [] }; }
    const scripts = observations.filter(observation => {
      try {
        const url = new URL(observation.url);
        return url.protocol === 'file:' && !url.search && !url.hash && normalizeKey(fileURLToPath(url)) === normalizeKey(absolute) && observation.functions?.some(fn => fn.ranges?.[0]?.startOffset === 0 && fn.ranges[0].endOffset === source.length);
      } catch { return false; }
    });
    const rows = functions.map(fn => {
      const row = { ...fn, status: 'NOT_MEASURED' };
      if (fn.complexity === null) return { ...row, reason: 'COMPLEXITY_NOT_MEASURED' };
      if (provenanceProblems.length) return { ...row, reason: 'INVALID_CAPTURE_PROVENANCE' };
      if (!scripts.length) return { ...row, reason: 'NO_ATTESTED_EXACT_SOURCE_URL_AND_MODULE_RANGE' };
      const choices = fn.spans.map(span => ({ span, samples: scripts.flatMap(script => script.functions.filter(sample => sample.ranges?.[0]?.startOffset === span.start && sample.ranges[0].endOffset === span.end).map(sample => ({ ...sample, evidence: script.evidence }))) })).filter(choice => choice.samples.length);
      if (choices.length !== 1) return { ...row, reason: choices.length ? 'AMBIGUOUS_AST_TO_V8_RANGE' : fn.mappingReason ?? 'NO_EXACT_FUNCTION_RANGE' };
      const { span, samples } = choices[0];
      const sampleKeys = samples.map(sample => JSON.stringify(sample.evidence));
      if (new Set(sampleKeys).size !== sampleKeys.length) return { ...row, reason: 'DUPLICATE_EXACT_RANGE_WITHIN_SCRIPT' };
      const coverage = observedCoverage(span, samples, functions.filter(other => other !== fn));
      if (coverage.reason) return { ...row, reason: coverage.reason };
      const crap = fn.complexity ** 2 * (1 - coverage.coverage) ** 3 + fn.complexity;
      return { ...row, status: 'MEASURED', matchedRange: span, ...coverage, evidence: samples.map(sample => ({ ...sample.evidence, functionName: sample.functionName, preciseBlockCoverage: sample.isBlockCoverage, rangeCount: sample.ranges.length, rootExecutionCount: sample.ranges[0].count })), crap, hardGate: crap <= 50 ? 'PASS' : 'FAIL', target: crap <= 10 ? 'PASS' : 'ABOVE_TARGET' };
    });
    return { ...stamp, absolute, sourceUrl: pathToFileURL(absolute).href, exactSourceScriptSamples: scripts.length, status: rows.every(row => row.status === 'MEASURED') ? 'MEASURED' : 'NOT_MEASURED', functions: rows };
  });
  if (JSON.stringify(snapshot(repo)) !== JSON.stringify(current)) throw new Error('Source changed during measurement; no report is valid, rerun against stable source');
  const functions = fileReports.flatMap(file => file.functions.map(fn => ({ file: file.file, ...fn })));
  const measured = functions.filter(fn => fn.status === 'MEASURED');
  const unmeasured = functions.filter(fn => fn.status !== 'MEASURED');
  const unavailableFiles = fileReports.filter(file => file.status !== 'MEASURED' && !file.functions.length);
  const hardFailures = measured.filter(fn => fn.crap > 50);
  const short = fn => ({ file: fn.file, name: fn.name, line: fn.line, complexity: fn.complexity, coverage: fn.coverage, crap: fn.crap, reason: fn.reason });
  return {
    schema: 1, version: JSON.parse(fs.readFileSync(path.join(repo, 'package.json'), 'utf8')).version, repo, measuredAt: new Date().toISOString(),
    tool: { script: fileURLToPath(import.meta.url), scriptSha256: sha256(fs.readFileSync(fileURLToPath(import.meta.url))), scopeSha256: sha256(fs.readFileSync(new URL('./scope.mjs', import.meta.url))), node: process.version, v8: process.versions.v8, executable: process.execPath, executableSha256: sha256(fs.readFileSync(process.execPath)), ...tools.provenance },
    method: { complexity: 'Actual ESLint classic complexity rule, max 0; independent explicit-function AST inventory includes nested functions. Implicit class functions retained and fail closed if mapping is unvalidated.', coverage: 'Actual V8 ranges, exact canonical source file URL and exact AST-derived start/end offsets. Union of executions; innermost applicable range count; conservative minimum of UTF-16 code-unit and range-segment coverage. Nested function spans excluded from enclosing coverage and measured independently.', sameSource: 'Controlled run before/after SHA256 manifests, successful command, immutable raw V8 inventory hashes, current-source match. V8 JSON has no embedded source hash; this attestation assumes no transient rewrite-and-restore during the controlled run.', formula: 'CC^2 * (1 - coverage)^3 + CC', hardLimit: 50, optimizationTarget: 10, limitations: ['Coverage is a documented V8 range proxy, not basis-path, Istanbul statement, line, or branch coverage.', 'No metric claim for files outside the six named production modules. Related bin/payload/files/build modules and runtime host calls need separate evidence.', 'An absent function mapping is NOT_MEASURED; an observed uncalled root with count 0 is measured zero coverage.', 'Executed functions without precise block coverage are NOT_MEASURED. Passing CRAP does not establish behavior, concurrency safety, host invocation, or release readiness.'] },
    captures: captures.map(capture => capture.provenance), provenanceProblems, files: fileReports,
    summary: { gate: hardFailures.length ? 'FAIL' : unmeasured.length || unavailableFiles.length || provenanceProblems.length ? 'NOT_MEASURED' : 'PASS', files: fileReports.length, functions: functions.length, measured: measured.length, unmeasured: unmeasured.map(short), unavailableFiles: unavailableFiles.map(file => ({ file: file.file, reason: file.reason })), hardFailures: hardFailures.map(short), aboveTarget: measured.filter(fn => fn.crap > 10).map(short), maximumMeasuredCrap: measured.length ? Math.max(...measured.map(fn => fn.crap)) : null }
  };
}

if (process.argv[1] && normalizeKey(path.resolve(process.argv[1])) === normalizeKey(fileURLToPath(import.meta.url))) {
  const [repo, dependencies, output, ...provenanceFiles] = process.argv.slice(2);
  if (!repo || !dependencies || !output) throw new Error('Usage: node measure-crap.mjs REPO DEPENDENCY_ROOT OUTPUT [CAPTURE_PROVENANCE...]');
  const report = measure(repo, dependencies, provenanceFiles);
  fs.writeFileSync(path.resolve(output), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.summary, null, 2));
  if (report.summary.gate !== 'PASS') process.exitCode = 2;
}
