#!/usr/bin/env python3
"""Structural specification lifecycle guard; never authenticates acceptance or tests behavior."""
import argparse
import copy
import json
import os
from pathlib import Path
import re
import tempfile


class Invalid(ValueError):
    pass


def require(condition, message):
    if not condition:
        raise Invalid(message)


def nonempty(value):
    return isinstance(value, str) and bool(value.strip())


def integer(value):
    return type(value) is int and value >= 1


def identifier(value):
    return isinstance(value, str) and bool(re.fullmatch(r"[A-Za-z][A-Za-z0-9_-]{0,79}", value))


def requirement(value):
    return isinstance(value, dict) and nonempty(value.get("text"))


def unique_object(pairs):
    result = {}
    for key, value in pairs:
        require(key not in result, "duplicate JSON key: " + key)
        result[key] = value
    return result


def state_path(project):
    root = Path(project).absolute()
    require(not any(part.is_symlink() for part in (root, *root.parents)), "symlink project path is not allowed")
    require(root.is_dir() and not root.is_symlink(), "project must be an existing non-symlink directory")
    directory = root / ".forgeflow"
    path = directory / "spec-state.json"
    require(directory.is_dir() and not directory.is_symlink(), "missing or symlink .forgeflow directory")
    require(path.is_file() and not path.is_symlink(), "missing or symlink spec-state.json")
    return path


def load(path):
    state = json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object)
    require(isinstance(state, dict) and type(state.get("schema_version")) is int and state.get("schema_version") == 1, "unsupported state schema")
    current = state.get("current")
    require(isinstance(current, dict) and integer(current.get("version")), "invalid current version")
    reqs = current.get("requirements")
    require(isinstance(reqs, dict), "requirements must be an object")
    for key, value in reqs.items():
        require(identifier(key) and requirement(value), "invalid current requirement")
    for section in ("active", "archived"):
        require(isinstance(state.get(section), dict), "missing " + section)
        require(all(identifier(key) for key in state[section]), "invalid change ID")
    require(not (state["active"].keys() & state["archived"].keys()), "change ID reused across active/archive")
    return state


def check_delta(change, current, compare):
    delta = change.get("delta")
    require(isinstance(delta, list) and delta, "delta must be nonempty")
    affected = set()
    for item in delta:
        require(isinstance(item, dict), "invalid delta entry")
        key = item.get("requirement_id")
        require(identifier(key) and key not in affected, "invalid or duplicate requirement ID")
        require("old" in item and "new" in item, "old/new must be explicit, including null")
        old, new = item["old"], item["new"]
        require(old is None or requirement(old), "invalid old requirement")
        require(new is None or requirement(new), "invalid new requirement")
        require(old != new, "empty delta")
        require(nonempty(item.get("why")), "missing change reason")
        require(nonempty(item.get("confirmation_ref")), "missing confirmation reference")
        if compare:
            require(current["requirements"].get(key) == old, "old value conflicts: " + key)
        affected.add(key)
    return affected


def check_links(change, affected, field, verified):
    entries = change.get(field)
    require(isinstance(entries, list), "missing " + field)
    seen, covered = set(), set()
    for entry in entries:
        require(isinstance(entry, dict), "invalid " + field + " entry")
        key = entry.get("id")
        require(identifier(key) and key not in seen, "invalid or duplicate " + field + " ID")
        seen.add(key)
        links = entry.get("requirement_ids")
        require(isinstance(links, list) and links and all(identifier(x) for x in links), "invalid requirement links")
        require(len(links) == len(set(links)) and set(links) <= affected, "unaffected or duplicate requirement link")
        require(integer(entry.get("change_version")) and entry.get("change_version") == change["version"], "stale " + field + " version")
        if field == "evidence":
            require(entry.get("result") in ("pass", "fail"), "invalid evidence result")
            require(nonempty(entry.get("ref")), "missing evidence reference")
            if verified:
                require(entry["result"] == "pass", "failed evidence cannot verify")
        covered.update(links)
    if field == "tasks" or verified:
        require(covered == affected, "missing affected requirement coverage in " + field)


def check_change(change, current, archived=False):
    require(isinstance(change, dict), "invalid change object")
    require(integer(change.get("version")) and integer(change.get("baseline_version")), "invalid change/baseline version")
    status = change.get("status")
    require(status in ("proposed", "implementing", "verified", "accepted", "canceled", "rejected"), "invalid change status")
    compare = status in ("proposed", "implementing", "verified")
    if compare:
        require(change["baseline_version"] == current["version"], "stale baseline version")
    if archived:
        require(status in ("accepted", "canceled", "rejected"), "archive is not a terminal decision")
        require(nonempty(change.get("archive_reason")), "missing archive reason")
    affected = check_delta(change, current, compare)
    verified = status in ("verified", "accepted")
    check_links(change, affected, "tasks", verified)
    check_links(change, affected, "evidence", verified)
    if status == "accepted":
        require(nonempty(change.get("acceptance_ref")), "missing acceptance reference")
        applied = change.get("applied_version")
        require(integer(applied) and applied == change["baseline_version"] + 1 and applied <= current["version"], "invalid accepted baseline version")
    return affected


def validate(state):
    errors = []
    for section in ("active", "archived"):
        for key, change in state[section].items():
            try:
                check_change(change, state["current"], section == "archived")
                if change["status"] == "accepted":
                    check_acceptance(change, key, change["acceptance_ref"])
            except Invalid as exc:
                errors.append(section + "/" + key + ": " + str(exc))
    return errors


def check_acceptance(change, change_id, reference):
    receipt = change.get("acceptance")
    require(isinstance(receipt, dict), "missing version-bound acceptance receipt")
    require(nonempty(receipt.get("ref")) and receipt["ref"] == reference, "acceptance reference mismatch")
    require(receipt.get("change_id") == change_id, "acceptance change ID mismatch")
    for field in ("change_version", "evidence_version"):
        require(integer(receipt.get(field)) and receipt[field] == change["version"], "stale acceptance " + field)
    require(integer(receipt.get("baseline_version")) and receipt["baseline_version"] == change["baseline_version"], "stale acceptance baseline version")


def transition(state, action, change_id, reference):
    require(change_id in state["active"], "active change not found")
    result = copy.deepcopy(state)
    change = result["active"][change_id]
    check_change(change, result["current"])
    require(nonempty(reference), "explicit reference/reason is required")
    if action == "apply":
        require(change["status"] == "verified", "only verified changes may be accepted/applied")
        check_acceptance(change, change_id, reference)
        for item in change["delta"]:
            key = item["requirement_id"]
            if item["new"] is None:
                result["current"]["requirements"].pop(key)
            else:
                result["current"]["requirements"][key] = item["new"]
        result["current"]["version"] += 1
        change.update(status="accepted", acceptance_ref=reference, applied_version=result["current"]["version"])
    elif action == "archive":
        require(change["status"] in ("accepted", "canceled", "rejected"), "cannot archive an unresolved change")
        if change["status"] == "accepted":
            check_acceptance(change, change_id, change["acceptance_ref"])
        change["archive_reason"] = reference
        result["archived"][change_id] = result["active"].pop(change_id)
    else:
        raise Invalid("unknown mutation")
    return result


def atomic_write(path, state):
    name = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", dir=path.parent, prefix=".spec-", delete=False) as stream:
            name = stream.name
            json.dump(state, stream, ensure_ascii=False, indent=2)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if name and os.path.exists(name):
            os.unlink(name)


def mutate(project, action, change_id, reference):
    path = state_path(project)
    lock = path.parent / ".spec.lock"
    descriptor = os.open(lock, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    try:
        os.close(descriptor)
        state = load(state_path(project))
        result = transition(state, action, change_id, reference)
        atomic_write(path, result)
        return result
    finally:
        lock.unlink()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="action", required=True)
    for action in ("validate", "apply", "archive"):
        command = commands.add_parser(action)
        command.add_argument("project")
        if action != "validate":
            command.add_argument("change_id")
            command.add_argument("--acceptance-ref" if action == "apply" else "--reason", required=True)
    args = parser.parse_args(argv)
    try:
        if args.action == "validate":
            errors = validate(load(state_path(args.project)))
        else:
            reference = args.acceptance_ref if args.action == "apply" else args.reason
            mutate(args.project, args.action, args.change_id, reference)
            errors = []
    except (Invalid, OSError, ValueError, TypeError) as exc:
        errors = [str(exc)]
    print(json.dumps({"passed": not errors, "action": args.action, "errors": errors,
                      "limits": "Structural guard only; references are not authenticated approval or behavioral proof."}, ensure_ascii=False))
    return 1 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())
