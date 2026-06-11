@echo off
echo 正在更新 GitHub hosts...
>>C:\Windows\System32\drivers\etc\hosts (
echo.
echo # GitHub Hosts (2026-06-10)
echo 20.205.243.166 github.com
echo 20.205.243.165 codeload.github.com
echo 185.199.109.133 raw.githubusercontent.com
echo 185.199.111.215 github.githubassets.com
echo 185.199.108.133 avatars.githubusercontent.com
)
echo 完成！hosts 已更新。
ipconfig /flushdns
echo DNS 缓存已刷新。
pause
