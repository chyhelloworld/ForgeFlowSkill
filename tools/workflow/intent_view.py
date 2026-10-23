#!/usr/bin/env python3
"""Read intent-links-v1; report references and recorded facts, never grant acceptance."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path, PureWindowsPath
import re
import stat
import sys

GROUPS = ('requirements', 'modules', 'tasks', 'acceptance')
RELATIONS = {'parent_ids': 'requirements', 'requirement_ids': 'requirements',
             'module_ids': 'modules', 'acceptance_ids': 'acceptance'}
LIMIT = 1024 * 1024


class Reader:
    def __init__(self, root):
        self.root = Path(root).absolute()
        if not self.root.is_dir():
            raise ValueError('root must be a directory')
        for part in (self.root, *self.root.parents):
            info = part.lstat()
            if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
                raise ValueError('root contains symlink/reparse path')
        self.cache = {}
        self.observed = {}

    def read(self, name):
        if name in self.cache:
            return self.cache[name]
        rel = Path(name)
        if (not name or rel.anchor or PureWindowsPath(name).drive
                or ':' in name or '..' in rel.parts or '\\' in name):
            raise ValueError('unsafe path: ' + name)
        path = self.root
        for part in rel.parts:
            path = path / part
            info = path.lstat()
            if stat.S_ISLNK(info.st_mode) or getattr(info, 'st_file_attributes', 0) & 0x400:
                raise ValueError('symlink/reparse path: ' + name)
        if not path.is_file() or path.stat().st_size > LIMIT:
            raise ValueError('not a regular file or exceeds 1 MiB: ' + name)
        with path.open('rb') as stream:
            raw = stream.read(LIMIT + 1)
        if len(raw) > LIMIT:
            raise ValueError('exceeds 1 MiB: ' + name)
        text = raw.decode('utf-8-sig')
        self.cache[name] = text
        self.observed[name] = hashlib.sha256(raw).hexdigest()
        return text

    def reference(self, ref):
        record = {'ref': ref, 'excerpt': '', 'problem': None}
        if not isinstance(ref, str) or not ref:
            record['problem'] = 'missing reference'
            return record
        name, separator, anchor = ref.partition('#')
        try:
            content = self.read(name)
            fragment = locate(content, anchor) if separator else content
            if not fragment.strip():
                raise ValueError('empty reference')
            record.update(text=fragment, excerpt=preview(fragment),
                          sha256=self.observed[name])
        except (OSError, ValueError, UnicodeError) as error:
            record['problem'] = str(error)
        return record


def preview(text):
    if text.startswith('---\n'):
        header = text.split('---', 2)[1]
        description = re.search(r'^description:\s*(.+)$', header, re.M)
        if description:
            text = description[1]
    compact = ' '.join(text.split())
    return compact if len(compact) <= 180 else compact[:177] + '...'


def locate(content, anchor):
    """Only explicit HTML IDs, heading-leading IDs, table first cells and task-plan IDs."""
    if not anchor:
        raise ValueError('empty anchor')
    escaped = re.escape(anchor)
    lines = content.splitlines()
    hits = []
    for i, line in enumerate(lines):
        single = re.match(r'^\s*\|\s*' + escaped + r'\s*\|', line) or re.match(
            r'^\s*-\s+' + escaped + r':', line)
        section = re.match(r'^#{1,6}\s+' + escaped + r'(?:\s|$)', line)
        explicit = re.fullmatch(r'\s*<a id=["\']' + escaped + r'["\']></a>\s*', line)
        if single or section or explicit:
            hits.append((i, bool(single), bool(explicit)))
    # An explicit ID immediately before its identically named heading is one location.
    hits = [hit for hit in hits if not (hit[0] and hits and
            any(prior[2] and prior[0] == hit[0] - 1 for prior in hits))]
    if len(hits) != 1:
        raise ValueError('missing or ambiguous anchor: ' + anchor)
    start, single, explicit = hits[0]
    if single:
        return lines[start]
    end = start + 1
    if explicit and end < len(lines) and lines[end].startswith('#'):
        end += 1
    while end < len(lines) and not re.match(r'^#{1,6}\s|^\s*<a id=', lines[end]):
        end += 1
    return '\n'.join(lines[start:end])


def load_index(text):
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        candidates = []
        for block in re.findall(r'```json\s*\n(.*?)\n```', text, re.S):
            try:
                value = json.loads(block)
            except json.JSONDecodeError:
                continue
            if isinstance(value, dict) and value.get('format') == 'intent-links-v1':
                candidates.append(value)
        if len(candidates) != 1:
            raise ValueError('expected one intent-links-v1 JSON object or Markdown JSON block')
        data = candidates[0]
    if not isinstance(data, dict) or data.get('format') != 'intent-links-v1':
        raise ValueError('unsupported index format')
    seen = set()
    for group in GROUPS:
        rows = data.get(group)
        if not isinstance(rows, list):
            raise ValueError(group + ' must be an array')
        for row in rows:
            if not isinstance(row, dict) or not isinstance(row.get('id'), str) or not row['id'].strip():
                raise ValueError('each item needs a nonempty string id')
            if row['id'] in seen:
                raise ValueError('duplicate id: ' + row['id'])
            seen.add(row['id'])
            for field in (*RELATIONS, 'evidence_refs'):
                if field in row and (not isinstance(row[field], list) or
                                     any(not isinstance(v, str) or not v for v in row[field])):
                    raise ValueError(row['id'] + ': invalid ' + field)
            for field in ('ref', 'progress_ref', 'result_ref'):
                if row.get(field) is not None and not isinstance(row[field], str):
                    raise ValueError(row['id'] + ': invalid ' + field)
    return data


def recorded_state(reference, ident, task=False):
    text = reference.get('text', '')
    if task:
        pattern = r'^\s*-\s+\[([^\]\r\n]*)\]\s+' + re.escape(ident) + r'(?=\s|$)'
        values = re.findall(pattern, text, re.M)
        if any(value not in (' ', 'x', 'X') for value in values):
            return 'unknown'
        states = {'done' if value.lower() == 'x' else 'pending' for value in values}
    else:
        # Collect every explicit assignment before validating; a known token must
        # not conceal another unrecognized/empty value in the same source fragment.
        pattern = r'(?<![\w-])' + re.escape(ident) + r'[ \t]*=[ \t]*([^\s,;:.，；。：!?！？]*)'
        states = set(re.findall(pattern, text))
        if not states <= {'PASS', 'FAIL', 'UNKNOWN', 'PENDING', 'STALE', 'N/A'}:
            return 'unknown'
    return next(iter(states)) if len(states) == 1 else 'unknown'


def public_ref(reference):
    return {key: value for key, value in reference.items() if key != 'text'}


def unmapped_gaps(reader, group, row):
    prefix = row['id'] + ': '
    gaps = [prefix + 'no valid requirement mapping -> ' + str(row.get('ref'))]
    refs = [reader.reference(row.get('ref'))]
    if group == 'tasks':
        ref = reader.reference(row.get('progress_ref'))
        refs.append(ref)
        gaps.append(prefix + 'task progress ' + recorded_state(ref, row['id'], task=True))
        if not row.get('acceptance_ids'):
            gaps.append(prefix + 'no acceptance mapping')
    elif group == 'acceptance':
        ref = reader.reference(row.get('result_ref'))
        refs.extend([ref, *(reader.reference(v) for v in row.get('evidence_refs', []))])
        gaps.append(prefix + 'recorded result ' + recorded_state(ref, row['id']) +
                    ' / validity=unknown -> ' + str(row.get('result_ref')))
        if not row.get('evidence_refs'):
            gaps.append(prefix + 'no evidence references')
    gaps.extend(prefix + str(ref['ref']) + ': ' + ref['problem'] for ref in refs if ref['problem'])
    return gaps


def build_report(root, index, requirement=None):
    reader = Reader(root)
    data = load_index(reader.read(index))
    ids = {group: {row['id'] for row in data[group]} for group in GROUPS}
    gaps = []
    for group in GROUPS:
        for row in data[group]:
            for field, target in RELATIONS.items():
                for value in row.get(field, []):
                    if value not in ids[target]:
                        gaps.append(row['id'] + ': dangling ' + field + ' -> ' + value)
            if 'status' in row:
                gaps.append(row['id'] + ': inline status ignored; use authoritative references')
            if group != 'requirements' and not any(v in ids['requirements'] for v in row.get('requirement_ids', [])):
                gaps.extend(unmapped_gaps(reader, group, row))
            if group in ('tasks', 'acceptance') and not row.get('module_ids'):
                gaps.append(row['id'] + ': no module mapping -> ' + str(row.get('ref')))
    if requirement is not None and requirement not in ids['requirements']:
        raise ValueError('unknown requirement: ' + requirement)
    baseline = reader.reference(data.get('baseline_ref'))
    if baseline['problem']:
        gaps.append('baseline: ' + baseline['problem'])
    rows = []
    for req in data['requirements']:
        if requirement is not None and req['id'] != requirement:
            continue
        item = {'id': req['id'], 'source': public_ref(reader.reference(req.get('ref'))),
                'parent_ids': req.get('parent_ids', []),
                'children': [r['id'] for r in data['requirements'] if req['id'] in r.get('parent_ids', [])],
                'requirement_acceptance': 'unknown', 'user_acceptance': 'unknown',
                'modules': [], 'tasks': [], 'acceptance': [], 'gaps': []}
        for group in ('modules', 'tasks', 'acceptance'):
            for row in data[group]:
                if req['id'] not in row.get('requirement_ids', []):
                    continue
                mapped = {'id': row['id'], 'source': public_ref(reader.reference(row.get('ref')))}
                if group == 'tasks':
                    ref = reader.reference(row.get('progress_ref'))
                    mapped.update(module_ids=row.get('module_ids', []), acceptance_ids=row.get('acceptance_ids', []),
                                  progress=recorded_state(ref, row['id'], task=True), progress_source=public_ref(ref))
                elif group == 'acceptance':
                    ref = reader.reference(row.get('result_ref'))
                    mapped.update(module_ids=row.get('module_ids', []), recorded_result=recorded_state(ref, row['id']),
                                  result_source=public_ref(ref), validity='unknown',
                                  evidence=[public_ref(reader.reference(v)) for v in row.get('evidence_refs', [])])
                item[group].append(mapped)
        collect_gaps(item)
        rows.append(item)
    return {'format': 'intent-view-v1', 'observed_at': datetime.now(timezone.utc).isoformat(),
            'root': str(reader.root), 'index': index, 'declared_source_revision': data.get('source_revision'),
            'baseline': public_ref(baseline), 'requirements': rows, 'gaps': gaps,
            'observed_sha256': reader.observed,
            'limits': 'Recorded facts only. Source revision/freshness, user confirmation and acceptance are not verified. No aggregate completion score.'}


def collect_gaps(item):
    for group in ('modules', 'tasks', 'acceptance'):
        if not item[group]:
            item['gaps'].append('no ' + group + ' mapping in index')
        for row in item[group]:
            refs = [row['source']]
            if group == 'tasks':
                refs.append(row['progress_source'])
                if row['progress'] == 'unknown':
                    item['gaps'].append(row['id'] + ': task progress unknown')
                if not row['acceptance_ids']:
                    item['gaps'].append(row['id'] + ': no acceptance mapping')
            if group == 'acceptance':
                refs.extend([row['result_source'], *row['evidence']])
                if not row['evidence']:
                    item['gaps'].append(row['id'] + ': no evidence references')
                if row['recorded_result'] != 'PASS':
                    item['gaps'].append(row['id'] + ': recorded result ' + row['recorded_result'])
            for ref in refs:
                if ref['problem']:
                    item['gaps'].append(row['id'] + ': ' + ref['problem'])
    if item['source']['problem']:
        item['gaps'].append(item['source']['problem'])


def render(report):
    lines = ['需求关联视图 | 声明版本: ' + str(report['declared_source_revision']),
             '观察时间: ' + report['observed_at'],
             '任务进度 ≠ 需求验收；原记录 PASS ≠ 当前有效或用户接受。']
    for row in report['requirements']:
        lines.extend(['', row['id'] + ' | 需求验收=unknown | 用户接受=unknown',
                      '  目的/原文: ' + row['source']['excerpt'],
                      '  定位: ' + str(row['source']['ref'])])
        if row['children']:
            lines.append('  子需求: ' + ', '.join(row['children']))
        for module in row['modules']:
            lines.append('  模块 ' + module['id'] + ': ' + module['source']['excerpt'])
        for task in row['tasks']:
            lines.append('  任务 ' + task['id'] + '=' + task['progress'] + ' | 模块 ' +
                         ', '.join(task['module_ids']) + ' -> ' + ', '.join(task['acceptance_ids']))
        for acceptance in row['acceptance']:
            lines.append('  验收 ' + acceptance['id'] + ' 原记录=' + acceptance['recorded_result'] +
                         ' / 有效性=unknown -> ' + str(acceptance['result_source']['ref']))
            for evidence in acceptance['evidence']:
                lines.append('    证据: ' + str(evidence['ref']) + (' [不可读取]' if evidence['problem'] else ' [可读取，未认证]'))
        for gap in row['gaps']:
            lines.append('  缺口: ' + gap)
    lines.extend('索引缺口: ' + gap for gap in report['gaps'])
    return '\n'.join(lines)


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', required=True, help='explicit project root')
    parser.add_argument('--index', required=True, help='root-relative JSON or Markdown index')
    parser.add_argument('--requirement', help='one requirement ID, without inferring child completion')
    parser.add_argument('--json', action='store_true', help='emit structured report with observed file hashes')
    args = parser.parse_args(argv)
    try:
        report = build_report(args.root, args.index, args.requirement)
    except (OSError, ValueError, UnicodeError) as error:
        result = {'format': 'intent-view-v1', 'error': str(error)}
        print(json.dumps(result, ensure_ascii=False) if args.json else '无法读取关联视图: ' + str(error))
        return 2
    print(json.dumps(report, ensure_ascii=False, indent=2) if args.json else render(report))
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
