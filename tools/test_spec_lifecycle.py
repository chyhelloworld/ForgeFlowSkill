"""Retirement regression tests; original implementation/tests preserved in provenance."""
import contextlib
import io
import json
from pathlib import Path
import tempfile
import unittest
import spec_lifecycle as lifecycle

class LegacyAuditTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.project = Path(self.temp.name)
        (self.project / ".forgeflow").mkdir()
        self.path = self.project / ".forgeflow/spec-state.json"
        self.path.write_bytes((Path(__file__).resolve().parents[1] / "templates/spec-state.example.json").read_bytes())
        self.before = self.path.read_bytes()

    def call(self, *args):
        with contextlib.redirect_stdout(io.StringIO()) as output:
            code = lifecycle.main(list(args))
        return code, json.loads(output.getvalue())

    def test_validate_is_readonly_and_deprecated(self):
        code, result = self.call("validate", str(self.project))
        self.assertEqual(code, 0)
        self.assertTrue(result["deprecated"])
        self.assertEqual(self.before, self.path.read_bytes())

    def test_cli_mutations_refuse_without_any_write(self):
        for action, flag in [("apply", "--acceptance-ref"), ("archive", "--reason")]:
            code, result = self.call(action, str(self.project), "CHG-SEARCH", flag, "fixture")
            self.assertEqual(code, 1)
            self.assertIn("retired", result["errors"][0])
            self.assertEqual(self.before, self.path.read_bytes())
            self.assertEqual([p.name for p in self.path.parent.iterdir()], ["spec-state.json"])

    def test_module_write_entrypoints_refuse(self):
        state = lifecycle.load(self.path)
        for fn, args in [(lifecycle.mutate, (self.project, "apply", "CHG-SEARCH", "fixture")),
                         (lifecycle.transition, (state, "archive", "CHG-SEARCH", "fixture")),
                         (lifecycle.atomic_write, (self.path, state))]:
            with self.assertRaisesRegex(lifecycle.Invalid, "retired"):
                fn(*args)
            self.assertEqual(self.before, self.path.read_bytes())

    def test_invalid_legacy_data_still_fails_audit(self):
        self.path.write_text("{}")
        before = self.path.read_bytes()
        code, result = self.call("validate", str(self.project))
        self.assertEqual(code, 1)
        self.assertFalse(result["passed"])
        self.assertEqual(before, self.path.read_bytes())

if __name__ == "__main__":
    unittest.main()
