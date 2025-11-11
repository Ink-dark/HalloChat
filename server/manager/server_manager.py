#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
HalloChat 服务器管理控制台
用于启动、停止和监控HalloChat Node.js服务器

注意：
1. MongoDB 全程使用Homebrew管理MongoDB社区版
2. 代码中部分注释由AI辅助生成，以提高可读性和维护性
"""

import os
import sys
import time
import socket
import subprocess
import platform
import tkinter as tk
from tkinter import ttk, messagebox, scrolledtext
from threading import Thread, Lock
import re


class ServerManager:
    def __init__(self, root):
        self.root = root
        self.root.title("HalloChat 服务器管理控制台")
        self.root.geometry("1108x918")
        self.root.resizable(True, True)
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
        # 设置软件图标为服务端控制台根目录的HalloChat.ico
        try:
            icon_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'HalloChat.ico')
            self.root.iconbitmap(icon_path)
        except Exception as e:
            print(f"设置图标失败: {str(e)}")  # 静默失败，不影响主要功能
        
        # 设置中文字体支持
        self.configure_styles()
        
        # 服务器进程和状态
        self.server_process = None
        self.server_running = False
        self.server_lock = Lock()
        self.server_port = 7932  # 默认端口，从index.js中获取
        self.server_host = "0.0.0.0"
        
        # MongoDB服务状态 - 全程使用Homebrew管理MongoDB社区版
        self.mongodb_process = None
        self.mongodb_running = False
        self.mongodb_lock = Lock()
        self.mongodb_port = 27017  # 默认MongoDB端口
        
        # 显示启动提示
        self.show_startup_notice()
    
    def show_startup_notice(self):
        """显示启动时的提示信息，说明MongoDB使用方式和AI注释"""
        # 创建提示对话框
        notice_window = tk.Toplevel(self.root)
        notice_window.title("使用须知")
        notice_window.geometry("500x200")
        notice_window.resizable(False, False)
        notice_window.transient(self.root)
        notice_window.grab_set()  # 模态窗口
        
        # 设置样式
        style = ttk.Style()
        if sys.platform == 'darwin':  # macOS
            style.configure("Notice.TLabel", font=('Helvetica', 11))
            style.configure("Notice.TButton", font=('Helvetica', 10))
        else:
            style.configure("Notice.TLabel", font=('SimHei', 11))
            style.configure("Notice.TButton", font=('SimHei', 10))
        
        # 创建内容框架
        content_frame = ttk.Frame(notice_window, padding=20)
        content_frame.pack(fill=tk.BOTH, expand=True)
        
        # 添加提示文本
        notice_text = (
            "使用须知:\n"\
            "本软件为测试版本 有些许bug\n"\
            "代码中部分注释由AI辅助生成，以提高可读性"
        )
        
        notice_label = ttk.Label(content_frame, text=notice_text, style="Notice.TLabel", justify=tk.LEFT)
        notice_label.pack(fill=tk.BOTH, expand=True, pady=(0, 20))
        
        # 创建按钮框架
        button_frame = ttk.Frame(content_frame)
        button_frame.pack(fill=tk.X, side=tk.BOTTOM)
        
        # 添加允许按钮
        def on_allow():
            notice_window.destroy()
            # 继续初始化UI
            self.create_widgets()
            # 启动状态检查线程
            self.status_thread = Thread(target=self.check_server_status, daemon=True)
            self.status_thread.start()
        
        # 添加拒绝按钮
        def on_deny():
            notice_window.destroy()
            self.root.destroy()
        
        # 放置按钮
        allow_button = ttk.Button(button_frame, text="允许", command=on_allow, style="Notice.TButton", width=15)
        allow_button.pack(side=tk.RIGHT, padx=(5, 10))
        
        deny_button = ttk.Button(button_frame, text="拒绝", command=on_deny, style="Notice.TButton", width=15)
        deny_button.pack(side=tk.RIGHT, padx=5)
    
    def configure_styles(self):
        """配置UI样式"""
        style = ttk.Style()
        if sys.platform == 'darwin':  # macOS
            style.configure("TButton", font=('Helvetica', 12))
            style.configure("TLabel", font=('Helvetica', 12))
            style.configure("Status.TLabel", font=('Helvetica', 12, 'bold'))
        else:
            style.configure("TButton", font=('SimHei', 12))
            style.configure("TLabel", font=('SimHei', 12))
            style.configure("Status.TLabel", font=('SimHei', 12, 'bold'))
    
    def create_widgets(self):
        """创建GUI组件"""
        # 创建主框架
        main_frame = ttk.Frame(self.root, padding="20")
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # 状态显示区域
        status_frame = ttk.LabelFrame(main_frame, text="服务状态", padding="10")
        status_frame.pack(fill=tk.X, pady=(0, 20))
        
        # 服务器状态标签
        self.status_var = tk.StringVar(value="未启动")
        self.status_color_var = tk.StringVar(value="red")
        
        status_label = ttk.Label(status_frame, text="服务器状态:", width=15)
        status_label.pack(side=tk.LEFT, padx=(0, 10))
        
        status_value = ttk.Label(
            status_frame, 
            textvariable=self.status_var, 
            style="Status.TLabel"
        )
        status_value.pack(side=tk.LEFT, padx=5)
        
        # MongoDB状态标签
        self.mongodb_status_var = tk.StringVar(value="未启动")
        mongodb_status_label = ttk.Label(status_frame, text="MongoDB状态:", width=15)
        mongodb_status_label.pack(side=tk.LEFT, padx=(20, 10))
        
        mongodb_status_value = ttk.Label(
            status_frame, 
            textvariable=self.mongodb_status_var, 
            style="Status.TLabel"
        )
        mongodb_status_value.pack(side=tk.LEFT, padx=5)
        
        # IP和端口显示
        self.ip_var = tk.StringVar(value="未知")
        self.port_var = tk.StringVar(value=str(self.server_port))
        
        ip_label = ttk.Label(status_frame, text="服务器IP:", width=15)
        ip_label.pack(side=tk.LEFT, padx=(20, 10))
        
        ip_value = ttk.Label(status_frame, textvariable=self.ip_var)
        ip_value.pack(side=tk.LEFT, padx=5)
        
        # MongoDB控制按钮区域
        mongodb_frame = ttk.Frame(main_frame, padding="10")
        mongodb_frame.pack(fill=tk.X, pady=(0, 20))
        
        # 下载MongoDB按钮
        self.download_mongodb_button = ttk.Button(
            mongodb_frame, 
            text="下载MongoDB", 
            command=self.download_mongodb,
            width=15
        )
        self.download_mongodb_button.pack(side=tk.LEFT, padx=10)
        
        # 启动MongoDB按钮
        self.start_mongodb_button = ttk.Button(
            mongodb_frame, 
            text="启动MongoDB", 
            command=self.start_mongodb,
            width=15
        )
        self.start_mongodb_button.pack(side=tk.LEFT, padx=10)
        
        # 停止MongoDB按钮
        self.stop_mongodb_button = ttk.Button(
            mongodb_frame, 
            text="停止MongoDB", 
            command=self.stop_mongodb,
            width=15,
            state=tk.DISABLED
        )
        self.stop_mongodb_button.pack(side=tk.LEFT, padx=10)
        
        # 控制按钮区域
        control_frame = ttk.Frame(main_frame, padding="10")
        control_frame.pack(fill=tk.X, pady=(0, 20))
        
        # 进度条区域 - 用于显示依赖安装进度
        self.progress_frame = ttk.LabelFrame(main_frame, text="安装进度", padding="10")
        self.progress_frame.pack(fill=tk.X, pady=(0, 20))
        self.progress_frame.pack_forget()  # 初始隐藏
        
        # 进度条
        self.progress_var = tk.DoubleVar()
        self.progress_bar = ttk.Progressbar(
            self.progress_frame,
            variable=self.progress_var,
            maximum=100,
            length=0,  # 自适应长度
            mode='determinate'
        )
        self.progress_bar.pack(fill=tk.X, pady=(0, 10))
        
        # 进度文本
        self.progress_text_var = tk.StringVar(value="准备安装依赖...")
        self.progress_text = ttk.Label(
            self.progress_frame,
            textvariable=self.progress_text_var
        )
        self.progress_text.pack(anchor=tk.W)
        
        # 安装依赖按钮
        self.install_deps_button = ttk.Button(
            control_frame, 
            text="安装依赖", 
            command=self.install_dependencies,
            width=15
        )
        self.install_deps_button.pack(side=tk.LEFT, padx=10)
        
        # 启动按钮
        self.start_button = ttk.Button(
            control_frame, 
            text="启动服务器", 
            command=self.start_server,
            width=20
        )
        self.start_button.pack(side=tk.LEFT, padx=10)
        
        # 停止按钮
        self.stop_button = ttk.Button(
            control_frame, 
            text="停止服务器", 
            command=self.stop_server,
            width=20,
            state=tk.DISABLED
        )
        self.stop_button.pack(side=tk.LEFT, padx=10)
        
        # 重启按钮
        self.restart_button = ttk.Button(
            control_frame, 
            text="重启服务器", 
            command=self.restart_server,
            width=20,
            state=tk.DISABLED
        )
        self.restart_button.pack(side=tk.LEFT, padx=10)
        
        # 刷新状态按钮
        self.refresh_button = ttk.Button(
            control_frame, 
            text="刷新状态", 
            command=self.update_status,
            width=15
        )
        self.refresh_button.pack(side=tk.LEFT, padx=10)
        
        # 日志显示区域
        log_frame = ttk.LabelFrame(main_frame, text="服务器日志", padding="10")
        log_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 20))
        
        self.log_text = scrolledtext.ScrolledText(
            log_frame, 
            wrap=tk.WORD,
            font=("Consolas", 10) if sys.platform == 'darwin' else ("SimHei", 10)
        )
        self.log_text.pack(fill=tk.BOTH, expand=True)
        
        # 系统信息区域
        info_frame = ttk.LabelFrame(main_frame, text="系统信息", padding="10")
        info_frame.pack(fill=tk.X)
        
        # 系统信息
        self.system_var = tk.StringVar(value="")
        self.system_version_var = tk.StringVar(value="")
        self.device_var = tk.StringVar(value="")
        self.server_path_var = tk.StringVar(value="")
        
        # 获取并设置系统信息
        self.update_system_info()
        
        # 显示系统信息
        system_label = ttk.Label(info_frame, text="系统:")
        system_label.pack(anchor=tk.W, pady=(0, 5))
        system_value = ttk.Label(info_frame, textvariable=self.system_var)
        system_value.pack(anchor=tk.W, pady=(0, 5))
        
        system_version_label = ttk.Label(info_frame, text="系统版本:")
        system_version_label.pack(anchor=tk.W, pady=(0, 5))
        system_version_value = ttk.Label(info_frame, textvariable=self.system_version_var)
        system_version_value.pack(anchor=tk.W, pady=(0, 5))
        
        device_label = ttk.Label(info_frame, text="设备:")
        device_label.pack(anchor=tk.W, pady=(0, 5))
        device_value = ttk.Label(info_frame, textvariable=self.device_var)
        device_value.pack(anchor=tk.W, pady=(0, 5))
        
        # 服务器路径
        path_label = ttk.Label(info_frame, text="服务器路径:")
        path_label.pack(anchor=tk.W, pady=(0, 5))
        path_value = ttk.Label(info_frame, textvariable=self.server_path_var)
        path_value.pack(anchor=tk.W)
    
    def start_server(self):
        """启动Node.js服务器"""
        with self.server_lock:
            if self.server_running:
                messagebox.showinfo("提示", "服务器已经在运行中")
                return
            
            try:
                # 检查MongoDB是否正在运行
                if not self.is_mongodb_running():
                    self.log("检测到MongoDB未运行，正在尝试启动...")
                    if not self.start_mongodb():
                        messagebox.showerror("错误", "MongoDB启动失败，请先手动启动MongoDB服务")
                        return
                
                # 检查端口是否被占用
                if self.is_port_in_use(self.server_port):
                    messagebox.showerror("错误", f"端口 {self.server_port} 已被占用，请检查是否有其他进程占用该端口")
                    return
                
                # 检查依赖是否已安装
                current_dir = os.path.dirname(os.path.abspath(__file__))
                if not os.path.exists(os.path.join(current_dir, 'node_modules', 'express')):
                    self.log("检测到依赖未安装，正在尝试安装...")
                    if not self._install_dependencies_silent():
                        messagebox.showerror("错误", "依赖安装失败，请点击'安装依赖'按钮手动安装依赖")
                        return
                
                self.log("正在启动服务器...")
                
                # 启动Node.js服务器
                # 使用npm start命令启动服务器，确保在server目录下执行
                # 尝试找到npm的完整路径
                npm_path = "npm"
                if sys.platform == 'win32':
                    # 在Windows上尝试找到npm.cmd或npm.bat
                    try:
                        # 尝试从环境变量PATH中找到npm
                        for path in os.environ["PATH"].split(os.pathsep):
                            npm_candidate = os.path.join(path, "npm.cmd")
                            if os.path.exists(npm_candidate):
                                npm_path = npm_candidate
                                break
                    except:
                        pass  # 如果找不到，就使用默认的npm
                
                self.server_process = subprocess.Popen(
                    [npm_path, "start"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding='utf-8',  # 明确指定UTF-8编码
                    cwd=current_dir,
                    shell=False if sys.platform != 'win32' else True
                )
                
                # 启动日志读取线程
                self.log_thread = Thread(target=self.read_server_logs, daemon=True)
                self.log_thread.start()
                
                # 更新UI状态
                self.server_running = True
                self.update_ui_state()
                
                self.log("服务器启动命令已发送")
                
            except Exception as e:
                self.log(f"启动服务器失败: {str(e)}")
                messagebox.showerror("错误", f"启动服务器失败: {str(e)}")
    
    def install_dependencies(self):
        """安装Node.js依赖，带进度条显示"""
        import re
        
        def update_progress_bar(progress, text):
            """更新进度条和文本"""
            # 在主线程中更新UI
            def update():
                self.progress_var.set(progress)
                self.progress_text_var.set(text)
                self.root.update_idletasks()  # 立即刷新UI
            
            if self.root.winfo_exists():
                self.root.after(0, update)
        
        try:
            self.log("开始安装依赖...")
            
            # 显示进度条区域
            if self.root.winfo_exists():
                self.root.after(0, lambda: self.progress_frame.pack(fill=tk.X, pady=(0, 20)))
                self.root.update_idletasks()
            
            # 初始化进度
            update_progress_bar(0, "准备安装...")
            
            # 禁用按钮防止重复点击
            self.install_deps_button.config(state=tk.DISABLED)
            
            # 运行npm install命令
            current_dir = os.path.dirname(os.path.abspath(__file__))
            
            # 尝试找到npm的完整路径
            npm_path = "npm"
            if sys.platform == 'win32':
                # 在Windows上尝试找到npm.cmd或npm.bat
                try:
                    # 尝试从环境变量PATH中找到npm
                    for path in os.environ["PATH"].split(os.pathsep):
                        npm_candidate = os.path.join(path, "npm.cmd")
                        if os.path.exists(npm_candidate):
                            npm_path = npm_candidate
                            break
                except:
                    pass  # 如果找不到，就使用默认的npm
            
            # 使用--progress参数启用进度输出
            try:
                install_process = subprocess.Popen(
                    [npm_path, "install", "--progress=true"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    encoding='utf-8',  # 明确指定UTF-8编码
                    cwd=current_dir,
                    shell=False if sys.platform != 'win32' else True
                )
                
                # 用于跟踪已安装的包数量
                installed_count = 0
                
                # 解析npm输出的正则表达式
                # 匹配npm进度条输出、包安装信息等
                progress_regex = re.compile(r'progress: ([\d.]+)%')
                package_regex = re.compile(r'(added|updated)\s+(\d+)\s+packages?')
                fetching_regex = re.compile(r'fetching\s+from\s+(.+)')
                installing_regex = re.compile(r'installing\s+(.+)')
                error_regex = re.compile(r'(error|fail|warning|warn)', re.IGNORECASE)
                
                # 读取安装进度
                start_time = time.time()
                last_progress_update = time.time()
                
                for line in iter(install_process.stdout.readline, ''):
                    if not line or not self.root.winfo_exists():
                        # 如果窗口已关闭或无输出，中断安装
                        if install_process.poll() is None:
                            self.log("检测到窗口关闭或中断，终止安装进程...")
                            try:
                                # 尝试优雅地终止进程
                                if sys.platform == 'win32':
                                    install_process.terminate()
                                    # 给进程一点时间终止
                                    time.sleep(1)
                                    if install_process.poll() is None:
                                        install_process.kill()  # 强制终止
                                else:
                                    install_process.kill()
                            except Exception as kill_error:
                                self.log(f"终止安装进程时出错: {str(kill_error)}")
                        break
                    
                    line = line.strip()
                    if line:
                        # 记录所有输出
                        self.log(f"[npm] {line}")
                        
                        # 检查是否包含错误信息
                        if error_regex.search(line):
                            # 对于错误或警告信息，特别处理
                            error_level = "警告" if any(w in line.lower() for w in ['warning', 'warn']) else "错误"
                            update_progress_bar(self.progress_var.get(), f"{error_level}: {line[:100]}...")
                        
                        # 尝试匹配进度百分比
                        progress_match = progress_regex.search(line)
                        if progress_match:
                            progress = float(progress_match.group(1))
                            update_progress_bar(progress, f"安装进度: {progress:.1f}%")
                            last_progress_update = time.time()
                        
                        # 尝试匹配包安装信息
                        package_match = package_regex.search(line)
                        if package_match:
                            installed_count = int(package_match.group(2))
                            # 估算进度，基于假设的包总数（实际中可能需要动态计算）
                            estimated_progress = min(50 + (installed_count * 0.5), 90)
                            update_progress_bar(estimated_progress, f"已安装 {installed_count} 个包...")
                            last_progress_update = time.time()
                        
                        # 尝试匹配正在获取的包
                        fetching_match = fetching_regex.search(line.lower())
                        if fetching_match:
                            package_name = fetching_match.group(1)
                            update_progress_bar(self.progress_var.get(), f"正在获取: {package_name}")
                        
                        # 尝试匹配正在安装的包
                        installing_match = installing_regex.search(line.lower())
                        if installing_match:
                            package_name = installing_match.group(1)
                            update_progress_bar(self.progress_var.get(), f"正在安装: {package_name}")
                    
                    # 检查是否超时（超过30分钟）
                    if time.time() - start_time > 30 * 60:
                        self.log("安装依赖超时（超过30分钟），终止安装...")
                        update_progress_bar(self.progress_var.get(), "安装超时，正在终止...")
                        if install_process.poll() is None:
                            try:
                                if sys.platform == 'win32':
                                    install_process.terminate()
                                    time.sleep(1)
                                    if install_process.poll() is None:
                                        install_process.kill()
                                else:
                                    install_process.kill()
                            except Exception as kill_error:
                                self.log(f"终止超时进程时出错: {str(kill_error)}")
                        raise TimeoutError("依赖安装超时，请检查网络连接或尝试手动安装")
                    
                    # 如果长时间没有进度更新，显示活动状态
                    if time.time() - last_progress_update > 10:  # 10秒无更新
                        current_progress = self.progress_var.get()
                        # 小幅度增加进度以显示活动状态
                        if current_progress < 95:
                            new_progress = min(current_progress + 0.5, 95)
                            update_progress_bar(new_progress, f"安装进行中...")
                            last_progress_update = time.time()
                
                # 等待安装完成并更新最终进度
                update_progress_bar(95, "安装完成，正在清理...")
                
                # 设置等待超时，避免无限等待
                try:
                    # 使用wait但设置超时
                    return_code = install_process.wait(timeout=30)  # 30秒超时
                except subprocess.TimeoutExpired:
                    self.log("等待安装完成超时，强制终止进程...")
                    if install_process.poll() is None:
                        try:
                            if sys.platform == 'win32':
                                install_process.terminate()
                                time.sleep(1)
                                if install_process.poll() is None:
                                    install_process.kill()
                            else:
                                install_process.kill()
                        except Exception as kill_error:
                            self.log(f"强制终止进程时出错: {str(kill_error)}")
                    raise TimeoutError("等待安装完成超时")
                    
            except (KeyboardInterrupt, SystemExit):
                # 处理用户中断或系统退出
                self.log("检测到用户中断或系统退出，终止安装...")
                update_progress_bar(self.progress_var.get(), "安装已中断")
                if 'install_process' in locals() and install_process.poll() is None:
                    try:
                        if sys.platform == 'win32':
                            install_process.terminate()
                            time.sleep(1)
                            if install_process.poll() is None:
                                install_process.kill()
                        else:
                            install_process.kill()
                    except Exception as kill_error:
                        self.log(f"终止进程时出错: {str(kill_error)}")
                raise
            except Exception as process_error:
                # 捕获进程相关的错误
                self.log(f"安装进程执行出错: {str(process_error)}")
                update_progress_bar(self.progress_var.get(), f"执行错误: {str(process_error)[:50]}...")
                if 'install_process' in locals() and install_process.poll() is None:
                    try:
                        if sys.platform == 'win32':
                            install_process.terminate()
                            time.sleep(1)
                            if install_process.poll() is None:
                                install_process.kill()
                        else:
                            install_process.kill()
                    except Exception as kill_error:
                        self.log(f"终止错误进程时出错: {str(kill_error)}")
                raise
            
            if install_process.returncode == 0:
                update_progress_bar(100, "依赖安装成功!")
                self.log("依赖安装成功")
                # 延迟一下再显示成功消息，让用户看到100%的进度
                if self.root.winfo_exists():
                    self.root.after(500, lambda: messagebox.showinfo("成功", "依赖安装完成"))
            else:
                self.log(f"依赖安装失败，退出码: {install_process.returncode}")
                if self.root.winfo_exists():
                    self.root.after(0, lambda: messagebox.showerror("错误", "依赖安装失败，请查看日志获取详细信息"))
            
        except TimeoutError as te:
            # 处理超时错误
            error_msg = f"安装超时: {str(te)}"
            self.log(error_msg)
            if self.root.winfo_exists():
                self.root.after(0, lambda: messagebox.showerror("安装超时", error_msg))
        except KeyboardInterrupt:
            # 处理用户中断
            self.log("安装已被用户中断")
            if self.root.winfo_exists():
                self.root.after(0, lambda: messagebox.showinfo("已中断", "依赖安装已被中断"))
        except subprocess.SubprocessError as se:
            # 处理子进程相关错误
            error_msg = f"安装进程错误: {str(se)}"
            self.log(error_msg)
            if self.root.winfo_exists():
                self.root.after(0, lambda: messagebox.showerror("进程错误", error_msg))
        except IOError as ioe:
            # 处理IO错误
            error_msg = f"输入/输出错误: {str(ioe)}"
            self.log(error_msg)
            if self.root.winfo_exists():
                self.root.after(0, lambda: messagebox.showerror("IO错误", f"文件读写错误，可能是权限问题: {str(ioe)}"))
        except OSError as ose:
            # 处理操作系统错误
            error_msg = f"系统错误: {str(ose)}"
            self.log(error_msg)
            if self.root.winfo_exists():
                self.root.after(0, lambda: messagebox.showerror("系统错误", f"操作系统错误: {str(ose)}\n可能需要管理员权限或检查磁盘空间"))
        except Exception as e:
            # 处理其他所有错误
            error_msg = f"安装依赖时出错: {str(e)}"
            self.log(error_msg)
            if self.root.winfo_exists():
                self.root.after(0, lambda: messagebox.showerror("错误", error_msg))
        finally:
            # 隐藏进度条区域
            if self.root.winfo_exists():
                self.root.after(0, lambda: self.progress_frame.pack_forget())
            # 重新启用按钮
            if self.root.winfo_exists():
                self.root.after(0, lambda: self.install_deps_button.config(state=tk.NORMAL))
            # 确保资源释放
            self.log("依赖安装过程完成（无论成功或失败）")
    
    def _install_dependencies_silent(self):
        """静默安装依赖（用于自动检查时）"""
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            
            # 尝试找到npm的完整路径
            npm_path = "npm"
            if sys.platform == 'win32':
                # 在Windows上尝试找到npm.cmd或npm.bat
                try:
                    # 尝试从环境变量PATH中找到npm
                    for path in os.environ["PATH"].split(os.pathsep):
                        npm_candidate = os.path.join(path, "npm.cmd")
                        if os.path.exists(npm_candidate):
                            npm_path = npm_candidate
                            break
                except:
                    pass  # 如果找不到，就使用默认的npm
            
            result = subprocess.run(
                [npm_path, "install", "--silent"],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                cwd=current_dir,
                timeout=300,  # 设置5分钟超时
                shell=False if sys.platform != 'win32' else True
            )
            
            return result.returncode == 0
        except Exception as e:
            self.log(f"静默安装依赖失败: {str(e)}")
            return False
    
    def stop_server(self):
        """停止Node.js服务器"""
        with self.server_lock:
            if not self.server_running:
                messagebox.showinfo("提示", "服务器未运行")
                return
            
            try:
                self.log("正在停止服务器...")
                
                # 终止服务器进程
                if self.server_process:
                    if sys.platform == 'win32':
                        # Windows平台
                        subprocess.call(['taskkill', '/F', '/T', '/PID', str(self.server_process.pid)])
                    else:
                        # Unix-like平台
                        self.server_process.terminate()
                        try:
                            # 等待进程终止，超时5秒
                            self.server_process.wait(timeout=5)
                        except subprocess.TimeoutExpired:
                            # 超时后强制终止
                            self.server_process.kill()
                    
                    self.server_process = None
                
                # 更新状态
                self.server_running = False
                self.update_ui_state()
                
                self.log("服务器已停止")
                
            except Exception as e:
                self.log(f"停止服务器失败: {str(e)}")
                messagebox.showerror("错误", f"停止服务器失败: {str(e)}")
    
    def restart_server(self):
        """重启服务器"""
        self.stop_server()
        # 等待一小段时间确保服务器完全停止
        time.sleep(2)
        self.start_server()
    
    def read_server_logs(self):
        """读取服务器日志"""
        if not self.server_process:
            return
        
        try:
            for line in iter(self.server_process.stdout.readline, ''):
                if line:
                    self.log(line.strip())
        except Exception as e:
            self.log(f"读取日志时出错: {str(e)}")
    
    def log(self, message):
        """添加日志到日志窗口并保存到文件"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}"
        
        # 尝试将日志写入文件
        try:
            log_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "server_manager.log")
            with open(log_file_path, "a", encoding="utf-8") as log_file:
                log_file.write(log_message + "\n")
        except Exception as e:
            # 如果写入日志文件失败，不影响主要功能，但在控制台打印错误
            print(f"写入日志文件失败: {str(e)}")
        
        # 在主线程中更新UI
        self.root.after(0, lambda: self._append_log(log_message))
    
    def _append_log(self, message):
        """在主线程中追加日志"""
        self.log_text.insert(tk.END, message + "\n")
        self.log_text.see(tk.END)
    
    def is_port_in_use(self, port):
        """检查端口是否被占用"""
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                # 设置超时时间
                s.settimeout(1)
                # 尝试连接端口
                result = s.connect_ex(("localhost", port))
                return result == 0
        except Exception:
            return False
    
    def check_server_status(self):
        """定期检查服务器状态"""
        while True:
            self.update_status()
            time.sleep(3)  # 每3秒检查一次
    
    def update_status(self):
        """更新服务器和MongoDB状态"""
        # 更新服务器状态
        is_running = self.is_port_in_use(self.server_port)
        
        if is_running:
            status_text = "运行中"
            status_color = "green"
            # 获取本地IP地址
            local_ip = self.get_local_ip()
            self.root.after(0, lambda: self.ip_var.set(local_ip))
        else:
            status_text = "未运行"
            status_color = "red"
        
        # 更新UI状态
        self.root.after(0, lambda: self.status_var.set(status_text))
        self.root.after(0, lambda: self.status_color_var.set(status_color))
        
        # 更新按钮状态
        with self.server_lock:
            if is_running != self.server_running:
                self.server_running = is_running
                self.root.after(0, self.update_ui_state)
        
        # 更新MongoDB状态
        mongodb_running = self.is_mongodb_running()
        mongodb_status_text = "运行中" if mongodb_running else "未运行"
        
        self.root.after(0, lambda: self.mongodb_status_var.set(mongodb_status_text))
        
        with self.mongodb_lock:
            if mongodb_running != self.mongodb_running:
                self.mongodb_running = mongodb_running
                self.root.after(0, self.update_ui_state)
    
    def is_mongodb_running(self):
        """检查MongoDB是否正在运行"""
        return self.is_port_in_use(self.mongodb_port)
    
    def download_mongodb(self):
        """下载MongoDB，支持Windows、macOS和Ubuntu Linux平台"""
        try:
            self.log("开始下载MongoDB...")
            
            # 禁用下载按钮
            self.download_mongodb_button.config(state=tk.DISABLED)
            
            # 创建进度条窗口
            progress_window = tk.Toplevel(self.root)
            progress_window.title("下载MongoDB")
            progress_window.geometry("500x150")
            progress_window.resizable(False, False)
            progress_window.transient(self.root)
            progress_window.grab_set()
            
            # 创建进度条
            progress_label = ttk.Label(progress_window, text="正在准备下载...", padding=20)
            progress_label.pack(fill=tk.X)
            
            progress = ttk.Progressbar(progress_window, length=480, mode='determinate')
            progress.pack(pady=20)
            progress['value'] = 0
            progress_window.update()
            
            success = False
            
            # 根据操作系统选择不同的下载方式
            if sys.platform == 'darwin':  # macOS
                # 执行Homebrew命令
                commands = [
                    ["brew", "update"],
                    ["bash", "-c", "export HOMEBREW_BOTTLE_DOMAIN=https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles && brew update"],
                    ["brew", "tap", "mongodb/brew"],
                    ["brew", "install", "mongodb-community@7.0"]
                ]
                
                # 执行命令序列
                success = True
                for i, cmd in enumerate(commands):
                    cmd_str = ' '.join(cmd)
                    progress_label.config(text=f"正在执行: {cmd_str}")
                    progress['value'] = (i + 1) * 25
                    progress_window.update()
                    
                    try:
                        self.log(f"执行命令: {cmd_str}")
                        
                        # 对于包含环境变量的命令，使用shell=True
                        shell = len(cmd) > 1 and cmd[0] == "bash" and cmd[1] == "-c"
                        
                        result = subprocess.run(
                            cmd,
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            shell=shell,
                            timeout=600  # 设置10分钟超时
                        )
                        
                        self.log(f"命令输出: {result.stdout}")
                        
                        if result.returncode != 0:
                            self.log(f"命令执行失败，返回码: {result.returncode}")
                            success = False
                            break
                            
                    except subprocess.TimeoutExpired:
                        self.log(f"命令执行超时: {cmd_str}")
                        success = False
                        break
                    except Exception as e:
                        self.log(f"执行命令时出错: {str(e)}")
                        success = False
                        break
            
            elif sys.platform == 'win32':  # Windows
                import requests
                import tempfile
                import shutil
                import time
                import ctypes
                
                # MongoDB Windows安装程序下载链接 (MongoDB 7.0 Community Edition)
                download_url = "https://fastdl.mongodb.org/windows/mongodb-windows-x86_64-7.0.0-signed.msi"
                
                # 显示下载进度
                progress_label.config(text="正在下载MongoDB安装程序...")
                progress['value'] = 10
                progress_window.update()
                
                try:
                    # 创建临时目录
                    temp_dir = tempfile.mkdtemp()
                    msi_path = os.path.join(temp_dir, "mongodb-installer.msi")
                    
                    self.log(f"开始下载MongoDB安装程序: {download_url}")
                    
                    # 下载MongoDB安装程序
                    response = requests.get(download_url, stream=True)
                    total_size = int(response.headers.get('content-length', 0))
                    downloaded_size = 0
                    
                    with open(msi_path, 'wb') as file:
                        for data in response.iter_content(chunk_size=8192):
                            file.write(data)
                            downloaded_size += len(data)
                            if total_size > 0:
                                percent = (downloaded_size / total_size) * 80 + 10  # 10-90%
                                progress['value'] = percent
                                progress_window.update()
                    
                    self.log(f"MongoDB安装程序下载完成: {msi_path}")
                    progress_label.config(text="正在启动安装向导...")
                    progress['value'] = 90
                    progress_window.update()
                    
                    # 检查是否以管理员权限运行
                    def is_admin():
                        try:
                            return ctypes.windll.shell32.IsUserAnAdmin()
                        except:
                            return False
                    
                    # 启动MongoDB安装向导
                    if is_admin():
                        self.log("以管理员权限启动MongoDB安装向导")
                        subprocess.run(["msiexec", "/i", msi_path])
                    else:
                        self.log("提示用户以管理员权限运行安装向导")
                        messagebox.showinfo("提示", "请以管理员权限运行MongoDB安装向导")
                        subprocess.run(["msiexec", "/i", msi_path])
                    
                    # 等待安装完成（用户手动关闭安装向导）
                    progress_label.config(text="等待安装完成...")
                    progress['value'] = 95
                    progress_window.update()
                    
                    # 让用户确认安装是否完成
                    if messagebox.askyesno("确认", "MongoDB安装完成了吗？"):
                        success = True
                    
                except Exception as e:
                    self.log(f"Windows下载安装MongoDB出错: {str(e)}")
                    messagebox.showerror("错误", f"下载或安装MongoDB时出错: {str(e)}")
                    success = False
                finally:
                    # 清理临时文件
                    if 'temp_dir' in locals():
                        try:
                            shutil.rmtree(temp_dir)
                        except:
                            pass
                            
            elif sys.platform.startswith('linux'):  # Linux (Ubuntu)
                import re
                
                # 检查是否为Ubuntu系统
                try:
                    with open('/etc/os-release', 'r') as f:
                        os_release = f.read()
                    if 'Ubuntu' not in os_release:
                        self.log("检测到非Ubuntu Linux系统，此功能专为Ubuntu设计")
                        messagebox.showerror("错误", "此MongoDB安装功能专为Ubuntu设计")
                        success = False
                        return
                    
                    # 提取Ubuntu版本
                    version_match = re.search(r'VERSION_ID="(\d+\.\d+)"', os_release)
                    if version_match:
                        ubuntu_version = version_match.group(1)
                        self.log(f"检测到Ubuntu {ubuntu_version}")
                    else:
                        self.log("无法确定Ubuntu版本")
                except Exception as e:
                    self.log(f"检测Ubuntu系统信息时出错: {str(e)}")
                    # 继续尝试安装
                
                # Ubuntu安装步骤
                ubuntu_commands = [
                    # 更新包列表
                    ["sudo", "apt-get", "update"],
                    # 安装必要的依赖
                    ["sudo", "apt-get", "install", "-y", "gnupg"],
                    # 添加MongoDB GPG密钥
                    ["sudo", "wget", "-qO-", "https://www.mongodb.org/static/pgp/server-7.0.asc", "|", "sudo", "apt-key", "add", "-"],
                    # 创建MongoDB源列表文件
                    ["sudo", "echo", "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse", "|", "sudo", "tee", "/etc/apt/sources.list.d/mongodb-org-7.0.list"],
                    # 更新包列表
                    ["sudo", "apt-get", "update"],
                    # 安装MongoDB
                    ["sudo", "apt-get", "install", "-y", "mongodb-org"]
                ]
                
                # 执行Ubuntu安装命令
                success = True
                for i, cmd in enumerate(ubuntu_commands):
                    cmd_str = ' '.join(cmd)
                    progress_label.config(text=f"正在执行: {cmd_str}")
                    progress['value'] = (i + 1) * (100 / len(ubuntu_commands))
                    progress_window.update()
                    
                    try:
                        self.log(f"执行命令: {cmd_str}")
                        
                        # 对于需要管道的命令，使用shell=True
                        shell = '|' in cmd_str
                        
                        # 对于包含echo和tee的命令，使用不同的方式处理
                        if "echo" in cmd_str and "tee" in cmd_str:
                            # 提取要写入的内容和目标文件
                            content_match = re.search(r'echo "([^"]*)"', cmd_str)
                            file_match = re.search(r'tee (\S+)', cmd_str)
                            if content_match and file_match:
                                content = content_match.group(1)
                                target_file = file_match.group(1)
                                # 使用echo命令通过shell写入文件
                                shell_cmd = f"echo '{content}' | sudo tee {target_file}"
                                self.log(f"使用shell命令: {shell_cmd}")
                                result = subprocess.run(
                                    shell_cmd,
                                    shell=True,
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT,
                                    text=True,
                                    timeout=300
                                )
                            else:
                                raise Exception("无法解析echo和tee命令")
                        else:
                            # 对于常规命令，分解命令参数
                            if shell:
                                # 对于包含管道的命令，使用shell=True
                                result = subprocess.run(
                                    cmd_str,
                                    shell=True,
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT,
                                    text=True,
                                    timeout=300
                                )
                            else:
                                # 对于不包含管道的命令，正常执行
                                result = subprocess.run(
                                    cmd,
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT,
                                    text=True,
                                    timeout=300
                                )
                        
                        self.log(f"命令输出: {result.stdout}")
                        
                        if result.returncode != 0:
                            self.log(f"命令执行失败，返回码: {result.returncode}")
                            # 对于某些非关键错误，尝试继续执行
                            if i not in [0, 3, 4]:  # 不跳过更新和源列表配置
                                self.log("继续尝试后续命令...")
                            else:
                                success = False
                                break
                                
                    except subprocess.TimeoutExpired:
                        self.log(f"命令执行超时: {cmd_str}")
                        success = False
                        break
                    except Exception as e:
                        self.log(f"执行命令时出错: {str(e)}")
                        success = False
                        break
                
                # 启动MongoDB服务
                if success:
                    progress_label.config(text="正在启动MongoDB服务...")
                    progress['value'] = 90
                    progress_window.update()
                    
                    try:
                        # 启动服务
                        subprocess.run(
                            ["sudo", "systemctl", "start", "mongod"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True
                        )
                        
                        # 设置开机自启
                        subprocess.run(
                            ["sudo", "systemctl", "enable", "mongod"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True
                        )
                        
                        # 检查MongoDB是否成功启动
                        time.sleep(3)
                        result = subprocess.run(
                            ["sudo", "systemctl", "is-active", "mongod"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            text=True
                        )
                        
                        if "active" in result.stdout:
                            self.log("MongoDB服务已成功启动")
                            success = True
                        else:
                            self.log("MongoDB服务启动失败")
                            # 尝试直接启动mongod
                            self.log("尝试直接启动mongod...")
                            try:
                                subprocess.run(
                                    ["mongod", "--dbpath", "/var/lib/mongodb", "--logpath", "/var/log/mongodb/mongod.log", "--fork"],
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT,
                                    text=True
                                )
                                # 检查是否成功
                                time.sleep(2)
                                if subprocess.run(["pgrep", "mongod"]).returncode == 0:
                                    self.log("直接启动mongod成功")
                                    success = True
                                else:
                                    self.log("直接启动mongod失败")
                                    success = False
                            except Exception as e:
                                self.log(f"直接启动mongod时出错: {str(e)}")
                                success = False
                                
                    except Exception as e:
                        self.log(f"启动MongoDB服务时出错: {str(e)}")
                        success = False
                        
                # 检查MongoDB是否安装成功
                if success:
                    try:
                        result = subprocess.run(
                            ["mongosh", "--version"],  # MongoDB 6.0+ 使用mongosh而不是mongo
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            text=True
                        )
                        if result.returncode == 0:
                            self.log(f"MongoDB Shell版本: {result.stdout.splitlines()[0]}")
                        else:
                            # 尝试旧版命令
                            result = subprocess.run(
                                ["mongo", "--version"],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE,
                                text=True
                            )
                            if result.returncode == 0:
                                self.log(f"MongoDB版本: {result.stdout.splitlines()[0]}")
                    except Exception as e:
                        self.log(f"检查MongoDB版本时出错: {str(e)}")
            
            else:
                messagebox.showerror("错误", f"不支持的操作系统: {sys.platform}")
                success = False
            
            # 关闭进度窗口
            progress_window.destroy()
            
            if success:
                self.log("MongoDB下载安装成功")
                messagebox.showinfo("成功", "MongoDB下载安装成功")
                # 更新UI状态，禁用下载按钮
                self.update_ui_state()
            else:
                self.log("MongoDB下载安装失败")
                messagebox.showerror("错误", "MongoDB下载安装失败，请查看日志获取详细信息")
                # 重新启用下载按钮
                self.download_mongodb_button.config(state=tk.NORMAL)
                
        except Exception as e:
            self.log(f"下载MongoDB时出错: {str(e)}")
            messagebox.showerror("错误", f"下载MongoDB时出错: {str(e)}")
            # 重新启用下载按钮
            self.download_mongodb_button.config(state=tk.NORMAL)
    
    def _is_command_available(self, command):
        """检查命令是否可用"""
        try:
            if sys.platform == 'win32':
                # Windows系统使用where命令检查
                subprocess.run(['where', command], stdout=subprocess.PIPE, stderr=subprocess.PIPE, shell=True, check=True)
            else:
                # Unix系统使用which命令检查
                subprocess.run(['which', command], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
            return True
        except (subprocess.SubprocessError, FileNotFoundError):
            return False

    def start_mongodb(self):
        """启动MongoDB服务"""
        with self.mongodb_lock:
            if self.mongodb_running:
                messagebox.showinfo("提示", "MongoDB已经在运行中")
                return True
            
            try:
                self.log("正在启动MongoDB服务...")
                
                # 根据操作系统使用不同的启动命令
                if sys.platform == 'darwin':  # macOS
                    # 尝试使用brew服务启动MongoDB
                    try:
                        subprocess.run(
                            ["brew", "services", "start", "mongodb-community@7.0"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            check=True
                        )
                        self.log("使用brew服务启动MongoDB成功")
                        self.mongodb_running = True
                        self.update_ui_state()
                        return True
                    except (subprocess.SubprocessError, FileNotFoundError):
                        self.log("使用brew服务启动MongoDB失败，尝试直接启动")
                        # 尝试直接启动mongod
                        try:
                            self.mongodb_process = subprocess.Popen(
                                ["mongod"],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT,
                                text=True,
                                encoding='utf-8',  # 明确指定UTF-8编码
                                shell=False
                            )
                            # 等待MongoDB启动
                            time.sleep(3)
                            if self.is_mongodb_running():
                                self.log("直接启动MongoDB成功")
                                self.mongodb_running = True
                                self.update_ui_state()
                                return True
                            else:
                                self.log("直接启动MongoDB失败")
                                return False
                        except Exception as e:
                            self.log(f"直接启动MongoDB时出错: {str(e)}")
                            return False
                            
                elif sys.platform == 'win32':  # Windows
                    # 方法1: 尝试使用net start命令启动MongoDB服务
                    try:
                        if self._is_command_available('net'):
                            result = subprocess.run(
                                ["net", "start", "MongoDB"],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT,
                                text=True,
                                shell=True
                            )
                            if result.returncode == 0:
                                self.log("Windows服务启动MongoDB成功")
                                self.mongodb_running = True
                                self.update_ui_state()
                                return True
                            else:
                                self.log(f"Windows服务启动MongoDB失败: {result.stdout}")
                        else:
                            self.log("net命令不可用，跳过服务启动尝试")
                    except Exception as e:
                        self.log(f"使用net命令启动MongoDB服务时出错: {str(e)}")
                    
                    # 方法2: 尝试使用sc命令启动MongoDB服务
                    try:
                        if self._is_command_available('sc'):
                            result = subprocess.run(
                                ["sc", "start", "MongoDB"],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT,
                                text=True,
                                shell=True
                            )
                            if result.returncode == 0 or "SUCCESS" in result.stdout:
                                self.log("使用sc命令启动MongoDB服务成功")
                                self.mongodb_running = True
                                self.update_ui_state()
                                return True
                            else:
                                self.log(f"使用sc命令启动MongoDB服务失败: {result.stdout}")
                        else:
                            self.log("sc命令不可用，跳过服务启动尝试")
                    except Exception as e:
                        self.log(f"使用sc命令启动MongoDB服务时出错: {str(e)}")
                    
                    # 方法3: 尝试直接启动mongod
                    try:
                        self.log("尝试直接启动MongoDB进程...")
                        # 查找MongoDB安装路径，支持最新版本
                        mongo_path = "mongod"  # 默认在PATH中
                        # 检查常见的安装路径，包括最新版本
                        for path in [
                            "C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe",
                            "C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe",
                            "C:\\Program Files\\MongoDB\\Server\\5.0\\bin\\mongod.exe",
                            "C:\\Program Files\\MongoDB\\Server\\4.4\\bin\\mongod.exe",
                            "C:\\Program Files\\MongoDB\\Server\\4.2\\bin\\mongod.exe"
                        ]:
                            if os.path.exists(path):
                                mongo_path = path
                                self.log(f"找到MongoDB安装: {path}")
                                break
                        
                        # 确保数据目录存在
                        data_dir = os.path.join(os.environ.get('ProgramData', 'C:\\ProgramData'), 'MongoDB', 'data', 'db')
                        if not os.path.exists(data_dir):
                            try:
                                os.makedirs(data_dir, exist_ok=True)
                                self.log(f"创建MongoDB数据目录: {data_dir}")
                            except Exception as e:
                                self.log(f"创建数据目录失败: {str(e)}")
                        
                        # 启动MongoDB进程
                        startup_info = subprocess.STARTUPINFO()
                        startup_info.dwFlags |= subprocess.STARTF_USESHOWWINDOW
                        
                        self.mongodb_process = subprocess.Popen(
                            [mongo_path, f"--dbpath={data_dir}"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            encoding='utf-8',  # 明确指定UTF-8编码
                            shell=True,
                            startupinfo=startup_info
                        )
                        
                        # 添加超时处理，最多等待10秒
                        max_wait_time = 10
                        wait_time = 0
                        check_interval = 1
                        
                        while wait_time < max_wait_time:
                            time.sleep(check_interval)
                            wait_time += check_interval
                            if self.is_mongodb_running():
                                self.log("直接启动MongoDB成功")
                                self.mongodb_running = True
                                self.update_ui_state()
                                return True
                            
                            # 检查进程是否已经退出
                            if self.mongodb_process.poll() is not None:
                                self.log("MongoDB进程已退出，启动失败")
                                # 尝试读取错误输出
                                if self.mongodb_process.stdout:
                                    error_output = self.mongodb_process.stdout.read()
                                    if error_output:
                                        self.log(f"MongoDB错误输出: {error_output}")
                                break
                        
                        self.log("直接启动MongoDB超时失败")
                        return False
                        
                    except Exception as e:
                        self.log(f"直接启动MongoDB时出错: {str(e)}")
                        return False
                            
                elif sys.platform.startswith('linux'):  # Linux (Ubuntu)
                    try:
                        # 检查Ubuntu系统中的MongoDB服务名称
                        # Ubuntu中MongoDB服务可能是mongodb或mongod
                        service_name = "mongodb"
                        try:
                            # 检查mongod服务是否存在
                            result = subprocess.run(
                                ["sudo", "systemctl", "list-units", "--full", "-all", "|", "grep", "mongod"],
                                shell=True,
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE
                            )
                            if result.returncode == 0:
                                service_name = "mongod"
                                self.log(f"检测到MongoDB服务名称: {service_name}")
                        except:
                            self.log("使用默认MongoDB服务名称: mongodb")
                        
                        # 尝试使用systemctl启动MongoDB
                        self.log(f"尝试使用systemctl启动MongoDB服务 ({service_name})...")
                        result = subprocess.run(
                            ["sudo", "systemctl", "start", service_name],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True
                        )
                        
                        if result.returncode == 0:
                            self.log(f"使用systemctl启动{service_name}成功")
                            self.mongodb_running = True
                            self.update_ui_state()
                            return True
                        else:
                            self.log(f"使用systemctl启动{service_name}失败: {result.stdout}")
                            
                            # 检查MongoDB是否已经运行
                            if self.is_mongodb_running():
                                self.log("MongoDB已经在运行")
                                self.mongodb_running = True
                                self.update_ui_state()
                                return True
                            
                            # 尝试直接启动mongod
                            self.log("尝试直接启动mongod...")
                            try:
                                # 确保数据目录存在
                                data_dir = "/var/lib/mongodb"
                                if not os.path.exists(data_dir):
                                    try:
                                        os.makedirs(data_dir, exist_ok=True)
                                        # 设置权限
                                        subprocess.run(["sudo", "chown", "mongodb:mongodb", data_dir], check=False)
                                        self.log(f"创建MongoDB数据目录: {data_dir}")
                                    except Exception as e:
                                        self.log(f"创建数据目录失败: {str(e)}")
                                        # 使用临时目录作为备选
                                        data_dir = "/tmp/mongodb_data"
                                        os.makedirs(data_dir, exist_ok=True)
                                        self.log(f"使用临时数据目录: {data_dir}")
                                
                                # 确保日志目录存在
                                log_dir = "/var/log/mongodb"
                                log_file = os.path.join(log_dir, "mongod.log")
                                if not os.path.exists(log_dir):
                                    try:
                                        os.makedirs(log_dir, exist_ok=True)
                                        # 设置权限
                                        subprocess.run(["sudo", "chown", "mongodb:mongodb", log_dir], check=False)
                                        open(log_file, 'a').close()
                                        subprocess.run(["sudo", "chown", "mongodb:mongodb", log_file], check=False)
                                    except Exception as e:
                                        self.log(f"创建日志目录失败: {str(e)}")
                                        log_file = os.path.join("/tmp", "mongod.log")
                                        self.log(f"使用临时日志文件: {log_file}")
                                
                                # 直接启动mongod进程
                                self.mongodb_process = subprocess.Popen(
                                    ["mongod", "--dbpath", data_dir, "--logpath", log_file],
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT,
                                    text=True,
                                    encoding='utf-8'  # 明确指定UTF-8编码
                                )
                                
                                # 等待MongoDB启动
                                max_wait_time = 10
                                wait_time = 0
                                check_interval = 1
                                
                                while wait_time < max_wait_time:
                                    time.sleep(check_interval)
                                    wait_time += check_interval
                                    if self.is_mongodb_running():
                                        self.log("直接启动MongoDB成功")
                                        self.mongodb_running = True
                                        self.update_ui_state()
                                        return True
                                    
                                    # 检查进程是否已经退出
                                    if self.mongodb_process.poll() is not None:
                                        self.log("MongoDB进程已退出，启动失败")
                                        # 尝试读取错误输出
                                        if self.mongodb_process.stdout:
                                            error_output = self.mongodb_process.stdout.read()
                                            if error_output:
                                                self.log(f"MongoDB错误输出: {error_output}")
                                        break
                                
                                self.log("直接启动MongoDB超时失败")
                                return False
                                
                            except Exception as e:
                                self.log(f"直接启动MongoDB时出错: {str(e)}")
                                return False
                                
                    except Exception as e:
                        self.log(f"启动MongoDB时出错: {str(e)}")
                        return False
                            
                # 如果没有找到对应的操作系统处理方法
                messagebox.showerror("错误", "不支持的操作系统，请手动启动MongoDB")
                return False
                
            except Exception as e:
                self.log(f"启动MongoDB失败: {str(e)}")
                messagebox.showerror("错误", f"启动MongoDB失败: {str(e)}")
                return False
    
    def stop_mongodb(self):
        """停止MongoDB服务"""
        with self.mongodb_lock:
            if not self.mongodb_running:
                messagebox.showinfo("提示", "MongoDB未运行")
                return
            
            try:
                self.log("正在停止MongoDB服务...")
                
                # 根据操作系统使用不同的停止命令
                if sys.platform == 'darwin':  # macOS
                    # 尝试使用brew服务停止MongoDB
                    try:
                        subprocess.run(
                            ["brew", "services", "stop", "mongodb-community@7.0"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            check=True
                        )
                        self.log("使用brew服务停止MongoDB成功")
                    except (subprocess.SubprocessError, FileNotFoundError):
                        self.log("使用brew服务停止MongoDB失败，检查是否有直接启动的进程")
                        
                elif sys.platform == 'win32':  # Windows
                    # 尝试以管理员权限停止MongoDB服务
                    self.log("尝试以管理员权限停止MongoDB服务...")
                    
                    # 方法1: 使用PowerShell以管理员权限停止MongoDB服务
                    try:
                        # 创建PowerShell命令来停止服务
                        powershell_command = """
                        # 尝试停止MongoDB服务
                        try {
                            $service = Get-Service -Name MongoDB -ErrorAction SilentlyContinue
                            if ($service) {
                                Stop-Service -Name MongoDB -Force
                                Write-Output "MongoDB服务停止成功"
                            } else {
                                Write-Output "MongoDB服务不存在"
                            }
                        } catch {
                            Write-Output "停止MongoDB服务时出错: $_"
                        }
                        """
                        
                        # 使用PowerShell以管理员权限运行
                        result = subprocess.run(
                            ["powershell", "-Command", 
                             "Start-Process", "powershell", 
                             "-ArgumentList", f"-NoProfile -ExecutionPolicy Bypass -Command \"{powershell_command}\"", 
                             "-Verb", "RunAs", 
                             "-Wait", 
                             "-PassThru"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            text=True
                        )
                        
                        self.log("已尝试以管理员权限停止MongoDB服务，请查看权限提示对话框")
                    except Exception as e:
                        self.log(f"以管理员权限停止MongoDB服务时出错: {str(e)}")
                        
                        # 方法2: 尝试使用net stop命令停止MongoDB服务（备用方案）
                        try:
                            if self._is_command_available('net'):
                                result = subprocess.run(
                                    ["net", "stop", "MongoDB"],
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT,
                                    text=True,
                                    shell=True
                                )
                                if result.returncode == 0:
                                    self.log("Windows服务停止MongoDB成功")
                                else:
                                    self.log(f"Windows服务停止MongoDB失败: {result.stdout}")
                        except Exception as e:
                            self.log(f"使用net命令停止MongoDB服务时出错: {str(e)}")
                        
                        # 方法3: 尝试使用sc命令停止MongoDB服务（备用方案）
                        try:
                            if self._is_command_available('sc'):
                                result = subprocess.run(
                                    ["sc", "stop", "MongoDB"],
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.STDOUT,
                                    text=True,
                                    shell=True
                                )
                                if result.returncode == 0 or "SUCCESS" in result.stdout:
                                    self.log("使用sc命令停止MongoDB服务成功")
                                else:
                                    self.log(f"使用sc命令停止MongoDB服务失败: {result.stdout}")
                        except Exception as e:
                            self.log(f"使用sc命令停止MongoDB服务时出错: {str(e)}")
                        
                elif sys.platform.startswith('linux'):  # Linux (Ubuntu)
                    try:
                        # 检查Ubuntu系统中的MongoDB服务名称
                        service_names = ["mongod", "mongodb"]  # 尝试常见的服务名称
                        stopped = False
                        
                        for service_name in service_names:
                            self.log(f"尝试使用systemctl停止{service_name}服务...")
                            result = subprocess.run(
                                ["sudo", "systemctl", "stop", service_name],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT,
                                text=True
                            )
                            
                            if result.returncode == 0:
                                self.log(f"使用systemctl停止{service_name}成功")
                                stopped = True
                                break
                        
                        if not stopped:
                            self.log("使用systemctl停止MongoDB服务失败，检查是否有直接启动的进程")
                    except Exception as e:
                        self.log(f"使用systemctl停止MongoDB服务时出错: {str(e)}")
                        
                # 检查并终止直接启动的MongoDB进程
                if self.mongodb_process:
                    if sys.platform == 'win32':
                        subprocess.call(['taskkill', '/F', '/T', '/PID', str(self.mongodb_process.pid)])
                        self.log(f"终止MongoDB进程PID: {self.mongodb_process.pid}")
                    else:
                        self.mongodb_process.terminate()
                        try:
                            self.mongodb_process.wait(timeout=5)
                        except subprocess.TimeoutExpired:
                            self.mongodb_process.kill()
                    self.mongodb_process = None
                    self.log("终止直接启动的MongoDB进程")
                
                # Windows系统: 尝试终止所有MongoDB进程
                if sys.platform == 'win32':
                    # 重试机制：最多重试3次
                    retry_count = 0
                    max_retries = 3
                    
                    while retry_count < max_retries:
                        try:
                            # 查找所有mongod.exe进程
                            result = subprocess.run(
                                ['tasklist', '/FI', 'IMAGENAME eq mongod.exe', '/NH'],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE,
                                text=True,
                                shell=True
                            )
                            
                            if 'mongod.exe' in result.stdout:
                                self.log(f"第{retry_count+1}次尝试终止所有MongoDB进程")
                                # 终止所有MongoDB进程，使用更强力的参数
                                subprocess.run(
                                    ['taskkill', '/F', '/IM', 'mongod.exe', '/T'],
                                    stdout=subprocess.PIPE,
                                    stderr=subprocess.PIPE,
                                    shell=True
                                )
                                self.log("已尝试终止所有MongoDB进程")
                                
                                # 等待进程终止
                                time.sleep(2)
                            else:
                                self.log("没有检测到MongoDB进程")
                                break
                        except Exception as e:
                            self.log(f"终止MongoDB进程时出错: {str(e)}")
                        
                        retry_count += 1
                        if retry_count < max_retries:
                            time.sleep(1)  # 重试间隔
                
                # Linux/macOS系统: 尝试终止所有MongoDB进程
                else:
                    try:
                        # 查找并终止所有mongod进程
                        subprocess.run(['pkill', '-f', 'mongod'], check=False)
                        self.log("已尝试终止所有MongoDB进程")
                    except Exception as e:
                        self.log(f"终止MongoDB进程时出错: {str(e)}")
                
                # 增加等待时间，确保进程完全终止
                self.log("等待MongoDB进程完全终止...")
                time.sleep(3)
                
                # 验证MongoDB是否真正停止：检查端口和进程
                is_really_stopped = False
                max_checks = 5
                check_count = 0
                
                while check_count < max_checks:
                    # 检查端口是否被占用
                    port_in_use = self.is_port_in_use(self.mongodb_port)
                    
                    # 检查进程是否存在
                    process_exists = False
                    if sys.platform == 'win32':
                        result = subprocess.run(
                            ['tasklist', '/FI', 'IMAGENAME eq mongod.exe', '/NH'],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.PIPE,
                            text=True,
                            shell=True
                        )
                        process_exists = 'mongod.exe' in result.stdout
                    else:
                        try:
                            result = subprocess.run(
                                ['pgrep', '-f', 'mongod'],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE
                            )
                            process_exists = result.returncode == 0
                        except:
                            pass
                    
                    if not port_in_use and not process_exists:
                        is_really_stopped = True
                        break
                    
                    self.log(f"MongoDB似乎仍在运行，等待并再次检查...({check_count+1}/{max_checks})")
                    time.sleep(2)
                    check_count += 1
                
                # 更新状态
                if is_really_stopped:
                    self.mongodb_running = False
                    self.update_ui_state()
                    self.log("MongoDB服务已成功停止")
                else:
                    # 如果仍然检测到MongoDB运行，最后尝试一次强力终止
                    if sys.platform == 'win32':
                        self.log("MongoDB似乎仍在运行，尝试最后一次强力终止...")
                        subprocess.run(['taskkill', '/F', '/IM', 'mongod.exe', '/T'], shell=True)
                    else:
                        subprocess.run(['pkill', '-9', '-f', 'mongod'], check=False)
                    
                    time.sleep(2)
                    # 最后再次检查
                    port_in_use = self.is_port_in_use(self.mongodb_port)
                    if not port_in_use:
                        self.mongodb_running = False
                        self.update_ui_state()
                        self.log("MongoDB服务已成功停止")
                    else:
                        self.log("警告：无法确认MongoDB是否已完全停止，请手动检查")
                        messagebox.showwarning("警告", "无法确认MongoDB是否已完全停止，请手动检查端口和进程")
                
            except Exception as e:
                self.log(f"停止MongoDB失败: {str(e)}")
                messagebox.showerror("错误", f"停止MongoDB失败: {str(e)}")
                # 即使出现异常，也尝试更新状态
                try:
                    if not self.is_port_in_use(self.mongodb_port):
                        self.mongodb_running = False
                        self.update_ui_state()
                except:
                    pass
    
    def update_ui_state(self):
        """更新UI按钮状态"""
        # 更新服务器按钮状态
        if self.server_running:
            self.start_button.config(state=tk.DISABLED)
            self.stop_button.config(state=tk.NORMAL)
            self.restart_button.config(state=tk.NORMAL)
            self.install_deps_button.config(state=tk.DISABLED)  # 运行时禁用安装依赖
        else:
            self.start_button.config(state=tk.NORMAL)
            self.stop_button.config(state=tk.DISABLED)
            self.restart_button.config(state=tk.DISABLED)
            self.install_deps_button.config(state=tk.NORMAL)  # 未运行时启用安装依赖
        
        # 更新MongoDB按钮状态
        if self.mongodb_running:
            self.start_mongodb_button.config(state=tk.DISABLED)
            self.stop_mongodb_button.config(state=tk.NORMAL)
            self.download_mongodb_button.config(state=tk.DISABLED)  # 运行时禁用下载
        else:
            self.start_mongodb_button.config(state=tk.NORMAL)
            self.stop_mongodb_button.config(state=tk.DISABLED)
            # 检查MongoDB是否已安装
            try:
                result = subprocess.run(
                    ["which", "mongod"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True
                )
                # 如果已安装，禁用下载按钮
                if result.returncode == 0 and result.stdout.strip():
                    self.download_mongodb_button.config(state=tk.DISABLED)
                else:
                    self.download_mongodb_button.config(state=tk.NORMAL)
            except:
                self.download_mongodb_button.config(state=tk.NORMAL)
    
    def get_local_ip(self):
        """获取本地IP地址"""
        try:
            # 创建一个UDP套接字来获取本地IP
            s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
            # 连接到一个公共IP（不会实际发送数据）
            s.connect(("8.8.8.8", 80))
            local_ip = s.getsockname()[0]
            s.close()
            return local_ip
        except Exception:
            return "127.0.0.1"
    
    def update_system_info(self):
        """更新系统信息"""
        # 获取系统信息
        system = platform.system()
        system_version = platform.version()
        
        # 获取设备信息
        if sys.platform == 'darwin':  # macOS
            device = platform.mac_ver()[0]  # 获取macOS版本
        elif sys.platform == 'win32':  # Windows
            device = f"{platform.win32_ver()[0]} {platform.win32_ver()[1]}"  # Windows版本
        elif sys.platform.startswith('linux'):  # Linux
            try:
                # 尝试获取Linux发行版信息
                dist_info = platform.linux_distribution()
                device = f"{dist_info[0]} {dist_info[1]}"
            except AttributeError:
                # 较新版本的Python可能使用不同的方法
                try:
                    from distro import name, version
                    device = f"{name()} {version()}"
                except ImportError:
                    device = platform.platform()
        else:
            device = platform.platform()
        
        # 设置服务器路径
        current_dir = os.path.dirname(os.path.abspath(__file__))
        
        # 更新变量
        self.system_var.set(system)
        self.system_version_var.set(system_version)
        self.device_var.set(device)
        self.server_path_var.set(current_dir)
    
    def on_closing(self):
        """关闭窗口时的处理"""
        # 检查是否有服务在运行
        if self.server_running or self.mongodb_running:
            services_text = ""
            if self.server_running:
                services_text += "服务器"
            if self.server_running and self.mongodb_running:
                services_text += "和"
            if self.mongodb_running:
                services_text += "MongoDB"
            
            if messagebox.askyesno("确认", f"{services_text}正在运行中，确定要关闭吗？"):
                if self.server_running:
                    self.stop_server()
                # 这里不自动停止MongoDB，避免影响其他可能使用MongoDB的应用
                self.root.destroy()
        else:
            self.root.destroy()


def main():
    """
    主函数入口
    注意：此控制台使用Homebrew管理MongoDB社区版，部分代码注释由AI辅助生成
    """
    # 在控制台根目录写入启动日志
    try:
        log_dir = os.path.dirname(os.path.abspath(__file__))
        log_file = os.path.join(log_dir, "server_manager.log")
        current_time = time.strftime("%Y-%m-%d %H:%M:%S")
        with open(log_file, "a", encoding="utf-8") as f:
            f.write(f"[{current_time}] HalloChat服务器管理器启动\n")
    except Exception as e:
        print(f"写入日志失败: {str(e)}")
    
    # 检查Node.js是否安装
    try:
        subprocess.run(["node", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except (subprocess.SubprocessError, FileNotFoundError):
        error_message = "错误: 未找到Node.js，请先安装Node.js"
        print(error_message)
        # 将错误写入日志文件
        try:
            log_dir = os.path.dirname(os.path.abspath(__file__))
            log_file = os.path.join(log_dir, "server_manager.log")
            current_time = time.strftime("%Y-%m-%d %H:%M:%S")
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(f"[{current_time}] {error_message}\n")
        except Exception as e:
            print(f"写入错误日志失败: {str(e)}")
        sys.exit(1)
    
    # 检查npm是否安装
    try:
        # 尝试找到npm的完整路径
        npm_path = "npm"
        if sys.platform == 'win32':
            # 在Windows上尝试找到npm.cmd或npm.bat
            try:
                # 尝试从环境变量PATH中找到npm
                for path in os.environ["PATH"].split(os.pathsep):
                    npm_candidate = os.path.join(path, "npm.cmd")
                    if os.path.exists(npm_candidate):
                        npm_path = npm_candidate
                        break
            except:
                pass  # 如果找不到，就使用默认的npm
        
        subprocess.run([npm_path, "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except (subprocess.SubprocessError, FileNotFoundError):
        error_message = "错误: 未找到npm，请先安装npm"
        print(error_message)
        # 将错误写入日志文件
        try:
            log_dir = os.path.dirname(os.path.abspath(__file__))
            log_file = os.path.join(log_dir, "server_manager.log")
            current_time = time.strftime("%Y-%m-%d %H:%M:%S")
            with open(log_file, "a", encoding="utf-8") as f:
                f.write(f"[{current_time}] {error_message}\n")
        except Exception as e:
            print(f"写入错误日志失败: {str(e)}")
        sys.exit(1)
    
    # 创建并运行GUI
    root = tk.Tk()
    app = ServerManager(root)
    root.mainloop()


if __name__ == "__main__":
    main()