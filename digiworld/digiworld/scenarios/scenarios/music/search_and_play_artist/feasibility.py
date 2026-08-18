from digiworld.scenarios.constraints import EntityExistsConstraint

CONSTRAINTS = [
    EntityExistsConstraint(
        table="artists",
        min_count=1,
        filter={"name": lambda params: params["artist_name"]},
    ),
    EntityExistsConstraint(table="songs", min_count=1),
]
