"""Actual stdlib unit/CLI tests; acceptance references are synthetic fixtures, not real approval."""
import contextlib
import copy
import io
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import spec_lifecycle as lifecycle


class LifecycleTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.project = Path(self.temp.name)
        (self.project / ".forgeflow").mkdir()
        self.path = self.project / ".forgeflow/spec-state.json"
        example = Path(__file__).resolve().parents[1] / "templates/spec-state.example.json"
        self.state = json.loads(example.read_text())
        self.change = self.state["active"]["CHG-SEARCH"]
        self.save()

    def save(self):
        self.path.write_text(json.dumps(self.state))

    def verify(self):
        self.change["status"] = "verified"
        self.change["acceptance"] = {"ref": "fixture", "change_id": "CHG-SEARCH", "change_version": 1, "baseline_version": 1, "evidence_version": 1}
        self.change["evidence"] = [{"id": "TEST-SEARCH", "requirement_ids": ["REQ-SEARCH"],
                                    "change_version": 1, "result": "pass", "ref": "fixture test run"}]
        self.save()

    def run_cli(self, *args):
        with contextlib.redirect_stdout(io.StringIO()) as output:
            code = lifecycle.main(list(args))
        return code, json.loads(output.getvalue())

    def test_readonly_validate(self):
        before = self.path.read_bytes()
        code, result = self.run_cli("validate", str(self.project))
        self.assertEqual(code, 0)
        self.assertTrue(result["passed"])
        self.assertEqual(before, self.path.read_bytes())

    def test_apply_then_archive(self):
        self.verify()
        code, _ = self.run_cli("apply", str(self.project), "CHG-SEARCH", "--acceptance-ref", "fixture")
        self.assertEqual(code, 0)
        applied = lifecycle.load(self.path)
        self.assertEqual(applied["current"]["version"], 2)
        self.assertEqual(applied["active"]["CHG-SEARCH"]["status"], "accepted")
        self.assertEqual(lifecycle.validate(applied), [])
        code, _ = self.run_cli("archive", str(self.project), "CHG-SEARCH", "--reason", "completed fixture")
        self.assertEqual(code, 0)
        archived = lifecycle.load(self.path)
        self.assertEqual(archived["current"], applied["current"])
        self.assertEqual(lifecycle.validate(archived), [])
        self.assertEqual(archived["archived"]["CHG-SEARCH"]["status"], "accepted")

    def test_reject_apply_without_verification(self):
        before = self.path.read_bytes()
        code, _ = self.run_cli("apply", str(self.project), "CHG-SEARCH", "--acceptance-ref", "fixture")
        self.assertEqual(code, 1)
        self.assertEqual(before, self.path.read_bytes())

    def test_terminal_archive_never_promotes(self):
        for status in ("canceled", "rejected"):
            self.change["status"] = status
            self.save()
            result = lifecycle.mutate(self.project, "archive", "CHG-SEARCH", "fixture terminal reason")
            self.assertEqual(result["current"], self.state["current"])
            self.assertEqual(result["archived"]["CHG-SEARCH"]["status"], status)

    def test_open_change_cannot_archive(self):
        before = self.path.read_bytes()
        with self.assertRaises(lifecycle.Invalid):
            lifecycle.mutate(self.project, "archive", "CHG-SEARCH", "fixture")
        self.assertEqual(before, self.path.read_bytes())

    def test_stale_baseline_atomic_rejection(self):
        self.verify()
        self.state["current"]["version"] = 2
        self.save()
        before = self.path.read_bytes()
        with self.assertRaisesRegex(lifecycle.Invalid, "stale baseline"):
            lifecycle.mutate(self.project, "apply", "CHG-SEARCH", "fixture")
        self.assertEqual(before, self.path.read_bytes())

    def test_conflicting_old_atomic_rejection(self):
        self.verify()
        self.change["delta"][0]["old"]["text"] = "wrong"
        self.save()
        before = self.path.read_bytes()
        with self.assertRaisesRegex(lifecycle.Invalid, "old value conflicts"):
            lifecycle.mutate(self.project, "apply", "CHG-SEARCH", "fixture")
        self.assertEqual(before, self.path.read_bytes())

    def test_delta_edit_invalidates_versions(self):
        self.verify()
        self.change["version"] = 2
        self.assertTrue(lifecycle.validate(self.state))
        self.change["tasks"][0]["change_version"] = 2
        self.assertIn("stale evidence", lifecycle.validate(self.state)[0])

    def test_missing_requirement_coverage(self):
        self.verify()
        self.change["evidence"] = []
        self.assertIn("coverage", lifecycle.validate(self.state)[0])
        self.change["tasks"] = []
        self.assertIn("tasks", lifecycle.validate(self.state)[0])

    def test_failed_evidence_blocks_verified(self):
        self.verify()
        self.change["evidence"][0]["result"] = "fail"
        self.assertIn("failed evidence", lifecycle.validate(self.state)[0])

    def test_add_delete_requirements(self):
        self.verify()
        self.change["delta"][0]["new"] = None
        result = lifecycle.transition(self.state, "apply", "CHG-SEARCH", "fixture")
        self.assertEqual(result["current"]["requirements"], {})
        self.change["delta"][0].update(requirement_id="REQ-NEW", old=None, new={"text": "New behavior"})
        for field in ("tasks", "evidence"):
            self.change[field][0]["requirement_ids"] = ["REQ-NEW"]
        result = lifecycle.transition(self.state, "apply", "CHG-SEARCH", "fixture")
        self.assertIn("REQ-NEW", result["current"]["requirements"])

    def test_missing_or_stale_acceptance_rejected(self):
        self.verify()
        for field, value in (("change_version", 2), ("evidence_version", True), ("baseline_version", 2), ("change_id", "CHG-WRONG"), ("ref", "old reference")):
            receipt = copy.deepcopy(self.change["acceptance"])
            self.change["acceptance"][field] = value
            self.save()
            before = self.path.read_bytes()
            with self.assertRaises(lifecycle.Invalid):
                lifecycle.mutate(self.project, "apply", "CHG-SEARCH", "fixture")
            self.assertEqual(before, self.path.read_bytes())
            self.change["acceptance"] = receipt
        del self.change["acceptance"]
        with self.assertRaisesRegex(lifecycle.Invalid, "receipt"):
            lifecycle.transition(self.state, "apply", "CHG-SEARCH", "fixture")

    def test_duplicate_json_keys(self):
        self.path.write_text('{"schema_version":1,"schema_version":1}')
        with self.assertRaisesRegex(lifecycle.Invalid, "duplicate JSON"):
            lifecycle.load(self.path)

    def test_bool_is_not_version(self):
        self.state["schema_version"] = True
        self.save()
        with self.assertRaises(lifecycle.Invalid):
            lifecycle.load(self.path)
        self.verify()
        self.change["evidence"][0]["change_version"] = True
        self.assertIn("version", lifecycle.validate(self.state)[0])

    def test_symlinks_blocked(self):
        linked = self.project / "alias"
        linked.symlink_to(self.project, target_is_directory=True)
        with self.assertRaises(lifecycle.Invalid):
            lifecycle.state_path(linked)
        outside = self.project / "state.json"
        self.path.rename(outside)
        self.path.symlink_to(outside)
        with self.assertRaises(lifecycle.Invalid):
            lifecycle.state_path(self.project)

    def test_lock_collision(self):
        self.verify()
        lock = self.path.parent / ".spec.lock"
        lock.write_text("existing writer")
        before = self.path.read_bytes()
        with self.assertRaises(FileExistsError):
            lifecycle.mutate(self.project, "apply", "CHG-SEARCH", "fixture")
        self.assertEqual(before, self.path.read_bytes())
        self.assertTrue(lock.exists())

    def test_write_failure_keeps_original_and_cleans_temporary(self):
        self.verify()
        before = self.path.read_bytes()
        for operation in ("fsync", "replace"):
            with patch.object(lifecycle.os, operation, side_effect=OSError("fixture disk failure")):
                with self.assertRaises(OSError):
                    lifecycle.mutate(self.project, "apply", "CHG-SEARCH", "fixture")
            self.assertEqual(before, self.path.read_bytes())
            self.assertEqual(list(self.path.parent.iterdir()), [self.path])

    def test_two_active_changes_invalidate_remaining_baseline(self):
        self.verify()
        self.state["active"]["CHG-OTHER"] = copy.deepcopy(self.change)
        applied = lifecycle.transition(self.state, "apply", "CHG-SEARCH", "fixture")
        self.assertIn("stale baseline", lifecycle.validate(applied)[0])
        with self.assertRaises(lifecycle.Invalid):
            lifecycle.transition(applied, "apply", "CHG-OTHER", "fixture")

    def test_corrupt_state_cli_returns_failure(self):
        self.path.write_text("not json")
        code, result = self.run_cli("validate", str(self.project))
        self.assertEqual(code, 1)
        self.assertFalse(result["passed"])

    def test_unknown_mutation_and_missing_change(self):
        with self.assertRaises(lifecycle.Invalid):
            lifecycle.transition(self.state, "unknown", "CHG-SEARCH", "fixture")
        with self.assertRaises(lifecycle.Invalid):
            lifecycle.transition(self.state, "apply", "MISSING", "fixture")

    def test_bad_links_and_missing_confirmation(self):
        self.change["tasks"][0]["requirement_ids"] = ["REQ-OTHER"]
        self.assertIn("unaffected", lifecycle.validate(self.state)[0])
        self.change["delta"][0]["confirmation_ref"] = ""
        self.assertIn("confirmation", lifecycle.validate(self.state)[0])

    def test_invalid_archive_and_acceptance_records(self):
        self.state["archived"]["CHG-SEARCH"] = self.state["active"].pop("CHG-SEARCH")
        self.assertIn("terminal", lifecycle.validate(self.state)[0])
        self.verify()
        self.change["status"] = "accepted"
        self.change["archive_reason"] = "fixture"
        self.assertIn("acceptance", lifecycle.validate(self.state)[0])


if __name__ == "__main__":
    unittest.main()
