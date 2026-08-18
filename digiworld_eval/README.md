# Running the DigiWorld eval

> The standalone evaluation harness for DigiWorld. For the framework itself
> (scenarios, CLI, Python API, installing the `digiworld` package), see the
> [root README](../README.md).

This harness runs a vision-language model as an agent against DigiWorld mock
apps on an Android emulator, one *trajectory* at a time, and scores each task
with the app's built-in verifier (pass/fail). It talks to the emulator over a
small HTTP bridge, and calls the model through `litellm` (direct to OpenAI /
Anthropic / Google).

**Prefer not to install an emulator?** On a Linux host with KVM you can run the
emulator, the mock apps and the bridge server in a Docker or Podman container
instead — one command to build, one to run, and the harness can start containers
itself for parallel evaluation. Skip to [docker/README.md](../docker/README.md);
§5–§8 below (API keys, configs, running, reading results) apply unchanged.

---

## 1. Prerequisites

- **A running Android emulator** visible to `adb`:
  ```bash
  adb devices      # should list e.g. "emulator-5554   device"
  ```
  No emulator yet? See [Android emulator (ADB)](../README.md#android-emulator-adb)
  in the root README for creating and booting one.
- **Git LFS** — state data used by scenario reset/verify is stored with LFS:
  ```bash
  git lfs install && git lfs pull    # run from the repo root
  ```
- **A Python 3.12 environment** (created in §2).
- An **API key** for whichever model provider you want to use (see §5).

## 2. Install Python dependencies

Create one conda env named `digiworld` and install everything into it — the same
env is used for the bridge server, the eval, and `setup_emulator.sh`:

```bash
conda create -n digiworld python=3.12 -y
conda activate digiworld
# venv alternative: python3.12 -m venv .venv && source .venv/bin/activate

# eval harness + bridge server + litellm (gpt/claude/gemini)
pip install -r digiworld_eval/requirements.txt
pip install pyyaml                    # required by scenario loading

# install Git LFS and pull large files (state data, media assets)
git lfs install
git lfs pull

# Install the two local packages EDITABLE in compat mode. Compat mode is
# required: it puts each package's real directory on sys.path so imports resolve
# correctly when you run the commands below from the repo root. (With the default
# editable mode, the repo-root `digiworld/` project directory shadows the
# installed `digiworld` package as an empty namespace package, and the bridge
# server fails with "module 'digiworld' has no attribute 'get_state_data_path'".)
#
#   - `digiworld`      — scenario reset/verification used by the bridge in §4
#   - `digiworld_eval` — the eval harness + bridge server (this directory)
#
# Neither is on PyPI; install both from this repo:
pip install -e digiworld -e . --config-settings editable_mode=compat
```

All commands in this README are run from the **repo root** (this directory).

Note: **`openai`** is not installed — it's only needed for the `openai_sdk` backend
(uncomment it in `requirements.txt` if you use it).

## 3. Install the mock apps onto the emulator

Place the DigiWorld APKs in `digiworld/current_apps/` (one `*.apk` per app), then:

```bash
bash digiworld_eval/setup_emulator.sh
# (optional) only some apps / a specific device:
#   bash digiworld_eval/setup_emulator.sh --apps smarthome banking --device emulator-5554
```

## 4. Start the local bridge server (leave it running in its own terminal)

```bash
python -m digiworld_eval.local_server --digiworld --device emulator-5554 --port 6801
```

- `--digiworld` enables real scenario reset + verification (without it, reset/verify are stubs).
- Sanity check from another terminal:
  ```bash
  curl -s http://localhost:6801/health          # {"ok": true, ...}
  curl -s -o shot.png http://localhost:6801/device/screenshot
  ```

The **port here must match `server_urls` in your config** (§6).

> Running the container instead? It already serves this API on port 6800, so
> skip §3 and §4 entirely and point `server_urls` at
> `http://localhost:6800` (or set `container_image` and let the harness manage
> the container — see [docker/README.md](../docker/README.md)).

## 5. Set your API key(s)

Export only the key(s) for the model you'll run:

| Backend | Provider | Env var |
|---|---|---|
| `litellm` | OpenAI (gpt-*) | `OPENAI_API_KEY` |
| `litellm` | Anthropic (claude-*) | `ANTHROPIC_API_KEY` |
| `litellm` | Google (gemini-*) | `GEMINI_API_KEY` |

```bash
export OPENAI_API_KEY=sk-...
```

**Quick OpenAI test:** a ready-to-run GPT config is committed at
`digiworld_eval/configs/mockapps_eval_openai.yaml` (litellm backend, `gpt-4o`,
bridge on port 6800). Once `OPENAI_API_KEY` is exported and the bridge server is
running (§4), run it directly:

```bash
export OPENAI_API_KEY=sk-...
python -m digiworld_eval.local_server --port 6800 --digiworld    # in its own terminal
python -m digiworld_eval.eval config=digiworld_eval/configs/mockapps_eval_openai.yaml
# override the model if you like: ... litellm_args.model=gpt-4o-mini
```

## 6. Pick a config (model + task)

Copy this template to `digiworld_eval/configs/my_run.yaml` and edit the two
marked lines. `run_one_task.jsonl` holds a single `{"task_id": "..."}` per line
(list valid ids with `curl -s http://localhost:6801/tasks`).

```yaml
dump_dir: /tmp/dw_eval_run
gen_backend: litellm

litellm_args:
  model: "gpt-4o"               # <-- see model table below
  max_tokens: 4096

gen_args:
  use_sampling: true
  temperature: 0.0

tasks:
  - env_config: server_env
    reward_fn: pass_only
    path: digiworld_eval/configs/run_one_task.jsonl
    samples_per_prompt: 1
    init_args:
      server_urls: ["http://localhost:6801"]   # <-- must match local_server --port
      max_turns: 20
      saved_screenshot_folder: ${dump_dir}/saved_screenshots
    metrics_spec:
      pass: ['@1']
      task_completed: ['mean']

num_rollout_threads: 1
dump_mode: full
run_metrics_aggregation: true
logging: { enable_tensorboard: false, enable_wandb: false }
setup: { spawn_method: forkserver }
log_level: info
no_resume: true
```

**Model / backend table** (litellm needs a provider prefix for non-OpenAI):

| Want to run | `gen_backend` | `model` | Key |
|---|---|---|---|
| GPT | `litellm` | `gpt-4o` | `OPENAI_API_KEY` |
| Claude | `litellm` | `anthropic/claude-sonnet-4-5-20250929` | `ANTHROPIC_API_KEY` |
| Gemini | `litellm` | `gemini/gemini-3.1-pro-preview` | `GEMINI_API_KEY` |

> Tip: list the exact model ids your key can access —
> Anthropic: `curl -s https://api.anthropic.com/v1/models -H "x-api-key: $ANTHROPIC_API_KEY" -H "anthropic-version: 2023-06-01"`
> Gemini: `curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"`

## 7. Run it

```bash
python -m digiworld_eval.eval config=digiworld_eval/configs/my_run.yaml
```

You'll see the emulator being driven, then an aggregated result at the end.

## 8. Read the result

```bash
cat /tmp/dw_eval_run/trajectories/all_metrics.jsonl | python -m json.tool
```

Look for `terminal_metrics.pass` (true/false), `terminal_rewards` (`+1.0`
pass / `-1.0` fail), and `verify_details.checks`. Per-step screenshots and an
annotated `*_concat.png` are saved under `dump_dir/saved_screenshots/`.

## Troubleshooting

- **`No Android devices found`** — start the emulator; confirm `adb devices`.
- **`Connection refused` to `localhost:6801`** — the bridge server (§4) isn't running, or the port doesn't match `server_urls`.
- **`RateLimitError` / `RESOURCE_EXHAUSTED` / quota** — your provider account/tier is out of quota (not a harness bug).
- **litellm `LLM Provider NOT provided`** — add the provider prefix (`anthropic/…`, `gemini/…`); `gpt-*` needs none.
- **`model: ... not_found`** — the id isn't available to your key; list available models (§6 tip).
