"""Collision detection package."""

from .loop import LabelArtist, resolve_label_collisions
from .obstacles import ObstacleSet

__all__ = ["LabelArtist", "ObstacleSet", "resolve_label_collisions"]
