# Copyright (c) Meta Platforms, Inc. and affiliates.
from digiworld.scenarios.template_resolver import TemplateResolver


class EatsTemplateResolver(TemplateResolver):
    """Template resolver for eats scenarios."""
    
    def __init__(self, user_context, positioning_data, db_path=None):
        super().__init__(user_context, positioning_data)
        self.db_path = db_path
    
    def resolve(self, template):
        """Resolve eats-specific templates."""
        result = super().resolve(template)
        return result
