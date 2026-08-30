"""Visual engine exceptions."""


class VisualSpecError(ValueError):
    """Raised when a visual specification is structurally invalid."""


class DiagramLayoutError(RuntimeError):
    """Raised when labels cannot be placed without collisions."""

    def __init__(self, message: str, *, label_id: str | None = None, issues: list | None = None):
        super().__init__(message)
        self.label_id = label_id
        self.issues = issues or []
