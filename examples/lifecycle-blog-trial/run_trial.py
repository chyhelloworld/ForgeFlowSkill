"""Actual commands and assertions for one bounded lifecycle trial."""
from pathlib import Path
import copy
import hashlib
import json
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parent
PROJECT = ROOT / 'blog-project'
STATE = PROJECT / '.forgeflow/spec-state.json'
TOOL = Path(os.environ.get('FF_LIFECYCLE_TOOL', str(next(p for p in ROOT.parents if (p / 'tools/spec_lifecycle.py').is_file()) / 'tools/spec_lifecycle.py')))
LOG = ROOT / 'execution.jsonl'


def record(event, **data):
    with LOG.open('a') as stream:
        stream.write(json.dumps({'event': event, **data}, ensure_ascii=False) + '\n')


def run(args, expected=0, cwd=PROJECT):
    p = subprocess.run([str(a) for a in args], cwd=cwd, text=True, capture_output=True)
    record('command', command=[str(a) for a in args], cwd=str(cwd), exit_code=p.returncode,
           stdout=p.stdout, stderr=p.stderr, expected=expected)
    print('$', ' '.join(str(a) for a in args), '\n', p.stdout, p.stderr)
    assert p.returncode == expected, p
    if str(TOOL) in [str(a) for a in args]:
        assert isinstance(json.loads(p.stdout), dict), 'Tool must return structured JSON'
    return p


def read():
    return json.loads(STATE.read_text())


def write(state):
    STATE.write_text(json.dumps(state, indent=2) + '\n')


def snapshot(label):
    (ROOT / (label + '.json')).write_bytes(STATE.read_bytes())
    record('snapshot', label=label, sha256=hashlib.sha256(STATE.read_bytes()).hexdigest(),
           current_version=read()['current']['version'])


def change(text, confirmation, version=1):
    return {'baseline_version': 1, 'version': version, 'status': 'implementing',
            'delta': [{'requirement_id': 'REQ-SEARCH', 'old': None, 'new': {'text': text},
                       'why': 'Readers need to find technical posts and product introductions.',
                       'confirmation_ref': confirmation}],
            'tasks': [{'id': 'TASK-SEARCH', 'requirement_ids': ['REQ-SEARCH'], 'change_version': version}],
            'evidence': []}


def evidence(version, name):
    result = run([sys.executable, '-m', 'unittest', '-v'])
    (ROOT / (name + '.log')).write_text(result.stdout + result.stderr)
    digest = hashlib.sha256((PROJECT / 'blog.py').read_bytes() + (PROJECT / 'test_blog.py').read_bytes()).hexdigest()
    return {'id': name, 'requirement_ids': ['REQ-SEARCH'], 'change_version': version,
            'result': 'pass', 'ref': '../' + name + '.log#sha256-code-' + digest}


def phase_search():
    state = read()
    state['active']['CHG-SEARCH'] = change('Search title and body case-insensitively, including all posts.', 'SIMULATED-SEARCH-V1')
    state['active']['CHG-PARALLEL'] = change('Search published post titles only.', 'SIMULATED-PARALLEL')
    write(state)
    src = (PROJECT / 'blog.py').read_text().replace("    args = parser.parse_args()", "    search = sub.add_parser('search')\n    search.add_argument('query')\n    args = parser.parse_args()")
    src = src.replace("    elif args.command == 'list':", "    elif args.command == 'search':\n        query = args.query.casefold()\n        print(json.dumps([p for p in posts if query in (p['title'] + ' ' + p['body']).casefold()], ensure_ascii=False))\n    elif args.command == 'list':")
    (PROJECT / 'blog.py').write_text(src)
    tests = (PROJECT / 'test_blog.py').read_text().replace("\n\nif __name__", "\n    def test_search_title_and_body_includes_drafts(self):\n        self.cli('create', 'Python', 'Needle in body')\n        self.assertEqual(len(self.cli('search', 'NEEDLE')), 1)\n        self.assertEqual(len(self.cli('search', 'python')), 1)\n\n\nif __name__")
    (PROJECT / 'test_blog.py').write_text(tests)
    state['active']['CHG-SEARCH']['evidence'] = [evidence(1, 'search-v1-tests')]
    state['active']['CHG-SEARCH']['status'] = 'verified'
    state['active']['CHG-SEARCH']['acceptance_ref'] = 'SIMULATED-ACCEPT-SEARCH-V1'
    state['active']['CHG-SEARCH']['acceptance'] = {'ref': 'SIMULATED-ACCEPT-SEARCH-V1', 'change_id': 'CHG-SEARCH', 'change_version': 1, 'baseline_version': 1, 'evidence_version': 1}
    write(state)
    snapshot('search-v1-verified')
    run(['git', 'add', 'blog.py', 'test_blog.py', '.forgeflow/spec-state.json'])
    run(['git', 'commit', '-m', 'Implement initial search against simulated confirmed requirement'])


def phase_interrupt():
    state = read()
    c = state['active']['CHG-SEARCH']
    c['history'] = [{'version': 1, 'reason': 'Confirmed privacy interruption invalidated old evidence and acceptance.', 'evidence': copy.deepcopy(c['evidence']), 'acceptance': copy.deepcopy(c.get('acceptance'))}]
    record('simulated_requirement_proposal', ref='SIMULATED-INTERRUPT-PROPOSAL', current_spec_unchanged=True)
    record('simulated_requirement_confirmation', ref='SIMULATED-INTERRUPT-CONFIRMED', authorization='SIMULATED fixture only')
    c['version'] = 2
    c['delta'][0]['new']['text'] = 'Search title and body case-insensitively; default to published posts, opt in to drafts with --include-drafts.'
    c['delta'][0]['confirmation_ref'] = 'SIMULATED-INTERRUPT-CONFIRMED'
    c['delta'][0]['why'] = 'An interrupting privacy requirement must prevent drafts appearing in ordinary search.'
    c['tasks'][0]['change_version'] = 2
    # Deliberately retain stale evidence and acceptance to test rejection.
    write(state)
    snapshot('interrupted-stale-evidence')
    before = STATE.read_bytes()
    run([sys.executable, TOOL, 'validate', PROJECT], expected=1)
    run([sys.executable, TOOL, 'apply', PROJECT, 'CHG-SEARCH', '--acceptance-ref', 'SIMULATED-ACCEPT-SEARCH-V1'], expected=1)
    assert STATE.read_bytes() == before, 'Failed apply partially changed state'
    record('stale_evidence_rejected_without_write', outcome='pass')
    c['status'] = 'implementing'
    c.pop('acceptance_ref', None)
    write(state)
    src = (PROJECT / 'blog.py').read_text().replace("    search.add_argument('query')", "    search.add_argument('query')\n    search.add_argument('--include-drafts', action='store_true')")
    src = src.replace("if query in (p['title'] + ' ' + p['body']).casefold()", "if (p['published'] or args.include_drafts) and query in (p['title'] + ' ' + p['body']).casefold()")
    (PROJECT / 'blog.py').write_text(src)
    tests = (PROJECT / 'test_blog.py').read_text()
    start = tests.index('    def test_search_title_and_body_includes_drafts')
    end = tests.index("\n\nif __name__", start)
    tests = tests[:start] + '''    def test_search_defaults_to_published_and_explicit_drafts(self):
        post = self.cli('create', 'Python', 'Needle in body')
        self.assertEqual(self.cli('search', 'NEEDLE'), [])
        self.assertEqual(len(self.cli('search', 'NEEDLE', '--include-drafts')), 1)
        self.cli('publish', str(post['id']))
        self.assertEqual(len(self.cli('search', 'NEEDLE')), 1)
        self.assertEqual(len(self.cli('search', 'python')), 1)
        self.assertEqual(self.cli('search', 'missing'), [])
''' + tests[end:]
    (PROJECT / 'test_blog.py').write_text(tests)
    c['evidence'] = [evidence(2, 'search-v2-tests')]
    c['status'] = 'verified'
    write(state)
    snapshot('search-v2-verified')
    # Fresh behavioral evidence alone cannot rescue a stale acceptance receipt.
    unchanged = STATE.read_bytes()
    run([sys.executable, TOOL, 'apply', PROJECT, 'CHG-SEARCH', '--acceptance-ref', 'SIMULATED-ACCEPT-SEARCH-V1'], expected=1)
    assert STATE.read_bytes() == unchanged
    record('stale_acceptance_with_fresh_evidence_rejected_without_write', outcome='pass')
    c['acceptance'] = {'ref': 'SIMULATED-ACCEPT-SEARCH-V2', 'change_id': 'CHG-SEARCH', 'change_version': 2, 'baseline_version': 1, 'evidence_version': 2}
    write(state)
    snapshot('search-v2-fresh-acceptance')
    run([sys.executable, TOOL, 'validate', PROJECT])
    run([sys.executable, TOOL, 'apply', PROJECT, 'CHG-SEARCH', '--acceptance-ref', 'SIMULATED-ACCEPT-SEARCH-V2'])
    assert read()['current']['version'] == 2
    snapshot('promoted-v2')
    assert read()['current']['requirements']['REQ-PUBLISH'] == json.loads((ROOT / 'baseline-state.json').read_text())['current']['requirements']['REQ-PUBLISH']
    unchanged = STATE.read_bytes()
    run([sys.executable, TOOL, 'apply', PROJECT, 'CHG-SEARCH', '--acceptance-ref', 'SIMULATED-ACCEPT-SEARCH-V2'], expected=1)
    assert STATE.read_bytes() == unchanged
    record('repeat_apply_rejected_without_write', outcome='pass')
    before = STATE.read_bytes()
    run([sys.executable, TOOL, 'apply', PROJECT, 'CHG-PARALLEL', '--acceptance-ref', 'SIMULATED-PARALLEL'], expected=1)
    assert STATE.read_bytes() == before
    record('stale_parallel_rejected_without_write', outcome='pass')
    state = read()
    state['active']['CHG-PARALLEL']['status'] = 'rejected'
    write(state)
    current = copy.deepcopy(state['current'])
    run([sys.executable, TOOL, 'archive', PROJECT, 'CHG-PARALLEL', '--reason', 'Competing title-only search was superseded; old baseline cannot be promoted.'])
    assert read()['current'] == current
    run([sys.executable, TOOL, 'archive', PROJECT, 'CHG-SEARCH', '--reason', 'Promoted after privacy interruption, refreshed tests, and SIMULATED acceptance fixture; preserve rationale.'])
    assert read()['current'] == current
    state = read()
    c = change('Allow deleting published posts.', 'SIMULATED-CANCEL')
    c['baseline_version'] = 2
    c['status'] = 'canceled'
    c['delta'][0]['requirement_id'] = 'REQ-DELETE'
    c['tasks'][0]['requirement_ids'] = ['REQ-DELETE']
    c['tasks'][0]['id'] = 'TASK-DELETE'
    c['delta'][0]['why'] = 'Deletion was considered but canceled to preserve the narrow publishing scope.'
    state['active']['CHG-CANCEL'] = c
    write(state)
    run([sys.executable, TOOL, 'archive', PROJECT, 'CHG-CANCEL', '--reason', 'Canceled to keep this personal publishing project narrow.'])
    assert read()['current'] == current
    record('accepted_rejected_canceled_archive_preserves_current', outcome='pass', current_version=2)
    snapshot('archived-v2')
    unchanged = STATE.read_bytes()
    run([sys.executable, TOOL, 'archive', PROJECT, 'CHG-SEARCH', '--reason', 'Repeat archive attempt'], expected=1)
    assert STATE.read_bytes() == unchanged
    record('repeat_archive_rejected_without_write', outcome='pass')
    run(['git', 'add', 'blog.py', 'test_blog.py', '.forgeflow/spec-state.json'])
    run(['git', 'commit', '-m', 'Promote revised search with simulated acceptance and archived rationale'])


if __name__ == '__main__':
    if sys.argv[1] == 'search':
        phase_search()
    elif sys.argv[1] == 'interrupt':
        phase_interrupt()
