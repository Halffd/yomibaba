@echo off
echo Syncing repository: %%i

REM Check if the repository exists
if not exist ".git" (
    echo Repository does not exist, initializing...
    git init      REM Initialize the repository
)

git stash      REM Stash local changes (if any)

REM Check if there are conflicts
git diff --name-only --diff-filter=U > nul
if %errorlevel% equ 0 (
    echo Conflicts found, creating new branch...
    git stash pop  REM Unapply the stashed changes
    git checkout -b new_branch_name  REM Create and switch to a new branch
) else (
    git pull      REM Perform the pull operation
    git stash apply  REM Apply the stashed changes (if any)
)

echo.

echo Sync completed.