import importlib
import pkgutil
from types import ModuleType

import pytest

import app.modules
import app.seed.errors
import app.seed.messages
from app.core.i18n.types import ErrorDefinition, Locale, LocalizedText

SEED_PACKAGES = [app.seed.errors, app.seed.messages]
# `core` holds infrastructure errors that belong to no business module.
ALLOWED_NON_MODULE_FILES = {"core", "system"}


def _modules(package: ModuleType) -> list[ModuleType]:
    return [importlib.import_module(f"{package.__name__}.{info.name}") for info in pkgutil.iter_modules(package.__path__)]


def _constants(module: ModuleType) -> list[tuple[str, LocalizedText]]:
    return [(name, value) for name, value in vars(module).items() if isinstance(value, LocalizedText)]


ALL_MODULES = [module for package in SEED_PACKAGES for module in _modules(package)]


@pytest.mark.parametrize("module", ALL_MODULES, ids=lambda m: m.__name__)
def test_constants_are_sorted_alphabetically(module: ModuleType) -> None:
    names = [name for name, _ in _constants(module)]
    assert names == sorted(names)


@pytest.mark.parametrize("module", ALL_MODULES, ids=lambda m: m.__name__)
def test_every_text_has_all_locales(module: ModuleType) -> None:
    for name, value in _constants(module):
        assert set(value.message) == {locale.value for locale in Locale}, name


def test_error_codes_are_unique() -> None:
    codes = [value.code for module in _modules(app.seed.errors) for _, value in _constants(module)]
    assert len(codes) == len(set(codes))


def test_error_files_match_modules() -> None:
    module_names = {info.name for info in pkgutil.iter_modules(app.modules.__path__)}
    for module in _modules(app.seed.errors):
        short_name = module.__name__.rsplit(".", 1)[-1]
        assert short_name in module_names or short_name in ALLOWED_NON_MODULE_FILES, short_name
        assert all(isinstance(value, ErrorDefinition) for _, value in _constants(module))
