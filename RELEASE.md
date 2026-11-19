# Release process

How to publish a new Purplecoins release. Everything is driven by the `./run`
script and the `.version` file — no manual tagging or GitHub UI steps.

## Prerequisites

- `gh` CLI installed and authenticated (`gh auth status`)
- Android SDK present (`ANDROID_HOME`, or `~/Library/Android/sdk` on macOS)
- `adb`, `emulator` on PATH for the optional AVD check
- Working tree contains the changes to release

## Steps

1. **Bump `.version`** — set it to today's date in `YYYY.MM.DD` format
   (e.g. `2026.11.19`). The file may end without a trailing newline. The version
   drives both the APK filename (`com.purple.coins_<version>.apk`) and the git
   tag (`v<version>`). Then propagate it into `app.json` / `package.json`:

    ```sh
    ./run apply
    ```

    `./run build` refuses to run while `.version` and `app.json` disagree.

2. **Verify** — run the full gate before building:

    ```sh
    ./run format
    ./run test
    ```

    Tests enforce 100% coverage; the suite ends with ESLint. Optionally run the
    end-to-end AVD check (fresh install empty-states + real backup restore):

    ```sh
    ./run avd
    ./run avd-backup-test <backup-file-from-avd-Downloads>
    ```

3. **Build** the signed release APK:

    ```sh
    ./run build
    ```

    Output: `android/app/build/outputs/apk/release/com.purple.coins_<version>.apk`.
    The build does a clean Expo prebuild, then a Gradle release build, then
    renames `app-release.apk` to the versioned name — the release step looks for
    exactly that path.

4. **Commit** all changes (including the `.version` bump). The tag created in
   the next step points at HEAD, so the commit must land first.

5. **Release**:

    ```sh
    ./run release
    ```

    This tags HEAD as `v<version>`, pushes the tag to `origin`, and creates the
    GitHub release with the versioned APK attached. If the tag/release already
    exists it re-uploads the APK (`--clobber`) — safe to re-run after a rebuild.

## What happens next

Publishing the release triggers `.github/workflows/deploy.yml`, which rebuilds
the `gh-pages/` download site (it lists the latest release APK via the GitHub
API) and deploys it to GitHub Pages.

## Notes for agents

- Re-running `./run release` on an existing tag updates the release asset, it
  does not move the tag — force-update the tag manually if HEAD moved.
- Keep `.version` date-style; `run` also accepts `MAJOR.MINOR` or
  `MAJOR.MINOR.PATCH` and converts it to an integer `versionCode`.
- Never commit the APK or `logs/` — both are gitignored.
