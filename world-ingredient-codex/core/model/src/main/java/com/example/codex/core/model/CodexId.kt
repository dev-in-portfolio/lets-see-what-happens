package com.example.codex.core.model

data class CodexId(
    val raw: String,
) {
    val segments: List<Int> = raw.split(".").map { segment ->
        segment.toIntOrNull() ?: error("Invalid codex id segment in $raw")
    }

    val level: CodexLevel = CodexLevel.fromCodexId(raw)

    val parentRaw: String? = segments
        .dropLast(1)
        .takeIf { it.isNotEmpty() }
        ?.joinToString(".")
}
