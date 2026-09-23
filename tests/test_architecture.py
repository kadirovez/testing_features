"""Static checks enforcing the architecture rules from `.cursor/rules/backend.mdc`."""

import ast
import re
from pathlib import Path

import pytest

APP_DIR = Path(__file__).resolve().parent.parent / "app"
MODULES_DIR = APP_DIR / "modules"
MODULE_NAMES = sorted(p.name for p in MODULES_DIR.iterdir() if p.is_dir() and not p.name.startswith("_"))
PRIVATE_LAYERS = {"models", "repository", "cache"}
REQUIRED_FILES = {"router.py", "service.py", "repository.py", "models.py", "schemas.py"}
CYRILLIC = re.compile(r"[\u0400-\u04FF]")
ROUTE_DECORATORS = {"get", "post", "put", "patch", "delete", "websocket"}


def _python_files(root: Path) -> list[Path]:
    return sorted(p for p in root.rglob("*.py") if "__pycache__" not in p.parts)


def _imported_modules(tree: ast.AST) -> list[str]:
    names: list[str] = []
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module:
            names.append(node.module)
            names.extend(f"{node.module}.{alias.name}" for alias in node.names)
        elif isinstance(node, ast.Import):
            names.extend(alias.name for alias in node.names)
    return names


@pytest.mark.parametrize("module", MODULE_NAMES)
def test_module_has_required_files(module: str) -> None:
    present = {p.name for p in (MODULES_DIR / module).iterdir()}
    assert REQUIRED_FILES <= present


@pytest.mark.parametrize("path", _python_files(MODULES_DIR), ids=lambda p: str(p.relative_to(APP_DIR)))
def test_no_foreign_private_layer_imports(path: Path) -> None:
    own_module = path.relative_to(MODULES_DIR).parts[0]
    for imported in _imported_modules(ast.parse(path.read_text())):
        parts = imported.split(".")
        if parts[:2] != ["app", "modules"] or len(parts) < 4:
            continue
        target_module, layer = parts[2], parts[3]
        assert target_module == own_module or layer not in PRIVATE_LAYERS, f"{path.name} imports {imported}"


@pytest.mark.parametrize("path", _python_files(MODULES_DIR), ids=lambda p: str(p.relative_to(APP_DIR)))
def test_no_http_exception_in_modules(path: Path) -> None:
    assert "HTTPException" not in path.read_text()


@pytest.mark.parametrize(
    "path",
    [p for p in _python_files(APP_DIR) if "seed" not in p.relative_to(APP_DIR).parts],
    ids=lambda p: str(p.relative_to(APP_DIR)),
)
def test_no_cyrillic_outside_seed(path: Path) -> None:
    assert not CYRILLIC.search(path.read_text()), "user-facing texts belong to app/seed, code comments must be English"


@pytest.mark.parametrize("module", MODULE_NAMES)
def test_each_endpoint_calls_exactly_one_service_function(module: str) -> None:
    tree = ast.parse((MODULES_DIR / module / "router.py").read_text())
    for node in ast.walk(tree):
        if not isinstance(node, ast.AsyncFunctionDef):
            continue
        is_route = any(
            isinstance(dec, ast.Call) and isinstance(dec.func, ast.Attribute) and dec.func.attr in ROUTE_DECORATORS
            for dec in node.decorator_list
        )
        if not is_route:
            continue
        service_calls = [
            call
            for call in ast.walk(node)
            if isinstance(call, ast.Call)
            and isinstance(call.func, ast.Attribute)
            and isinstance(call.func.value, ast.Name)
            and call.func.value.id.endswith("_service")
        ]
        assert len(service_calls) == 1, f"{module}.router.{node.name} makes {len(service_calls)} service calls"
