pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "world-ingredient-codex"

include(
    ":app",
    ":core:common",
    ":core:model",
    ":core:database",
    ":core:navigation",
    ":core:ui",
    ":feature:browse",
    ":feature:search",
    ":feature:detail",
    ":feature:bookmarks",
    ":feature:import",
)
