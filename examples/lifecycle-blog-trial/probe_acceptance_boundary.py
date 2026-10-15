"""A bounded negative-control probe: opaque reference strings are not authentication."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile

root = Path(__file__).parent
state = json.loads((root / 'search-v2-verified.json').read_text())
tool = root.parent / 'ff-workflow-skills-0.5.0-rc1/tools/spec_lifecycle.py'
with tempfile.TemporaryDirectory(prefix='ff-acceptance-probe-') as temp:
    project = Path(temp)
    (project / '.forgeflow').mkdir()
    (project / '.forgeflow/spec-state.json').write_text(json.dumps(state))
    args = [sys.executable, str(tool), 'apply', str(project), 'CHG-SEARCH', '--acceptance-ref', 'SIMULATED-ACCEPT-SEARCH-V1']
    p = subprocess.run(args, capture_output=True, text=True)
    outcome = {'command': args, 'exit_code': p.returncode, 'stdout': p.stdout, 'stderr': p.stderr,
               'finding': 'An old acceptance reference is accepted when current evidence is valid. The guard does not bind approval references to change versions or authenticate humans. Caller must invalidate and reacquire approval. This isolated probe never modifies the real trial project.'}
    (root / 'acceptance-boundary-probe.json').write_text(json.dumps(outcome, indent=2) + '\n')
    print(json.dumps(outcome, indent=2))
