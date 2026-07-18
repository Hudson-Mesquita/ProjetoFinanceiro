from __future__ import annotations

import py_compile
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FRONTEND = ROOT / "frontend"

REQUIRED = [
    ROOT / "README.md",
    ROOT / "requirements.txt",
    FRONTEND / "index.html",
    FRONTEND / "app.js",
    FRONTEND / "transacoes.html",
    FRONTEND / "transacoes.js",
    FRONTEND / "metas.html",
    FRONTEND / "metas.js",
    FRONTEND / "style.css",
    FRONTEND / "assets" / "css" / "icons.css",
    FRONTEND / "assets" / "js" / "icons.js",
    FRONTEND / "assets" / "vendor" / "chart.umd.min.js",
]

FORBIDDEN_FRONTEND_REFERENCES = [
    "fonts.googleapis.com",
    "fonts.gstatic.com",
    "cdnjs.cloudflare.com",
    "cdn.jsdelivr.net",
    "unpkg.com",
]


def fail(message: str) -> None:
    print(f"[ERRO] {message}")
    raise SystemExit(1)


def check_required_files() -> None:
    missing = [
        str(path.relative_to(ROOT))
        for path in REQUIRED
        if not path.exists()
    ]

    if missing:
        fail(
            "Arquivos obrigatórios ausentes:\n- "
            + "\n- ".join(missing)
        )

    print("[OK] Arquivos obrigatórios")


def check_external_frontend_references() -> None:
    problems: list[str] = []

    for path in FRONTEND.rglob("*"):
        if (
            not path.is_file()
            or path.suffix.lower()
            not in {".html", ".css", ".js"}
        ):
            continue

        text = path.read_text(
            encoding="utf-8",
            errors="replace",
        )

        for reference in FORBIDDEN_FRONTEND_REFERENCES:
            if reference in text:
                problems.append(
                    f"{path.relative_to(ROOT)}: {reference}"
                )

    if problems:
        fail(
            "Referências externas encontradas:\n- "
            + "\n- ".join(problems)
        )

    print("[OK] Frontend sem dependências de CDN")


def check_javascript() -> None:
    node = shutil.which("node")

    if not node:
        print(
            "[AVISO] Node.js não encontrado; "
            "sintaxe JavaScript não verificada."
        )
        return

    javascript_files = [
        FRONTEND / "app.js",
        FRONTEND / "transacoes.js",
        FRONTEND / "metas.js",
        FRONTEND / "assets" / "js" / "icons.js",
    ]

    for path in javascript_files:
        result = subprocess.run(
            [node, "--check", str(path)],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            fail(
                f"JavaScript inválido em "
                f"{path.relative_to(ROOT)}:\n"
                f"{result.stderr}"
            )

    print("[OK] Sintaxe JavaScript")


def check_python() -> None:
    ignored = {
        ".venv",
        "venv",
        "__pycache__",
        "build",
        "dist",
    }

    python_files = [
        path
        for path in ROOT.rglob("*.py")
        if not any(part in ignored for part in path.parts)
    ]

    for path in python_files:
        try:
            py_compile.compile(
                str(path),
                doraise=True,
            )
        except py_compile.PyCompileError as error:
            fail(
                f"Python inválido em "
                f"{path.relative_to(ROOT)}:\n{error}"
            )

    print("[OK] Sintaxe Python")


def main() -> None:
    print("Verificando FinDash V1.0...\n")

    check_required_files()
    check_external_frontend_references()
    check_javascript()
    check_python()

    print("\nFinDash V1.0 passou nas verificações estáticas.")


if __name__ == "__main__":
    main()
