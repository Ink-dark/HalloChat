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


class ServerManager:
    def __init__(self, root):
        self.root = root
        self.root.title("HalloChat 服务器管理控制台")
        self.root.geometry("1108x918")
        self.root.resizable(True, True)
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
        
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
            "1. MongoDB 全程使用Homebrew管理MongoDB社区版\n"\
            "2. 代码中部分注释由AI辅助生成，以提高可读性"
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
                self.server_process = subprocess.Popen(
                    ["npm", "start"],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
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
        """安装Node.js依赖"""
        try:
            self.log("开始安装依赖...")
            
            # 禁用按钮防止重复点击
            self.install_deps_button.config(state=tk.DISABLED)
            
            # 运行npm install命令
            current_dir = os.path.dirname(os.path.abspath(__file__))
            install_process = subprocess.Popen(
                ["npm", "install"],
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                cwd=current_dir,
                shell=False if sys.platform != 'win32' else True
            )
            
            # 读取安装进度
            for line in iter(install_process.stdout.readline, ''):
                if line:
                    self.log(f"[npm] {line.strip()}")
            
            # 等待安装完成
            install_process.wait()
            
            if install_process.returncode == 0:
                self.log("依赖安装成功")
                messagebox.showinfo("成功", "依赖安装完成")
            else:
                self.log(f"依赖安装失败，退出码: {install_process.returncode}")
                messagebox.showerror("错误", "依赖安装失败，请查看日志获取详细信息")
            
        except Exception as e:
            self.log(f"安装依赖时出错: {str(e)}")
            messagebox.showerror("错误", f"安装依赖时出错: {str(e)}")
        finally:
            # 重新启用按钮
            self.install_deps_button.config(state=tk.NORMAL)
    
    def _install_dependencies_silent(self):
        """静默安装依赖（用于自动检查时）"""
        try:
            current_dir = os.path.dirname(os.path.abspath(__file__))
            result = subprocess.run(
                ["npm", "install", "--silent"],
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
        """添加日志到日志窗口"""
        timestamp = time.strftime("%Y-%m-%d %H:%M:%S")
        log_message = f"[{timestamp}] {message}"
        
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
        """使用Homebrew下载MongoDB"""
        try:
            self.log("开始下载MongoDB...")
            
            # 检查是否是macOS系统
            if sys.platform != 'darwin':
                messagebox.showerror("错误", "此功能仅支持macOS系统")
                return
            
            # 禁用下载按钮
            self.download_mongodb_button.config(state=tk.DISABLED)
            
            # 执行Homebrew命令
            commands = [
                ["brew", "update"],
                ["bash", "-c", "export HOMEBREW_BOTTLE_DOMAIN=https://mirrors.tuna.tsinghua.edu.cn/homebrew-bottles && brew update"],
                ["brew", "tap", "mongodb/brew"],
                ["brew", "install", "mongodb-community@7.0"]
            ]
            
            # 创建进度条窗口
            progress_window = tk.Toplevel(self.root)
            progress_window.title("下载MongoDB")
            progress_window.geometry("500x150")
            progress_window.resizable(False, False)
            progress_window.transient(self.root)
            progress_window.grab_set()
            
            # 创建进度条
            progress_label = ttk.Label(progress_window, text="正在执行命令...", padding=20)
            progress_label.pack(fill=tk.X)
            
            progress = ttk.Progressbar(progress_window, length=480, mode='determinate')
            progress.pack(pady=20)
            progress['value'] = 0
            progress_window.update()
            
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
                    try:
                        # 尝试使用net start命令启动MongoDB服务
                        subprocess.run(
                            ["net", "start", "MongoDB"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            check=True,
                            shell=True
                        )
                        self.log("Windows服务启动MongoDB成功")
                        self.mongodb_running = True
                        self.update_ui_state()
                        return True
                    except subprocess.SubprocessError:
                        self.log("Windows服务启动MongoDB失败，尝试直接启动")
                        # 尝试直接启动mongod
                        try:
                            # 查找MongoDB安装路径
                            mongo_path = "mongod"  # 默认在PATH中
                            # 检查常见的安装路径
                            for path in [
                                "C:\\Program Files\\MongoDB\\Server\\5.0\\bin\\mongod.exe",
                                "C:\\Program Files\\MongoDB\\Server\\4.4\\bin\\mongod.exe",
                                "C:\\Program Files\\MongoDB\\Server\\4.2\\bin\\mongod.exe"
                            ]:
                                if os.path.exists(path):
                                    mongo_path = path
                                    break
                            
                            self.mongodb_process = subprocess.Popen(
                                [mongo_path],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT,
                                text=True,
                                shell=True
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
                            
                elif sys.platform.startswith('linux'):  # Linux
                    try:
                        # 尝试使用systemctl启动MongoDB
                        subprocess.run(
                            ["sudo", "systemctl", "start", "mongodb"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            check=True
                        )
                        self.log("使用systemctl启动MongoDB成功")
                        self.mongodb_running = True
                        self.update_ui_state()
                        return True
                    except subprocess.SubprocessError:
                        self.log("使用systemctl启动MongoDB失败，尝试直接启动")
                        # 尝试直接启动mongod
                        try:
                            self.mongodb_process = subprocess.Popen(
                                ["mongod"],
                                stdout=subprocess.PIPE,
                                stderr=subprocess.STDOUT,
                                text=True,
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
                    try:
                        # 尝试使用net stop命令停止MongoDB服务
                        subprocess.run(
                            ["net", "stop", "MongoDB"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            check=True,
                            shell=True
                        )
                        self.log("Windows服务停止MongoDB成功")
                    except subprocess.SubprocessError:
                        self.log("Windows服务停止MongoDB失败，检查是否有直接启动的进程")
                        
                elif sys.platform.startswith('linux'):  # Linux
                    try:
                        # 尝试使用systemctl停止MongoDB
                        subprocess.run(
                            ["sudo", "systemctl", "stop", "mongodb"],
                            stdout=subprocess.PIPE,
                            stderr=subprocess.STDOUT,
                            text=True,
                            check=True
                        )
                        self.log("使用systemctl停止MongoDB成功")
                    except subprocess.SubprocessError:
                        self.log("使用systemctl停止MongoDB失败，检查是否有直接启动的进程")
                        
                # 检查并终止直接启动的MongoDB进程
                if self.mongodb_process:
                    if sys.platform == 'win32':
                        subprocess.call(['taskkill', '/F', '/T', '/PID', str(self.mongodb_process.pid)])
                    else:
                        self.mongodb_process.terminate()
                        try:
                            self.mongodb_process.wait(timeout=5)
                        except subprocess.TimeoutExpired:
                            self.mongodb_process.kill()
                    self.mongodb_process = None
                    self.log("终止直接启动的MongoDB进程")
                
                # 等待MongoDB停止
                time.sleep(2)
                
                # 更新状态
                self.mongodb_running = False
                self.update_ui_state()
                
                self.log("MongoDB服务已停止")
                
            except Exception as e:
                self.log(f"停止MongoDB失败: {str(e)}")
                messagebox.showerror("错误", f"停止MongoDB失败: {str(e)}")
    
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
    # 检查Node.js是否安装
    try:
        subprocess.run(["node", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except (subprocess.SubprocessError, FileNotFoundError):
        print("错误: 未找到Node.js，请先安装Node.js")
        sys.exit(1)
    
    # 检查npm是否安装
    try:
        subprocess.run(["npm", "--version"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    except (subprocess.SubprocessError, FileNotFoundError):
        print("错误: 未找到npm，请先安装Node.js和npm")
        sys.exit(1)
    
    # 创建并运行GUI
    root = tk.Tk()
    app = ServerManager(root)
    root.mainloop()


if __name__ == "__main__":
    main()