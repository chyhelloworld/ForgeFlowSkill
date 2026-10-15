from pathlib import Path
import json
root = Path(__file__).parent
project = root / 'blog-project'
base = {'REQ-PUBLISH': {'text': 'Create persistent technical or product posts as drafts, publish explicitly, list only published posts.'}}
state = {'schema_version': 1, 'current': {'version': 1, 'requirements': base}, 'active': {}, 'archived': {}}
(project / '.forgeflow/spec-state.json').write_text(json.dumps(state, indent=2) + '\n')
(root / 'baseline-state.json').write_text(json.dumps(state, indent=2) + '\n')
(root / 'SIMULATED_APPROVALS.md').write_text('''# SIMULATED product approvals\n\nThese are test fixtures, not real user product acceptance or authority.\n\n- SIMULATED-BASELINE: accept v1 local draft/publish/list behavior.\n- SIMULATED-SEARCH-V1: confirm adding search by case-insensitive title/body match.\n- SIMULATED-ACCEPT-SEARCH-V1: accept first search implementation, invalid after change version increments.\n- SIMULATED-INTERRUPT-PROPOSAL: ask that drafts stay private in default search; proposal alone is not confirmation.\n- SIMULATED-INTERRUPT-CONFIRMED: explicitly confirm adding default published-only search and opt-in --include-drafts.\n- SIMULATED-ACCEPT-SEARCH-V2: accept revised tested search behavior.\n- SIMULATED-PARALLEL: confirm independently proposed competing search behavior against baseline v1.\n- SIMULATED-CANCEL: cancel a proposed post-delete addition.\n- SIMULATED-REJECT: reject a proposed export addition.\n''')
