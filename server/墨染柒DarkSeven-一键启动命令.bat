@echo off
rem 
rem 
 echo ================================
 echo 正在启动MongoDB服务...
 echo ================================
 net start MongoDB
 if %errorlevel% equ 0 (
     echo MongoDB服务启动成功！
 ) else (
     echo MongoDB服务可能已启动或启动失败，请检查服务状态。
 )

 rem 
 echo ================================
 echo 等待MongoDB初始化...
 echo ================================
 timeout /t 5 /nobreak >nul

 rem 
 echo ================================
 echo 正在启动HalloChat服务器...
 echo ================================
 npm run dev

 rem 
 pause