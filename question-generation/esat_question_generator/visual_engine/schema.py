"""VisualSpec schema parsing and validation."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .errors import VisualSpecError

SPEC_VERSION = "1.0"

SUPPORTED_OBJECT_TYPES = frozenset(
    {
        "polygon",
        "line",
        "circle",
        "arc",
        "function",
        "axes",
        "right_angle_marker",
        "angle_arc",
        "dimension_line",
        "equal_length_ticks",
        "point",
        "arrow",
    }
)

SUPPORTED_POSITIONS = frozenset(
    {
        "above",
        "below",
        "left",
        "right",
        "upper_left",
        "upper_right",
        "lower_left",
        "lower_right",
        "center",
    }
)


@dataclass
class CoordinateSystem:
    x_min: float = 0.0
    x_max: float = 10.0
    y_min: float = 0.0
    y_max: float = 7.0
    equal_aspect: bool = True
    show_axes: bool = False


@dataclass
class VisualSpec:
    spec_version: str = SPEC_VERSION
    needs_diagram: bool = True
    diagram_type: str = "geometry"
    diagram_id: str = "d1"
    not_to_scale: bool = True
    coordinate_system: CoordinateSystem = field(default_factory=CoordinateSystem)
    objects: list[dict[str, Any]] = field(default_factory=list)
    labels: list[dict[str, Any]] = field(default_factory=list)
    annotations: list[dict[str, Any]] = field(default_factory=list)
    source_question_id: str | None = None
    variation_mode: str | None = None

    def to_dict(self) -> dict[str, Any]:
        cs = self.coordinate_system
        return {
            "spec_version": self.spec_version,
            "needs_diagram": self.needs_diagram,
            "diagram_type": self.diagram_type,
            "diagram_id": self.diagram_id,
            "not_to_scale": self.not_to_scale,
            "coordinate_system": {
                "x_min": cs.x_min,
                "x_max": cs.x_max,
                "y_min": cs.y_min,
                "y_max": cs.y_max,
                "equal_aspect": cs.equal_aspect,
                "show_axes": cs.show_axes,
            },
            "objects": self.objects,
            "labels": self.labels,
            "annotations": self.annotations,
            "source_question_id": self.source_question_id,
            "variation_mode": self.variation_mode,
        }


def _as_float(value: Any, name: str) -> float:
    try:
        return float(value)
    except (TypeError, ValueError) as exc:
        raise VisualSpecError(f"{name} must be numeric, got {value!r}") from exc


def _as_point(value: Any, name: str) -> tuple[float, float]:
    if not isinstance(value, (list, tuple)) or len(value) < 2:
        raise VisualSpecError(f"{name} must be [x, y]")
    return (_as_float(value[0], f"{name}[0]"), _as_float(value[1], f"{name}[1]"))


def _validate_object(obj: dict[str, Any], index: int) -> None:
    obj_type = str(obj.get("type") or "").strip().lower()
    if not obj_type:
        raise VisualSpecError(f"objects[{index}] missing type")
    if obj_type not in SUPPORTED_OBJECT_TYPES:
        raise VisualSpecError(f"objects[{index}] unsupported type {obj_type!r}")

    if obj_type == "polygon":
        points = obj.get("points")
        if not isinstance(points, list) or len(points) < 3:
            raise VisualSpecError(f"objects[{index}] polygon needs at least 3 points")
        for i, pt in enumerate(points):
            _as_point(pt, f"objects[{index}].points[{i}]")
    elif obj_type == "line":
        _as_point(obj.get("start"), f"objects[{index}].start")
        _as_point(obj.get("end"), f"objects[{index}].end")
    elif obj_type == "circle":
        _as_point(obj.get("center"), f"objects[{index}].center")
        _as_float(obj.get("radius"), f"objects[{index}].radius")
    elif obj_type == "arc":
        _as_point(obj.get("center"), f"objects[{index}].center")
        _as_float(obj.get("radius"), f"objects[{index}].radius")
        _as_float(obj.get("theta1"), f"objects[{index}].theta1")
        _as_float(obj.get("theta2"), f"objects[{index}].theta2")
    elif obj_type == "function":
        if not str(obj.get("expr") or "").strip():
            raise VisualSpecError(f"objects[{index}] function requires expr")
        domain = obj.get("domain")
        if not isinstance(domain, (list, tuple)) or len(domain) != 2:
            raise VisualSpecError(f"objects[{index}] function domain must be [x_min, x_max]")
    elif obj_type == "right_angle_marker":
        _as_point(obj.get("vertex"), f"objects[{index}].vertex")
        _as_point(obj.get("leg1"), f"objects[{index}].leg1")
        _as_point(obj.get("leg2"), f"objects[{index}].leg2")
    elif obj_type == "angle_arc":
        _as_point(obj.get("vertex"), f"objects[{index}].vertex")
        _as_point(obj.get("point1"), f"objects[{index}].point1")
        _as_point(obj.get("point2"), f"objects[{index}].point2")
    elif obj_type == "dimension_line":
        _as_point(obj.get("start"), f"objects[{index}].start")
        _as_point(obj.get("end"), f"objects[{index}].end")
    elif obj_type == "equal_length_ticks":
        _as_point(obj.get("seg1_start"), f"objects[{index}].seg1_start")
        _as_point(obj.get("seg1_end"), f"objects[{index}].seg1_end")
        _as_point(obj.get("seg2_start"), f"objects[{index}].seg2_start")
        _as_point(obj.get("seg2_end"), f"objects[{index}].seg2_end")
    elif obj_type == "point":
        _as_point(obj.get("at"), f"objects[{index}].at")
    elif obj_type == "arrow":
        _as_point(obj.get("start"), f"objects[{index}].start")
        _as_point(obj.get("end"), f"objects[{index}].end")


def _validate_label(label: dict[str, Any], index: int) -> None:
    if not str(label.get("text") or "").strip():
        raise VisualSpecError(f"labels[{index}] requires text")
    _as_point(label.get("anchor"), f"labels[{index}].anchor")
    pos = str(label.get("preferred_position") or "center").strip().lower()
    if pos not in SUPPORTED_POSITIONS:
        raise VisualSpecError(f"labels[{index}] invalid preferred_position {pos!r}")


def parse_spec(data: dict[str, Any]) -> VisualSpec:
    if not isinstance(data, dict):
        raise VisualSpecError("spec must be a JSON object")

    cs_raw = data.get("coordinate_system") or {}
    if not isinstance(cs_raw, dict):
        raise VisualSpecError("coordinate_system must be an object")

    cs = CoordinateSystem(
        x_min=_as_float(cs_raw.get("x_min", 0), "coordinate_system.x_min"),
        x_max=_as_float(cs_raw.get("x_max", 10), "coordinate_system.x_max"),
        y_min=_as_float(cs_raw.get("y_min", 0), "coordinate_system.y_min"),
        y_max=_as_float(cs_raw.get("y_max", 7), "coordinate_system.y_max"),
        equal_aspect=bool(cs_raw.get("equal_aspect", True)),
        show_axes=bool(cs_raw.get("show_axes", False)),
    )
    if cs.x_max <= cs.x_min or cs.y_max <= cs.y_min:
        raise VisualSpecError("coordinate_system bounds must be positive width/height")

    objects = data.get("objects") or []
    labels = data.get("labels") or []
    annotations = data.get("annotations") or []
    if not isinstance(objects, list):
        raise VisualSpecError("objects must be a list")
    if not isinstance(labels, list):
        raise VisualSpecError("labels must be a list")
    if not isinstance(annotations, list):
        raise VisualSpecError("annotations must be a list")

    for i, obj in enumerate(objects):
        if not isinstance(obj, dict):
            raise VisualSpecError(f"objects[{i}] must be an object")
        _validate_object(obj, i)
    for i, label in enumerate(labels):
        if not isinstance(label, dict):
            raise VisualSpecError(f"labels[{i}] must be an object")
        _validate_label(label, i)

    return VisualSpec(
        spec_version=str(data.get("spec_version") or SPEC_VERSION),
        needs_diagram=bool(data.get("needs_diagram", True)),
        diagram_type=str(data.get("diagram_type") or "geometry"),
        diagram_id=str(data.get("diagram_id") or "d1"),
        not_to_scale=bool(data.get("not_to_scale", True)),
        coordinate_system=cs,
        objects=objects,
        labels=labels,
        annotations=annotations,
        source_question_id=data.get("source_question_id"),
        variation_mode=data.get("variation_mode"),
    )
