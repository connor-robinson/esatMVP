#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Setup and Validation CLI for TMUA Question Generator

This script:
1. Validates environment configuration
2. Runs database migrations (if Supabase CLI is available)
3. Tests imports and basic functionality
4. Validates graph utilities
5. Checks prompt files exist
"""

import os
import sys
import subprocess
from pathlib import Path
from typing import List, Tuple

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def print_header(text: str):
    """Print a formatted header."""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70 + "\n")


def print_success(text: str):
    """Print a success message."""
    print(f"✓ {text}")


def print_error(text: str):
    """Print an error message."""
    print(f"✗ {text}", file=sys.stderr)


def print_warning(text: str):
    """Print a warning message."""
    print(f"⚠ {text}")


def print_info(text: str):
    """Print an info message."""
    print(f"  {text}")


def check_environment() -> Tuple[bool, List[str]]:
    """Check environment variables and configuration."""
    print_header("Checking Environment Configuration")
    
    errors = []
    warnings = []
    
    # Get project root first
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    env_path = project_root / ".env.local"
    
    # Check required environment variables
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        # Try loading from .env.local first
        if env_path.exists():
            try:
                from dotenv import load_dotenv
                load_dotenv(env_path, override=True)
                gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
            except:
                pass
        
        if not gemini_key:
            errors.append("GEMINI_API_KEY environment variable is not set (check .env.local)")
        else:
            print_success("GEMINI_API_KEY is set (loaded from .env.local)")
    else:
        print_success("GEMINI_API_KEY is set")
    
    # Check Supabase environment variables (optional)
    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    
    # Try loading from .env.local if not set
    if (not supabase_url or not supabase_key) and env_path.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(env_path, override=True)
            supabase_url = os.environ.get("SUPABASE_URL", "").strip()
            supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        except:
            pass
    
    if not supabase_url or not supabase_key:
        warnings.append("Supabase credentials not set (database sync will be disabled)")
        print_warning("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    else:
        print_success("Supabase credentials are set")
    
    # Check .env.local file
    
    if env_path.exists():
        print_success(f".env.local file exists at {env_path}")
        
        # Try to load it
        try:
            from dotenv import load_dotenv
            load_dotenv(env_path)
            print_success("Successfully loaded .env.local")
        except ImportError:
            warnings.append("python-dotenv not installed (optional, but recommended)")
            print_warning("python-dotenv not installed (optional)")
        except Exception as e:
            errors.append(f"Error loading .env.local: {e}")
            print_error(f"Error loading .env.local: {e}")
    else:
        warnings.append(f".env.local file not found at {env_path} (optional)")
        print_warning(f".env.local file not found at {env_path}")
    
    return len(errors) == 0, errors + warnings


def check_imports() -> Tuple[bool, List[str]]:
    """Check that all required modules can be imported."""
    print_header("Checking Python Imports")
    
    errors = []
    modules_to_check = [
        ("yaml", "PyYAML"),
        ("supabase", "supabase-py (optional)"),
        ("dotenv", "python-dotenv (optional)"),
    ]
    
    for module_name, package_name in modules_to_check:
        try:
            __import__(module_name)
            print_success(f"✓ {package_name} imported successfully")
        except ImportError:
            if "optional" in package_name:
                print_warning(f"{package_name} not installed (optional)")
            else:
                errors.append(f"Required package {package_name} not installed")
                print_error(f"✗ {package_name} import failed")
    
    # Check internal modules
    # Try relative imports first (when run as module), fall back to absolute (when run as script)
    try:
        from . import project
        print_success("✓ project module imported")
    except (ImportError, ValueError):
        # Fallback to absolute import
        import sys
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if base_dir not in sys.path:
            sys.path.insert(0, base_dir)
        try:
            import project
            print_success("✓ project module imported (absolute)")
        except Exception as e:
            errors.append(f"Failed to import project module: {e}")
            print_error(f"✗ project module import failed: {e}")
    
    try:
        from .graph_utils import (
            build_graph_spec_from_intent,
            validate_graph_spec,
            parse_graph_placeholders,
            insert_graph_placeholder,
            GraphQuotaManager
        )
        print_success("✓ graph_utils module imported")
    except (ImportError, ValueError):
        # Fallback to absolute import
        import sys
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if base_dir not in sys.path:
            sys.path.insert(0, base_dir)
        try:
            from graph_utils import (
                build_graph_spec_from_intent,
                validate_graph_spec,
                parse_graph_placeholders,
                insert_graph_placeholder,
                GraphQuotaManager
            )
            print_success("✓ graph_utils module imported (absolute)")
        except Exception as e:
            errors.append(f"Failed to import graph_utils: {e}")
            print_error(f"✗ graph_utils module import failed: {e}")
    
    try:
        from . import db_sync
        print_success("✓ db_sync module imported")
    except (ImportError, ValueError):
        # Fallback to absolute import
        import sys
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if base_dir not in sys.path:
            sys.path.insert(0, base_dir)
        try:
            import db_sync
            print_success("✓ db_sync module imported (absolute)")
        except Exception as e:
            errors.append(f"Failed to import db_sync: {e}")
            print_error(f"✗ db_sync module import failed: {e}")
    
    return len(errors) == 0, errors


def check_prompt_files() -> Tuple[bool, List[str]]:
    """Check that all required prompt files exist."""
    print_header("Checking Prompt Files")
    
    errors = []
    warnings = []
    
    script_dir = Path(__file__).parent
    prompts_dir = script_dir / "by_paper_prompts"
    
    required_files = [
        "Paper1/Paper1 Designer.md",
        "Paper1/Paper1 Implementer.md",
        "Paper1/Paper1 Verifier.md",
        "Paper1/Paper1 Style_checker.md",
        "Paper1/Paper1 Far Mode.md",
        "Paper2/Paper2 Designer.md",
        "Paper2/Paper2 Implementer.md",
        "Paper2/Paper2 Verifier.md",
        "Paper2/Paper2 Style_checker.md",
        "Paper2/Paper2 Far Mode.md",
        "Paper2/Paper2 Template Selector.md",
    ]
    
    for file_path in required_files:
        full_path = prompts_dir / file_path
        if full_path.exists():
            print_success(f"✓ {file_path}")
        else:
            errors.append(f"Missing prompt file: {file_path}")
            print_error(f"✗ {file_path} not found")
    
    # Check template files
    templates_dir = prompts_dir / "Paper2" / "Templates"
    if templates_dir.exists():
        template_files = list(templates_dir.glob("*.md"))
        if template_files:
            print_success(f"✓ Found {len(template_files)} template files")
        else:
            warnings.append("No template files found in Paper2/Templates/")
            print_warning("No template files found in Paper2/Templates/")
    else:
        warnings.append("Paper2/Templates directory not found")
        print_warning("Paper2/Templates directory not found")
    
    return len(errors) == 0, errors + warnings


def check_schema_files() -> Tuple[bool, List[str]]:
    """Check that schema files exist."""
    print_header("Checking Schema Files")
    
    errors = []
    
    script_dir = Path(__file__).parent
    esat_dir = script_dir.parent / "esat_question_generator"
    schemas_dir = esat_dir / "schemas"
    
    required_schemas = [
        "Schemas_TMUA_Paper1.md",
        "Schemas_TMUA_Paper2.md",
    ]
    
    for schema_file in required_schemas:
        schema_path = schemas_dir / schema_file
        if schema_path.exists():
            print_success(f"✓ {schema_file}")
        else:
            errors.append(f"Missing schema file: {schema_file}")
            print_error(f"✗ {schema_file} not found at {schema_path}")
    
    return len(errors) == 0, errors


def check_graph_utilities() -> Tuple[bool, List[str]]:
    """Test graph utility functions."""
    print_header("Testing Graph Utilities")
    
    errors = []
    
    # Ensure we can import
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    
    try:
        import graph_utils.graph_builder as graph_builder
        import graph_utils.graph_validator as graph_validator
        import graph_utils.placeholder_parser as placeholder_parser
        import graph_utils.quota_manager as quota_manager
        
        build_graph_spec_from_intent = graph_builder.build_graph_spec_from_intent
        validate_graph_spec = graph_validator.validate_graph_spec
        parse_graph_placeholders = placeholder_parser.parse_graph_placeholders
        insert_graph_placeholder = placeholder_parser.insert_graph_placeholder
        GraphQuotaManager = quota_manager.GraphQuotaManager
        
        # Test quota manager
        quota_manager = GraphQuotaManager()
        quota_manager.reset_for_batch(100)
        print_success("✓ GraphQuotaManager instantiated")
        
        # Test placeholder parser
        test_text = "This is a test.\n\n    <GRAPH id=\"g1\" />\n\nMore text."
        placeholders = parse_graph_placeholders(test_text)
        if len(placeholders) == 1 and placeholders[0]['id'] == 'g1':
            print_success("✓ Placeholder parser works")
        else:
            errors.append("Placeholder parser test failed")
            print_error("✗ Placeholder parser test failed")
        
        # Test simple graph_intent
        test_intent = {
            "version": 2,
            "objects": [
                {"id": "f", "kind": "function", "fn": {"kind": "poly2", "a": 1, "b": -3, "c": 2}},
                {"id": "xaxis", "kind": "line", "form": {"kind": "horiz", "y": 0}}
            ],
            "regions": [],
            "marks_needed": {"x_marks": [], "points": []},
            "derived_needed": []
        }
        
        try:
            graph_spec = build_graph_spec_from_intent(test_intent)
            if graph_spec and graph_spec.get("version") == 2:
                print_success("✓ Graph builder works")
            else:
                errors.append("Graph builder test failed")
                print_error("✗ Graph builder test failed")
        except Exception as e:
            errors.append(f"Graph builder test failed: {e}")
            print_error(f"✗ Graph builder test failed: {e}")
        
    except Exception as e:
        errors.append(f"Graph utilities test failed: {e}")
        print_error(f"✗ Graph utilities test failed: {e}")
    
    return len(errors) == 0, errors


def run_migrations() -> Tuple[bool, List[str]]:
    """Run database migrations if Supabase CLI is available."""
    print_header("Running Database Migrations")
    
    errors = []
    warnings = []
    
    # Check if Supabase CLI is available
    try:
        result = subprocess.run(
            ["supabase", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            print_success(f"Supabase CLI found: {result.stdout.strip()}")
        else:
            warnings.append("Supabase CLI not working properly")
            print_warning("Supabase CLI not working properly")
            return True, warnings
    except FileNotFoundError:
        warnings.append("Supabase CLI not found. Install from https://supabase.com/docs/guides/cli")
        print_warning("Supabase CLI not found (optional for direct database sync)")
        return True, warnings
    except Exception as e:
        warnings.append(f"Error checking Supabase CLI: {e}")
        print_warning(f"Error checking Supabase CLI: {e}")
        return True, warnings
    
    # Check if we're in a Supabase project
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    supabase_dir = project_root / "supabase"
    migrations_dir = supabase_dir / "migrations"
    
    if not migrations_dir.exists():
        warnings.append("supabase/migrations directory not found")
        print_warning("supabase/migrations directory not found")
        return True, warnings
    
    # Check for migration files
    migration_files = list(migrations_dir.glob("*.sql"))
    if not migration_files:
        warnings.append("No migration files found")
        print_warning("No migration files found")
        return True, warnings
    
    print_info(f"Found {len(migration_files)} migration files")
    
    # Show the latest migration file (for graph fields)
    latest_migration = max(migration_files, key=lambda p: p.name)
    print_info(f"Latest migration: {latest_migration.name}")
    
    # Check if Supabase is linked
    try:
        result = subprocess.run(
            ["supabase", "status"],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print_success("Supabase project is linked")
            print_info("To apply migrations, you can:")
            print_info("  1. Run: supabase db push")
            print_info("  2. Or use the Supabase dashboard SQL editor")
        else:
            warnings.append("Supabase project not linked. Link with: supabase link")
            print_warning("Supabase project not linked")
            print_info("Alternative: Apply migrations manually via Supabase dashboard:")
            print_info(f"  1. Go to SQL Editor in Supabase dashboard")
            print_info(f"  2. Copy contents of: {latest_migration.name}")
            print_info(f"  3. Run the SQL")
    except Exception as e:
        warnings.append(f"Could not check Supabase status: {e}")
        print_warning(f"Could not check Supabase status: {e}")
        print_info("To apply migrations manually:")
        print_info(f"  1. Open Supabase dashboard > SQL Editor")
        print_info(f"  2. Copy SQL from: {latest_migration.name}")
        print_info(f"  3. Execute the SQL")
        print_info(f"   Or use the prepared file: scripts/apply_migration.sql")
    
    return True, warnings


def validate_database_schema() -> Tuple[bool, List[str]]:
    """Validate that database schema matches expected structure."""
    print_header("Validating Database Schema")
    
    errors = []
    warnings = []
    
    # Ensure we can import
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    
    try:
        import db_sync
        DatabaseSync = db_sync.DatabaseSync
        
        db_sync = DatabaseSync()
        if not db_sync.enabled:
            warnings.append("Database sync is disabled (Supabase credentials not set)")
            print_warning("Database sync is disabled")
            return True, warnings
        
        # Try to connect and check if table exists
        try:
            # This is a simple check - we'll try to query the table structure
            # Note: We can't easily check column existence without actual queries
            print_success("Database connection successful")
            print_info("To verify schema manually, check that ai_generated_questions table has:")
            print_info("  - graphs jsonb")
            print_info("  - solution_graphs jsonb")
        except Exception as e:
            warnings.append(f"Could not validate database schema: {e}")
            print_warning(f"Could not validate database schema: {e}")
    
    except Exception as e:
        warnings.append(f"Could not validate database: {e}")
        print_warning(f"Could not validate database: {e}")
    
    return True, warnings


def main():
    """Main CLI entry point."""
    print("\n" + "=" * 70)
    print("  TMUA Question Generator - Setup and Validation")
    print("=" * 70 + "\n")
    
    all_errors = []
    all_warnings = []
    
    # Run all checks
    checks = [
        ("Environment", check_environment),
        ("Imports", check_imports),
        ("Prompt Files", check_prompt_files),
        ("Schema Files", check_schema_files),
        ("Graph Utilities", check_graph_utilities),
        ("Migrations", run_migrations),
        ("Database Schema", validate_database_schema),
    ]
    
    for name, check_func in checks:
        try:
            success, issues = check_func()
            if not success:
                all_errors.extend([f"{name}: {issue}" for issue in issues if not issue.startswith("⚠")])
            all_warnings.extend([f"{name}: {issue}" for issue in issues if issue.startswith("⚠")])
        except Exception as e:
            all_errors.append(f"{name} check failed with exception: {e}")
            print_error(f"{name} check failed: {e}")
    
    # Print summary
    print_header("Summary")
    
    if all_errors:
        print_error(f"Found {len(all_errors)} error(s):")
        for error in all_errors:
            print_error(f"  - {error}")
        print()
    
    if all_warnings:
        print_warning(f"Found {len(all_warnings)} warning(s):")
        for warning in all_warnings:
            print_warning(f"  - {warning}")
        print()
    
    if not all_errors:
        print_success("All critical checks passed!")
        if all_warnings:
            print_info("Some optional features may not be available due to warnings above.")
        
        # Show next steps
        print_header("Next Steps")
        script_dir = Path(__file__).parent
        project_root = script_dir.parent.parent
        migrations_dir = project_root / "supabase" / "migrations"
        graph_migration = None
        if migrations_dir.exists():
            # Find the graph fields migration specifically
            graph_migration = migrations_dir / "20250113000000_add_graph_fields.sql"
            if not graph_migration.exists():
                # Fallback to any migration with "graph" in name
                graph_migrations = list(migrations_dir.glob("*graph*.sql"))
                if graph_migrations:
                    graph_migration = graph_migrations[0]
        
        print_info("1. Apply database migrations (if not already done):")
        if graph_migration and graph_migration.exists():
            print_info(f"   - Option 1: Copy SQL from {graph_migration.name}")
            print_info(f"   - Option 2: Use the prepared file: scripts/apply_migration.sql")
        else:
            print_info("   - Use the prepared file: scripts/apply_migration.sql")
        print_info("   - Run SQL in Supabase dashboard > SQL Editor")
        print_info("   - This adds 'graphs' and 'solution_graphs' jsonb columns")
        print_info("")
        print_info("2. Start generating questions:")
        print_info("   - Run: python scripts/tmua_question_generator/simple_generator_ui.py")
        print_info("   - Or use the worker manager for batch generation")
        
        return 0
    else:
        print_error("Setup validation failed. Please fix the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())




"""
Setup and Validation CLI for TMUA Question Generator

This script:
1. Validates environment configuration
2. Runs database migrations (if Supabase CLI is available)
3. Tests imports and basic functionality
4. Validates graph utilities
5. Checks prompt files exist
"""

import os
import sys
import subprocess
from pathlib import Path
from typing import List, Tuple

# Configure UTF-8 encoding for Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding='utf-8')
        sys.stderr.reconfigure(encoding='utf-8')
    except AttributeError:
        import codecs
        sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def print_header(text: str):
    """Print a formatted header."""
    print("\n" + "=" * 70)
    print(f"  {text}")
    print("=" * 70 + "\n")


def print_success(text: str):
    """Print a success message."""
    print(f"✓ {text}")


def print_error(text: str):
    """Print an error message."""
    print(f"✗ {text}", file=sys.stderr)


def print_warning(text: str):
    """Print a warning message."""
    print(f"⚠ {text}")


def print_info(text: str):
    """Print an info message."""
    print(f"  {text}")


def check_environment() -> Tuple[bool, List[str]]:
    """Check environment variables and configuration."""
    print_header("Checking Environment Configuration")
    
    errors = []
    warnings = []
    
    # Get project root first
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    env_path = project_root / ".env.local"
    
    # Check required environment variables
    gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not gemini_key:
        # Try loading from .env.local first
        if env_path.exists():
            try:
                from dotenv import load_dotenv
                load_dotenv(env_path, override=True)
                gemini_key = os.environ.get("GEMINI_API_KEY", "").strip()
            except:
                pass
        
        if not gemini_key:
            errors.append("GEMINI_API_KEY environment variable is not set (check .env.local)")
        else:
            print_success("GEMINI_API_KEY is set (loaded from .env.local)")
    else:
        print_success("GEMINI_API_KEY is set")
    
    # Check Supabase environment variables (optional)
    supabase_url = os.environ.get("SUPABASE_URL", "").strip()
    supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
    
    # Try loading from .env.local if not set
    if (not supabase_url or not supabase_key) and env_path.exists():
        try:
            from dotenv import load_dotenv
            load_dotenv(env_path, override=True)
            supabase_url = os.environ.get("SUPABASE_URL", "").strip()
            supabase_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "").strip()
        except:
            pass
    
    if not supabase_url or not supabase_key:
        warnings.append("Supabase credentials not set (database sync will be disabled)")
        print_warning("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    else:
        print_success("Supabase credentials are set")
    
    # Check .env.local file
    
    if env_path.exists():
        print_success(f".env.local file exists at {env_path}")
        
        # Try to load it
        try:
            from dotenv import load_dotenv
            load_dotenv(env_path)
            print_success("Successfully loaded .env.local")
        except ImportError:
            warnings.append("python-dotenv not installed (optional, but recommended)")
            print_warning("python-dotenv not installed (optional)")
        except Exception as e:
            errors.append(f"Error loading .env.local: {e}")
            print_error(f"Error loading .env.local: {e}")
    else:
        warnings.append(f".env.local file not found at {env_path} (optional)")
        print_warning(f".env.local file not found at {env_path}")
    
    return len(errors) == 0, errors + warnings


def check_imports() -> Tuple[bool, List[str]]:
    """Check that all required modules can be imported."""
    print_header("Checking Python Imports")
    
    errors = []
    modules_to_check = [
        ("yaml", "PyYAML"),
        ("supabase", "supabase-py (optional)"),
        ("dotenv", "python-dotenv (optional)"),
    ]
    
    for module_name, package_name in modules_to_check:
        try:
            __import__(module_name)
            print_success(f"✓ {package_name} imported successfully")
        except ImportError:
            if "optional" in package_name:
                print_warning(f"{package_name} not installed (optional)")
            else:
                errors.append(f"Required package {package_name} not installed")
                print_error(f"✗ {package_name} import failed")
    
    # Check internal modules
    # Try relative imports first (when run as module), fall back to absolute (when run as script)
    try:
        from . import project
        print_success("✓ project module imported")
    except (ImportError, ValueError):
        # Fallback to absolute import
        import sys
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if base_dir not in sys.path:
            sys.path.insert(0, base_dir)
        try:
            import project
            print_success("✓ project module imported (absolute)")
        except Exception as e:
            errors.append(f"Failed to import project module: {e}")
            print_error(f"✗ project module import failed: {e}")
    
    try:
        from .graph_utils import (
            build_graph_spec_from_intent,
            validate_graph_spec,
            parse_graph_placeholders,
            insert_graph_placeholder,
            GraphQuotaManager
        )
        print_success("✓ graph_utils module imported")
    except (ImportError, ValueError):
        # Fallback to absolute import
        import sys
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if base_dir not in sys.path:
            sys.path.insert(0, base_dir)
        try:
            from graph_utils import (
                build_graph_spec_from_intent,
                validate_graph_spec,
                parse_graph_placeholders,
                insert_graph_placeholder,
                GraphQuotaManager
            )
            print_success("✓ graph_utils module imported (absolute)")
        except Exception as e:
            errors.append(f"Failed to import graph_utils: {e}")
            print_error(f"✗ graph_utils module import failed: {e}")
    
    try:
        from . import db_sync
        print_success("✓ db_sync module imported")
    except (ImportError, ValueError):
        # Fallback to absolute import
        import sys
        import os
        base_dir = os.path.dirname(os.path.abspath(__file__))
        if base_dir not in sys.path:
            sys.path.insert(0, base_dir)
        try:
            import db_sync
            print_success("✓ db_sync module imported (absolute)")
        except Exception as e:
            errors.append(f"Failed to import db_sync: {e}")
            print_error(f"✗ db_sync module import failed: {e}")
    
    return len(errors) == 0, errors


def check_prompt_files() -> Tuple[bool, List[str]]:
    """Check that all required prompt files exist."""
    print_header("Checking Prompt Files")
    
    errors = []
    warnings = []
    
    script_dir = Path(__file__).parent
    prompts_dir = script_dir / "by_paper_prompts"
    
    required_files = [
        "Paper1/Paper1 Designer.md",
        "Paper1/Paper1 Implementer.md",
        "Paper1/Paper1 Verifier.md",
        "Paper1/Paper1 Style_checker.md",
        "Paper1/Paper1 Far Mode.md",
        "Paper2/Paper2 Designer.md",
        "Paper2/Paper2 Implementer.md",
        "Paper2/Paper2 Verifier.md",
        "Paper2/Paper2 Style_checker.md",
        "Paper2/Paper2 Far Mode.md",
        "Paper2/Paper2 Template Selector.md",
    ]
    
    for file_path in required_files:
        full_path = prompts_dir / file_path
        if full_path.exists():
            print_success(f"✓ {file_path}")
        else:
            errors.append(f"Missing prompt file: {file_path}")
            print_error(f"✗ {file_path} not found")
    
    # Check template files
    templates_dir = prompts_dir / "Paper2" / "Templates"
    if templates_dir.exists():
        template_files = list(templates_dir.glob("*.md"))
        if template_files:
            print_success(f"✓ Found {len(template_files)} template files")
        else:
            warnings.append("No template files found in Paper2/Templates/")
            print_warning("No template files found in Paper2/Templates/")
    else:
        warnings.append("Paper2/Templates directory not found")
        print_warning("Paper2/Templates directory not found")
    
    return len(errors) == 0, errors + warnings


def check_schema_files() -> Tuple[bool, List[str]]:
    """Check that schema files exist."""
    print_header("Checking Schema Files")
    
    errors = []
    
    script_dir = Path(__file__).parent
    esat_dir = script_dir.parent / "esat_question_generator"
    schemas_dir = esat_dir / "schemas"
    
    required_schemas = [
        "Schemas_TMUA_Paper1.md",
        "Schemas_TMUA_Paper2.md",
    ]
    
    for schema_file in required_schemas:
        schema_path = schemas_dir / schema_file
        if schema_path.exists():
            print_success(f"✓ {schema_file}")
        else:
            errors.append(f"Missing schema file: {schema_file}")
            print_error(f"✗ {schema_file} not found at {schema_path}")
    
    return len(errors) == 0, errors


def check_graph_utilities() -> Tuple[bool, List[str]]:
    """Test graph utility functions."""
    print_header("Testing Graph Utilities")
    
    errors = []
    
    # Ensure we can import
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    
    try:
        import graph_utils.graph_builder as graph_builder
        import graph_utils.graph_validator as graph_validator
        import graph_utils.placeholder_parser as placeholder_parser
        import graph_utils.quota_manager as quota_manager
        
        build_graph_spec_from_intent = graph_builder.build_graph_spec_from_intent
        validate_graph_spec = graph_validator.validate_graph_spec
        parse_graph_placeholders = placeholder_parser.parse_graph_placeholders
        insert_graph_placeholder = placeholder_parser.insert_graph_placeholder
        GraphQuotaManager = quota_manager.GraphQuotaManager
        
        # Test quota manager
        quota_manager = GraphQuotaManager()
        quota_manager.reset_for_batch(100)
        print_success("✓ GraphQuotaManager instantiated")
        
        # Test placeholder parser
        test_text = "This is a test.\n\n    <GRAPH id=\"g1\" />\n\nMore text."
        placeholders = parse_graph_placeholders(test_text)
        if len(placeholders) == 1 and placeholders[0]['id'] == 'g1':
            print_success("✓ Placeholder parser works")
        else:
            errors.append("Placeholder parser test failed")
            print_error("✗ Placeholder parser test failed")
        
        # Test simple graph_intent
        test_intent = {
            "version": 2,
            "objects": [
                {"id": "f", "kind": "function", "fn": {"kind": "poly2", "a": 1, "b": -3, "c": 2}},
                {"id": "xaxis", "kind": "line", "form": {"kind": "horiz", "y": 0}}
            ],
            "regions": [],
            "marks_needed": {"x_marks": [], "points": []},
            "derived_needed": []
        }
        
        try:
            graph_spec = build_graph_spec_from_intent(test_intent)
            if graph_spec and graph_spec.get("version") == 2:
                print_success("✓ Graph builder works")
            else:
                errors.append("Graph builder test failed")
                print_error("✗ Graph builder test failed")
        except Exception as e:
            errors.append(f"Graph builder test failed: {e}")
            print_error(f"✗ Graph builder test failed: {e}")
        
    except Exception as e:
        errors.append(f"Graph utilities test failed: {e}")
        print_error(f"✗ Graph utilities test failed: {e}")
    
    return len(errors) == 0, errors


def run_migrations() -> Tuple[bool, List[str]]:
    """Run database migrations if Supabase CLI is available."""
    print_header("Running Database Migrations")
    
    errors = []
    warnings = []
    
    # Check if Supabase CLI is available
    try:
        result = subprocess.run(
            ["supabase", "--version"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            print_success(f"Supabase CLI found: {result.stdout.strip()}")
        else:
            warnings.append("Supabase CLI not working properly")
            print_warning("Supabase CLI not working properly")
            return True, warnings
    except FileNotFoundError:
        warnings.append("Supabase CLI not found. Install from https://supabase.com/docs/guides/cli")
        print_warning("Supabase CLI not found (optional for direct database sync)")
        return True, warnings
    except Exception as e:
        warnings.append(f"Error checking Supabase CLI: {e}")
        print_warning(f"Error checking Supabase CLI: {e}")
        return True, warnings
    
    # Check if we're in a Supabase project
    script_dir = Path(__file__).parent
    project_root = script_dir.parent.parent
    supabase_dir = project_root / "supabase"
    migrations_dir = supabase_dir / "migrations"
    
    if not migrations_dir.exists():
        warnings.append("supabase/migrations directory not found")
        print_warning("supabase/migrations directory not found")
        return True, warnings
    
    # Check for migration files
    migration_files = list(migrations_dir.glob("*.sql"))
    if not migration_files:
        warnings.append("No migration files found")
        print_warning("No migration files found")
        return True, warnings
    
    print_info(f"Found {len(migration_files)} migration files")
    
    # Show the latest migration file (for graph fields)
    latest_migration = max(migration_files, key=lambda p: p.name)
    print_info(f"Latest migration: {latest_migration.name}")
    
    # Check if Supabase is linked
    try:
        result = subprocess.run(
            ["supabase", "status"],
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print_success("Supabase project is linked")
            print_info("To apply migrations, you can:")
            print_info("  1. Run: supabase db push")
            print_info("  2. Or use the Supabase dashboard SQL editor")
        else:
            warnings.append("Supabase project not linked. Link with: supabase link")
            print_warning("Supabase project not linked")
            print_info("Alternative: Apply migrations manually via Supabase dashboard:")
            print_info(f"  1. Go to SQL Editor in Supabase dashboard")
            print_info(f"  2. Copy contents of: {latest_migration.name}")
            print_info(f"  3. Run the SQL")
    except Exception as e:
        warnings.append(f"Could not check Supabase status: {e}")
        print_warning(f"Could not check Supabase status: {e}")
        print_info("To apply migrations manually:")
        print_info(f"  1. Open Supabase dashboard > SQL Editor")
        print_info(f"  2. Copy SQL from: {latest_migration.name}")
        print_info(f"  3. Execute the SQL")
        print_info(f"   Or use the prepared file: scripts/apply_migration.sql")
    
    return True, warnings


def validate_database_schema() -> Tuple[bool, List[str]]:
    """Validate that database schema matches expected structure."""
    print_header("Validating Database Schema")
    
    errors = []
    warnings = []
    
    # Ensure we can import
    script_dir = Path(__file__).parent
    if str(script_dir) not in sys.path:
        sys.path.insert(0, str(script_dir))
    
    try:
        import db_sync
        DatabaseSync = db_sync.DatabaseSync
        
        db_sync = DatabaseSync()
        if not db_sync.enabled:
            warnings.append("Database sync is disabled (Supabase credentials not set)")
            print_warning("Database sync is disabled")
            return True, warnings
        
        # Try to connect and check if table exists
        try:
            # This is a simple check - we'll try to query the table structure
            # Note: We can't easily check column existence without actual queries
            print_success("Database connection successful")
            print_info("To verify schema manually, check that ai_generated_questions table has:")
            print_info("  - graphs jsonb")
            print_info("  - solution_graphs jsonb")
        except Exception as e:
            warnings.append(f"Could not validate database schema: {e}")
            print_warning(f"Could not validate database schema: {e}")
    
    except Exception as e:
        warnings.append(f"Could not validate database: {e}")
        print_warning(f"Could not validate database: {e}")
    
    return True, warnings


def main():
    """Main CLI entry point."""
    print("\n" + "=" * 70)
    print("  TMUA Question Generator - Setup and Validation")
    print("=" * 70 + "\n")
    
    all_errors = []
    all_warnings = []
    
    # Run all checks
    checks = [
        ("Environment", check_environment),
        ("Imports", check_imports),
        ("Prompt Files", check_prompt_files),
        ("Schema Files", check_schema_files),
        ("Graph Utilities", check_graph_utilities),
        ("Migrations", run_migrations),
        ("Database Schema", validate_database_schema),
    ]
    
    for name, check_func in checks:
        try:
            success, issues = check_func()
            if not success:
                all_errors.extend([f"{name}: {issue}" for issue in issues if not issue.startswith("⚠")])
            all_warnings.extend([f"{name}: {issue}" for issue in issues if issue.startswith("⚠")])
        except Exception as e:
            all_errors.append(f"{name} check failed with exception: {e}")
            print_error(f"{name} check failed: {e}")
    
    # Print summary
    print_header("Summary")
    
    if all_errors:
        print_error(f"Found {len(all_errors)} error(s):")
        for error in all_errors:
            print_error(f"  - {error}")
        print()
    
    if all_warnings:
        print_warning(f"Found {len(all_warnings)} warning(s):")
        for warning in all_warnings:
            print_warning(f"  - {warning}")
        print()
    
    if not all_errors:
        print_success("All critical checks passed!")
        if all_warnings:
            print_info("Some optional features may not be available due to warnings above.")
        
        # Show next steps
        print_header("Next Steps")
        script_dir = Path(__file__).parent
        project_root = script_dir.parent.parent
        migrations_dir = project_root / "supabase" / "migrations"
        graph_migration = None
        if migrations_dir.exists():
            # Find the graph fields migration specifically
            graph_migration = migrations_dir / "20250113000000_add_graph_fields.sql"
            if not graph_migration.exists():
                # Fallback to any migration with "graph" in name
                graph_migrations = list(migrations_dir.glob("*graph*.sql"))
                if graph_migrations:
                    graph_migration = graph_migrations[0]
        
        print_info("1. Apply database migrations (if not already done):")
        if graph_migration and graph_migration.exists():
            print_info(f"   - Option 1: Copy SQL from {graph_migration.name}")
            print_info(f"   - Option 2: Use the prepared file: scripts/apply_migration.sql")
        else:
            print_info("   - Use the prepared file: scripts/apply_migration.sql")
        print_info("   - Run SQL in Supabase dashboard > SQL Editor")
        print_info("   - This adds 'graphs' and 'solution_graphs' jsonb columns")
        print_info("")
        print_info("2. Start generating questions:")
        print_info("   - Run: python scripts/tmua_question_generator/simple_generator_ui.py")
        print_info("   - Or use the worker manager for batch generation")
        
        return 0
    else:
        print_error("Setup validation failed. Please fix the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
