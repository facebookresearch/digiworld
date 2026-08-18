# Decoupling Asset Push from Per-Variation Reset

**Problem:** `set_environment()` is called on every scenario reset. It unconditionally pushes
mockdata JSON files, the entire `assets/` image folder, and `theme.json` to the emulator —
even when those files haven't changed. For a single app, this costs 15 s–5 min per reset
depending on asset count. Across dozens of variations it adds up to most of the wall-clock time.

**Goal:** Push the `assets/` image folder only when the active profile on device changes.
Mockdata JSON files must always be pushed — they are cheap and their content determines
which asset files the app will reference, so JSON and assets must always be in sync.

## Critical Constraint: JSON records reference assets by filename

Each profile's `mock-products.json` (or equivalent) contains image references that point
to files in that same profile's `assets/` folder. This means:

- **You cannot skip the JSON push.** JSONs must be pushed on every `set_environment` call
  to ensure the app always reads the correct data for the active profile.
- **You can skip the `assets/` push** — but only when the same profile's assets are already
  confirmed on device. Skipping assets for a different profile would leave the device with
  stale images that don't match the newly pushed JSON records.
- **The guard key is `data_id` (the profile name).** Assets are tied to a specific profile.
  If `data_id` matches what was last pushed, the assets on device are guaranteed to be in
  sync with the JSONs about to be pushed.

---

## What `set_environment` currently does (in order)

```
1. mkdir -p mockdata on device
2. Push mockdata JSON files (mock-products.json, mock-carts.json, …)   ← always push, cheap
3. Push assets/ folder in parallel (N image files)                      ← EXPENSIVE, skip if same profile
4. Push theme.json (override or profile default)                        ← variation-scoped
5. rollback_state("default", rootstore_override)
     └─ restore_app_data → push id.db + rootstore.json                  ← variation-scoped
     └─ dispatch deeplink "set"                                          ← variation-scoped
```

Step 3 is the bottleneck and is **safe to skip when the same profile is used across variations**.
Steps 1–2 must always run to keep JSON records and assets in sync.
Steps 4–5 are variation-scoped and cannot be skipped.

---

## Implementation — What Was Built

Three files were changed. `set_environment`'s public signature is unchanged.
All existing callers continue to work without modification.

### `digiworld/adb/actions.py`

**`__init__`** — one new field:
```python
# Tracks which profile's assets/ folder is currently on device.
# JSONs are always re-pushed (cheap, ensures JSON-asset sync).
# The assets/ folder push is skipped when this matches data_id,
# because assets are referenced by the JSON records and are only
# correct for the profile they were pushed with.
self._active_asset_profile: Optional[str] = None
```

**Three new private methods** added between `_push_assets_parallel` and `set_environment`:

| Method | Purpose |
|---|---|
| `_read_asset_profile_marker()` | Reads `{device_base_path}/.asset_profile_marker` from device. Returns the `data_id` string, or `None`. |
| `_write_asset_profile_marker(data_id)` | Writes `data_id` to that file after a successful push. |
| `_resolve_active_asset_profile(data_id)` | Returns `True` if assets can be skipped. Checks in-memory state first (fast path), falls back to reading the device marker when in-memory state is `None` (new instance / process restart). |

**`set_environment` and `load_data`** — the `_push_assets_parallel` call in both is now guarded:
```python
if self._resolve_active_asset_profile(data_id):
    logger.info("Assets for profile [%s] already on device — skipping push", data_id)
else:
    self._push_assets_parallel(assets_path, mockdata_path)
    self._active_asset_profile = data_id
    self._write_asset_profile_marker(data_id)
```

**`_check_env_set` message** updated to reference `set_environment()` or `push_app_assets()`.

### `digiworld/scenarios/scenario_base.py`

`reset_initial_state` now reuses `self.adb` when available instead of creating a new
`ADBActions` instance on every call. This is what makes the in-memory fast path effective:

```python
# Reuse existing ADBActions instance when available so that
# _active_asset_profile is preserved across calls.
existing_adb = getattr(self, 'adb', None)
if existing_adb is not None and existing_adb.bundle_id == bundle_id:
    adb = existing_adb
else:
    adb = ADBActions(bundle_id=bundle_id, custom_path=self.base_path, backend=self.backend)
```

### How the two mechanisms work together

```
┌─────────────────────────────────────────────────────────────────┐
│  Scenario loop (same Scenario object, multiple reset calls)      │
│                                                                   │
│  Call 1: reset_initial_state(theme="midnight")                   │
│    └─ reuse self.adb (same instance)                             │
│    └─ set_environment(data_id="full_cart", ...)                  │
│         _active_asset_profile = None                             │
│         _read_asset_profile_marker() → None (first run)          │
│         → push assets/  ✓                                        │
│         _active_asset_profile = "full_cart"                      │
│         _write_asset_profile_marker("full_cart") → device        │
│                                                                   │
│  Call 2: reset_initial_state(theme="ocean-blue")                 │
│    └─ reuse self.adb (same instance)  ← fast path               │
│    └─ set_environment(data_id="full_cart", ...)                  │
│         _active_asset_profile = "full_cart" ← in-memory hit      │
│         → SKIP assets/ push  ✓                                   │
│                                                                   │
│  Process restart, new Scenario object, Call 3:                   │
│    └─ new ADBActions instance — _active_asset_profile = None     │
│    └─ set_environment(data_id="full_cart", ...)                  │
│         _active_asset_profile = None → read device marker        │
│         _read_asset_profile_marker() → "full_cart"               │
│         → SKIP assets/ push  ✓  (device marker durability)       │
└─────────────────────────────────────────────────────────────────┘
```

### What you gain

Per-variation time for same-profile runs drops from:
`JSON push (~1s) + asset push (15s–5min) + theme + session restore`
to:
`JSON push (~1s) + theme + session restore`

For ecommerce with ~1K product images: **~15–20 s saved per variation**.
Across 50 same-profile variations in a run: **~12–15 min saved**.

### Edge cases

| Scenario | Behaviour |
|---|---|
| Profile switch mid-run (A → B) | Marker mismatch → assets re-pushed for B. Correct. |
| Profile switch back (B → A) | Marker says B → re-push A assets. Correct. |
| Someone manually deletes `mockdata/assets/` from device | Marker still says old profile → push skipped → broken images on device. **Force re-push:** `adb._active_asset_profile = None; adb.backend.execute_command("rm -f {device_base_path}/.asset_profile_marker", is_shell=True)` |
| Emulator wipe / snapshot restore | Marker file gone → push runs normally on next call. |

---

## Approach B — Clean (full decoupling, next step after A stabilises)

**"Refactor set_environment into two explicit methods. Zero behavioral change for all callers."**

### What changes

#### `digiworld/adb/actions.py`

- Extract `push_profile_assets(data_id, mockdata_path)` — steps 1–3 from `set_environment`
  (same as `push_app_assets` above but also moves the theme push when no override is given)
- Extract `reset_to_state(data_id, theme_override, rootstore_override, session_id, wait_for_ready)`
  — steps 4–5 only, the theme override push + `rollback_state` path
- `set_environment` becomes a 2-line wrapper:
  ```python
  def set_environment(self, data_id, ...):
      self.push_profile_assets(data_id, mockdata_path)
      return self.reset_to_state(data_id, theme_override, rootstore_override, session_id, wait_for_ready)
  ```
- Add `_pushed_profiles: set[str]` on `__init__`; `push_profile_assets` skips the push if
  `data_id` is already in the set and adds it after a successful push
- Same refactor applied to `load_data` (currently a near-duplicate of `set_environment`)

#### `digiworld/scenarios/scenario_base.py`

- Add `initialize_app(data_id: str)` method — creates `ADBActions` and calls
  `push_profile_assets`. Callers invoke once at emulator boot.
- `reset_initial_state` calls `adb.reset_to_state(...)` instead of `adb.set_environment(...)`.
  The `_pushed_profiles` guard inside `push_profile_assets` means a direct `set_environment`
  call from a legacy script still works but skips the re-push automatically.

#### `digiworld/utils/setup_emulator.py`

- `setup_app_environment` splits its single `adb.set_environment(...)` call into
  `adb.push_profile_assets(...)` in the boot phase and `adb.reset_to_state(...)` per iteration.
- Add `--skip-asset-push` CLI flag for snapshot-restored emulators.

### Estimated effort
| Work item | Time |
|---|---|
| Refactor `actions.py` (extract + wrapper + guard) | 2–3 hrs |
| Refactor `load_data` | 1 hr |
| Update `scenario_base.py` | 1 hr |
| Update `setup_emulator.py` | 1 hr |
| Full regression on 3 apps | 2 hrs |
| **Total** | **~1.5 days** |

---

## Comparison

| | Approach A (Implemented ✓) | Approach B (Next step) |
|---|---|---|
| Files changed | 1 (`actions.py`) | 4 |
| `set_environment` signature changed | No | No (wrapper) |
| Backward compatible | Yes | Yes |
| JSONs always pushed (correctness) | Yes | Yes |
| Asset push guard | `_active_asset_profile` in-memory | Same + `_pushed_profiles` set |
| `load_data` fixed | Yes (same guard applied) | Yes (refactored) |
| JSON push also skippable | No — intentional | Yes, separately controllable |
| Effort | ~2 hrs (done) | ~1.5 days |
| Risk | Low | Low–Medium |

**Status:** Approach A is shipped. Approach B is the architectural cleanup to do when
the team has confirmed correct behavior across apps.

---

## Profile → Assets Mapping

Each base profile has its own `mockdata/assets/` folder on disk. They all push to the
**same path on device** (`{device_base_path}/mockdata/assets/`), so only one profile's
assets can be "active" on device at a time.

### Are assets the same across profiles for an app?

They may or may not be. Two scenarios:

| Case | Example | Implication |
|---|---|---|
| **Shared assets** — all profiles use the same image catalog | Ecommerce: `empty_cart` vs `full_cart` share the same product images; only the cart JSON differs | Push once. Never re-push when switching profiles within a run. |
| **Unique assets** — each profile has its own distinct images | Eats: `budget_menu` has different restaurant photos than `premium_menu` | Must re-push when the active profile on device doesn't match the requested one. |

Check quickly before implementing:
```bash
# Ecommerce
diff -rq \
  digiworld/state_data/com.andojoshop.sbx/default/mockdata/assets/ \
  digiworld/state_data/com.andojoshop.sbx/full_cart/mockdata/assets/

# Eats
diff -rq \
  digiworld/state_data/com.andojoeats.sbx/budget_menu/mockdata/assets/ \
  digiworld/state_data/com.andojoeats.sbx/premium_menu/mockdata/assets/
```

### How `push_app_assets` handles this — profile tracking

`push_app_assets` tracks which profile's assets are currently on device using a single
instance variable `_active_asset_profile`. It skips the push if the profile hasn't changed,
and re-pushes (overwriting in-place) when a different profile is requested:

```python
# In ADBActions.__init__:
self._active_asset_profile: Optional[str] = None

# In push_app_assets:
if self._active_asset_profile == data_id:
    logger.info("Assets for [%s] already on device — skipping push", data_id)
    self.current_data_id = data_id
    return True

# ... do the push ...

self._active_asset_profile = data_id   # mark as active after successful push
```

This means:
- **Same profile, N variations** → push once, skip N−1 times. ✓ (the common case)
- **Profile A then profile B** → pushes A, then pushes B (overwrites device). ✓
- **Profile A → B → A** → pushes A, pushes B, pushes A again. Acceptable — profile
  switches mid-run are rare and the cost is paid only when it actually changes.

### What if assets partially overlap across profiles?

If `full_cart` and `empty_cart` have the same images (same filenames, same content),
an overwrite push is harmless and fast (ADB skips identical files by checksum when
pushing a directory). If they have different images, the overwrite correctly replaces
only what changed. Either way, the device always ends up with the right set for the
active profile.

### Device-side durability (optional upgrade)

If the harness restarts between scenario batches (e.g., CI job re-uses the same
running emulator), the in-memory `_active_asset_profile` is lost and assets get
re-pushed unnecessarily. To avoid this, write a small marker to the device after a
successful push:

```python
# After push completes:
marker = f"{self.device_base_path}/.asset_profile"
self.backend.execute_command(
    f"echo '{data_id}' > {marker}", is_shell=True
)

# At the start of push_app_assets, read it back before deciding to skip:
try:
    on_device = self.backend.read_file(marker).strip()
    if on_device == data_id:
        self._active_asset_profile = data_id   # sync in-memory state
except Exception:
    pass
```

This is a one-line write and one-line read — negligible cost but eliminates cold-start
re-pushes across process restarts.

---

## Cleanup: What Needs Tidying After the Decoupling Ships

The decoupling itself is low-touch, but it exposes a few rough edges that should be
addressed in the same PR or a fast follow-up. Together these fit in the 8-hour budget.

### 1. Materialized theme variant directories (medium priority)

`state_data/` currently has directories like:
```
com.andojoshop.sbx/
  default/
  default-theme_midnight/      ← materialized variant
  default-theme_ocean-blue/    ← materialized variant
  full_cart/
  full_cart-theme_midnight/    ← materialized variant
  ...
```
These exist because themes were once pushed via separate profiles. They are now fully
superseded by the `theme_override` path mechanism — `reset_initial_state` passes the
theme JSON path directly and `set_environment` pushes it at runtime. The materialized
directories are dead weight: they consume disk space, confuse `list_base_profiles`, and
need to be filtered out explicitly (which `profile_variants.py` already does).

**Cleanup:** Delete all `-theme_*` and `-ui_state_*` subdirectories from `state_data/`.
Verify `list_base_profiles` returns clean results. Keep only the `.themes/` and
`.ui_states/` overlay folders at the app root.

### 2. `load_data()` is a near-duplicate of `set_environment` (low priority)

`load_data` (lines 905–973 in `actions.py`) repeats the same JSON + assets + theme push
pattern and ends with a `reset` deeplink instead of `rollback_state`. It should be
refactored to call `push_app_assets` + a direct `reset` deeplink. Until then it still
incurs the full push cost on every call. Acceptable to defer past the initial ship but
track as tech debt.

### 3. `_check_env_set` guard message is misleading post-decoupling (low priority)

Currently raises: `"Environment not set. Please call set_environment first."` After
decoupling, the right call is `push_app_assets`, not `set_environment`. Update the
message to: `"current_data_id not set. Call push_app_assets() or set_environment() first."`

### 4. `setup_emulator.py` still calls `set_environment` in a loop (medium priority)

`setup_app_environment()` in `setup_emulator.py` calls `set_environment` per profile
in a setup loop. After the decoupling ships, this loop can be updated to call
`push_app_assets` once and skip it on subsequent iterations — same saving as in
`reset_initial_state`. Worth doing in the same pass.

---

## Testing Guide

### What to verify

| Check | Expected log line | Means |
|---|---|---|
| First call, no marker on device | `Assets pushed and active profile set to [X]` | Push ran, marker written |
| Second call, same profile, same process | `Assets for profile [X] already on device — skipping push` | In-memory fast path hit |
| Second call, same profile, new process | `Synced active asset profile from device marker: [X]` then skip | Device marker hit |
| Profile switch (A → B) | `Assets pushed and active profile set to [B]` | Correct re-push |
| Images visible in app after skip | App renders product images correctly | JSON-asset sync intact |

### Manual smoke test (run with emulator live)

```python
import logging
logging.basicConfig(level=logging.INFO)

from digiworld.adb.actions import ADBActions

bundle_id = "com.andojoshop.sbx"   # or any app with an assets/ folder
base_path  = "digiworld/state_data"
profile    = "default"

adb = ADBActions(bundle_id=bundle_id, custom_path=base_path)

# Call 1 — should push assets and write marker
print("\n─── Call 1 ───")
adb.set_environment(data_id=profile)

# Call 2 (same instance) — should skip assets
print("\n─── Call 2 (same instance, same profile) ───")
adb.set_environment(data_id=profile)

# Call 3 (new instance, simulates process restart) — should read marker and skip
print("\n─── Call 3 (new instance, device marker path) ───")
adb2 = ADBActions(bundle_id=bundle_id, custom_path=base_path)
adb2.set_environment(data_id=profile)

# Call 4 (different profile) — must re-push
print("\n─── Call 4 (different profile) ───")
adb2.set_environment(data_id="full_cart")
```

**Pass criteria:**
- Call 1: `Assets pushed and active profile set to [default]`
- Call 2: `Assets for profile [default] already on device — skipping push`
- Call 3: `Synced active asset profile from device marker` → skip
- Call 4: `Assets pushed and active profile set to [full_cart]`

### Force a clean re-push (when needed)

```python
# Clear in-memory state AND device marker
adb._active_asset_profile = None
adb.backend.execute_command(
    f"rm -f {adb.device_base_path}/.asset_profile_marker", is_shell=True
)
# Next set_environment call will push assets fresh
```

---

## One-Time Implementation Plan (≤ 8 hours including testing)

| # | Task | Status | Est. |
|---|---|---|---|
| 1 | `_active_asset_profile` + device marker methods in `actions.py` | ✅ Done | — |
| 2 | Guard `_push_assets_parallel` in `set_environment` and `load_data` | ✅ Done | — |
| 3 | Reuse `self.adb` instance in `scenario_base.py` | ✅ Done | — |
| 4 | Update `_check_env_set` error message | ✅ Done | — |
| 5 | Run `diff -rq` on 3–4 apps to confirm shared vs unique assets | ⬜ Pending | 30 min |
| 6 | Smoke-test: ecommerce + eats, 5 variations each (use script above) | ⬜ Pending | 1.5 hr |
| 7 | Regression: full scenario suite on one app | ⬜ Pending | 2 hrs |
| 8 | Cleanup: delete materialized `-theme_*` dirs from `state_data/` | ⬜ Pending (optional) | 30 min |
| **Remaining** | | | **~4.5 hrs** |

Steps 5–7 are the testing phase. Step 8 is cleanup that can happen in a follow-up PR.
