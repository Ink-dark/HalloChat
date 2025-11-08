@echo off
REM ========== 步骤1：进入脚本所在目录（确保是 Git 仓库根目录） ==========
cd /d %~dp0  &:: 自动切换到双击脚本时所在的文件夹

REM ========== 步骤2：获取用户提交的注释（无输入则默认"update"） ==========
set /p commitMsg=请输入提交信息（直接回车则默认使用「update」）:

REM 如果用户没输入内容，就把提交信息设为默认值"update"
if "%commitMsg%"=="" (
    set commitMsg=update
)

REM ========== 步骤3：执行Git提交流程 ==========
git add .          
REM 添加当前目录下所有修改（新增/删除/修改的文件）
git commit -m "%commitMsg%"  
REM 提交到本地仓库，附带提交信息
git push  
REM 推送至远程仓库的 main 分支（GitHub 新仓库默认分支是 main，旧仓库可能是 master，按需替换）

REM ========== 步骤4：提示完成 ==========
echo  提交完成！
pause  REM 按任意键退出窗口（防止窗口一闪而过）