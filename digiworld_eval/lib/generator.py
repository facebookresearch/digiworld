# Copyright (c) Meta Platforms, Inc. and affiliates.
# Simplified API-only generator — no fastgen/vllm/CUDA/distributed/tokenizer.

import logging

from digiworld_eval.lib.args import API_BACKENDS, GeneratorArgs

logger = logging.getLogger(__name__)


def _build_model_gen(args: GeneratorArgs):
    assert args.gen_backend in API_BACKENDS, (
        f"Only API backends supported: {API_BACKENDS}. Got '{args.gen_backend}'"
    )

    if args.gen_backend == "litellm":
        logger.info("Using LiteLLM for generation")
        from digiworld_eval.lib.backends.litellm_backend import LiteLLMGen
        return LiteLLMGen(args=args.litellm_args, gen_args=args.gen_args)

    raise ValueError(f"Unsupported gen_backend: {args.gen_backend}")


class Generator:
    def __init__(self, args: GeneratorArgs) -> None:
        self.model_gen = _build_model_gen(args)
        self.args = args

    def shutdown(self) -> None:
        pass
