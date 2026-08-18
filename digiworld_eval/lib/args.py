# Copyright (c) Meta Platforms, Inc. and affiliates.
# Standalone dataclasses for digiworld_eval — no external deps.

from dataclasses import dataclass, field
from typing import Any


@dataclass
class RLTaskArgs:
    env_config: str = ""
    reward_fn: str = ""
    identifier: str | None = None
    path: str | None = None
    weight: float | None = None
    init_args: dict | None = None
    samples_per_prompt: int | None = None
    metrics_spec: dict[str, list[str]] = field(default_factory=dict)

    @property
    def name(self) -> str:
        if self.identifier is not None:
            return self.identifier
        base = self.env_config + ":" + self.reward_fn + ":" + (self.path or "")
        args = (
            "_".join(f"{k}={v}" for k, v in sorted(self.init_args.items()))
            if self.init_args
            else ""
        )
        if len(base + ";" + args) > 255:
            return base
        else:
            return base + ";" + args


@dataclass
class SetupArgs:
    spawn_method: str = "forkserver"


@dataclass
class LiteLLMArgs:
    model: str = ""
    api_key: str = ""
    base_url: str = ""
    timeout: float = 120.0
    max_retries: int = 3
    max_tokens: int = 4096


@dataclass
class GenArgs:
    use_sampling: bool = False
    temperature: float = 0.0
    top_p: float | None = None


@dataclass
class MetricsLoggingArgs:
    enable_tensorboard: bool = False
    enable_wandb: bool = False


@dataclass
class GeneratorArgs:
    gen_backend: str = "litellm"
    gen_args: GenArgs = field(default_factory=GenArgs)
    litellm_args: LiteLLMArgs = field(default_factory=LiteLLMArgs)
    setup: SetupArgs = field(default_factory=SetupArgs)
    seed: int = 42


API_BACKENDS = ["litellm"]


@dataclass
class AgentArgs:
    generator: GeneratorArgs = field(default_factory=GeneratorArgs)
    tasks: list[RLTaskArgs] = field(default_factory=list)
    max_rollout_len: int = 131072
    max_exceptions: int = 0
    num_rollout_threads: int = 1
    history_k: int | None = None
    prompt_template: str | None = None
    system_prompt: str | None = None


@dataclass
class EvalArgs:
    dump_dir: str = ""
    dump_mode: str = "full"
    dump_compress: bool = False
    perf_log_freq: float = 60.0
    logging: MetricsLoggingArgs = field(default_factory=MetricsLoggingArgs)
    metric_log_dir: str | None = None
    seed: int = 42
    num_rollout_threads: int = 8
    data_queue_size: int = 1000000
    tasks: list[RLTaskArgs] = field(default_factory=list)
    run_metrics_aggregation: bool = True
    gen_backend: str = "litellm"
    gen_args: GenArgs = field(default_factory=GenArgs)
    litellm_args: LiteLLMArgs = field(default_factory=LiteLLMArgs)
    setup: SetupArgs = field(default_factory=SetupArgs)
    log_level: str = "info"
    max_exceptions: int = 3
    max_rollout_len: int = 131072
    no_resume: bool = False
    history_k: int | None = None
    prompt_template: str | None = None
    system_prompt: str | None = None
    extra_env_imports: list[str] = field(default_factory=list)

    def __post_init__(self) -> None:
        if self.metric_log_dir is None:
            self.metric_log_dir = self.dump_dir


def eval_args_to_agent_args(args: EvalArgs) -> AgentArgs:
    return AgentArgs(
        generator=GeneratorArgs(
            gen_backend=args.gen_backend,
            gen_args=args.gen_args,
            litellm_args=args.litellm_args,
            setup=args.setup,
            seed=args.seed,
        ),
        max_rollout_len=args.max_rollout_len,
        tasks=args.tasks,
        max_exceptions=args.max_exceptions,
        num_rollout_threads=args.num_rollout_threads,
        history_k=args.history_k,
        prompt_template=args.prompt_template,
        system_prompt=args.system_prompt,
    )
