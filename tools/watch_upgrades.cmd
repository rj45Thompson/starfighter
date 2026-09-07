@echo off
REM watch_upgrades.cmd - refresh GAME_UPGRADES.md on a schedule, with no Claude session involved.
REM
REM The in-session cron that drives improvement passes dies when the session does. This does not.
REM It cannot write code - it measures and reports - but it means the report on disk is never
REM silently stale, and a pass that STOPS measuring shows up as a failure rather than as yesterday's
REM number quietly persisting.
REM
REM Run once:
REM     tools\watch_upgrades.cmd
REM
REM Install as a Windows scheduled task, every 2 hours (change /RI to taste):
REM     schtasks /Create /TN "StarFighter upgrades" /TR "D:\code\starfighter\tools\watch_upgrades.cmd" ^
REM              /SC HOURLY /MO 2 /F
REM Remove it:
REM     schtasks /Delete /TN "StarFighter upgrades" /F
REM
REM Exit code is the pass's own: non-zero means an input was missing and the report was NOT rewritten.

setlocal
cd /d "%~dp0.."

echo [%date% %time%] Star Fighter upgrade pass
py -3.13 tools\upgrade_pass.py
set PASS=%errorlevel%

REM the guards that catch a whole class of regression rather than one bug
node tools\cmd_shadow.js
set SHADOW=%errorlevel%
node tools\cfg_dupes.js
set DUPES=%errorlevel%
node tools\cfg_undef.js
set UNDEF=%errorlevel%
node tools\genre_selfcheck.js
set GENRE=%errorlevel%
node tools\save_symmetry.js
set SYM=%errorlevel%
node tools\order_in_table.js
set ORDER=%errorlevel%
node tools\bareargs.js
set BARE=%errorlevel%
node tools\module_selftests.js
set MODS=%errorlevel%

echo.
echo   upgrade_pass    exit %PASS%   (non-zero = an input was missing, report NOT rewritten)
echo   cmd_shadow      exit %SHADOW% (non-zero = a terminal command can never run)
echo   cfg_dupes       exit %DUPES%  (non-zero = a CFG key is defined twice, the later one silently wins)
echo   cfg_undef       exit %UNDEF%  (non-zero = a CFG.key is READ but never defined - undefined -^> NaN)
echo   genre_selfcheck exit %GENRE%  (non-zero = a grep-proven "no" genre grade no longer matches the source)
echo   save_symmetry   exit %SYM%   (non-zero = a player field is SAVED but never RESTORED - silent reset on reload)
echo   order_in_table  exit %ORDER% (non-zero = a *_ORDER key has no table entry - TABLE[key] undefined -^> crash on use)
echo   bareargs        exit %BARE%  (non-zero = a matcher with an empty-defaulted a[N] arg - bare command hits the FIRST item)
echo   module_selftests exit %MODS% (non-zero = a node-safe module self-test failed: conquest/power_panel/textquests/kripke/sober/tom/centroid/item_variance)

if not "%PASS%"=="0" exit /b %PASS%
if not "%SHADOW%"=="0" exit /b %SHADOW%
if not "%DUPES%"=="0" exit /b %DUPES%
if not "%UNDEF%"=="0" exit /b %UNDEF%
if not "%GENRE%"=="0" exit /b %GENRE%
if not "%SYM%"=="0" exit /b %SYM%
if not "%ORDER%"=="0" exit /b %ORDER%
if not "%BARE%"=="0" exit /b %BARE%
if not "%MODS%"=="0" exit /b %MODS%
echo   all clear
exit /b 0
