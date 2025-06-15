@echo off
rem 墨染柒DarkSeven-一键启动命令
rem 启动MongoDB服务
 echo ================================
 echo 正在启动MongoDB服务...
 echo ================================
 net start MongoDB
 if %errorlevel% equ 0 (
     echo MongoDB服务启动成功！
 ) else (
     echo MongoDB服务可能已启动或启动失败，请检查服务状态。
 )

 rem 等待MongoDB初始化（5秒）
 echo ================================
 echo 等待MongoDB初始化...
 echo ================================
 timeout /t 5 /nobreak >nul

 rem 启动服务器
 echo ================================
 echo 正在启动HalloChat服务器...
 echo ================================
 npm run dev

 rem 防止窗口自动关闭
 pause