# Copyright (c) Meta Platforms, Inc. and affiliates.
import os
import subprocess
import requests
import urllib.parse
import urllib3
import logging
from abc import ABC, abstractmethod
from typing import Optional

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Create logger for this module
logger = logging.getLogger(__name__)


class EmulatorBackend(ABC):
    """
    Abstract base class for emulator backend implementations.
    This defines the interface for all emulator-specific operations like
    executing commands, pushing/pulling files, and reading file contents.
    """
    
    @abstractmethod
    def execute_command(self, command, is_shell: bool = False):
        """
        Execute a command on the emulator.
        
        Args:
            command (str or list): The command to execute
            is_shell (bool): Whether this is a shell command
            
        Returns:
            The result of command execution
        """
        pass
    
    @abstractmethod
    def run_shell_with_output(self, command: str) -> Optional[str]:
        """
        Execute a shell command on the emulator and return its stdout.
        
        Unlike execute_command, this always captures and returns the output.
        
        Args:
            command: The shell command to execute on the device
            
        Returns:
            The command's stdout as a string, or None if the command failed
        """
        pass
    
    @abstractmethod
    def push_file(self, local_file: str, remote_file: str) -> bool:
        """
        Push a file from local system to emulator.
        
        Args:
            local_file (str): Path to local file
            remote_file (str): Path on emulator
            
        Returns:
            bool: True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    def pull_file(self, remote_file: str, local_file: str) -> bool:
        """
        Pull a file from emulator to local system.
        
        Args:
            remote_file (str): Path on emulator
            local_file (str): Path to local file
            
        Returns:
            bool: True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    def read_file(self, remote_file: str) -> Optional[str]:
        """
        Read contents of a file on the emulator.
        
        Args:
            remote_file (str): Path to file on emulator
            
        Returns:
            str: File contents, or None if failed
        """
        pass
    
    @abstractmethod
    def file_exists(self, remote_file: str) -> bool:
        """
        Check if a file exists on the emulator.
        
        Args:
            remote_file (str): Path to file on emulator
            
        Returns:
            bool: True if file exists, False otherwise
        """
        pass
    
    @abstractmethod
    def directory_exists(self, remote_dir: str) -> bool:
        """
        Check if a directory exists on the emulator.

        Args:
            remote_dir (str): Path to directory on emulator

        Returns:
            bool: True if directory exists, False otherwise
        """
        pass
    
    @abstractmethod
    def install_apk(self, apk_path: str) -> bool:
        """
        Install an APK on the emulator.
        
        Args:
            apk_path (str): Local path to the APK file
            
        Returns:
            bool: True if successful, False otherwise
        """
        pass


class ADBBackend(EmulatorBackend):
    """
    Backend implementation using Android Debug Bridge (ADB) for emulator interactions.
    Uses logging to control verbosity - set to DEBUG level to see command output.
    """
    
    def __init__(self, device_serial: Optional[str] = None):
        """
        Initialize ADB backend.
        
        Args:
            device_serial: Optional device serial for targeting specific devices.
                          Examples: "emulator-5554", "192.168.1.100:5555"
                          If None, uses default device (first/only connected).
                          For remote devices (ip:port format), auto-connects via `adb connect`.
        
        Note:
            Command output visibility is controlled by logging level:
            - DEBUG level: Shows all command output
            - INFO and above: Suppresses command output
        """
        self.device_serial = device_serial
        self.logger = logging.getLogger(f"{__name__}.ADBBackend")
        
        # Auto-connect if device_serial looks like a remote address (ip:port)
        if device_serial and self._is_remote_address(device_serial):
            self._connect_remote(device_serial)
    
    def _is_remote_address(self, serial: str) -> bool:
        """Check if serial looks like a remote address (ip:port or hostname:port)."""
        # Local emulators use "emulator-XXXX" format
        if serial.startswith("emulator-"):
            return False
        # USB devices don't have colons typically
        # Remote addresses have format "host:port"
        return ":" in serial
    
    def _connect_remote(self, address: str):
        """Connect to remote ADB device if not already connected.
        
        Args:
            address: Remote device address in "ip:port" or "hostname:port" format
            
        Raises:
            Exception: If connection fails
        """
        self.logger.info(f"Connecting to remote device: {address}")
        result = subprocess.run(
            ["adb", "connect", address],
            capture_output=True, text=True
        )
        output = result.stdout.lower() + result.stderr.lower()
        
        if "connected" in output or "already" in output:
            self.logger.info(f"Successfully connected to {address}")
        else:
            raise Exception(f"Failed to connect to {address}: {result.stdout} {result.stderr}")
    
    def _adb_command(self, *args) -> list:
        """Build ADB command with optional device targeting.
        
        Args:
            *args: Command arguments to append after 'adb' (and optional '-s <serial>')
            
        Returns:
            List of command parts ready for subprocess
        """
        if self.device_serial:
            return ["adb", "-s", self.device_serial] + list(args)
        return ["adb"] + list(args)
    
    def execute_command(self, command, is_shell: bool = False):
        """
        Execute an ADB command.
        
        Args:
            command (str or list): The command to execute. If is_shell=True and command is a string,
                                  it will be wrapped with ["adb", "shell", command] as a list.
            is_shell (bool): Whether this is a shell command that should be executed via "adb shell"
        """
        try:
            # If it's a shell command (string), convert to list format for proper execution
            if is_shell and isinstance(command, str):
                command = self._adb_command("shell", command)
                is_shell = False  # Use list format with shell=False for proper argument handling
            
            # Show output only when logger is at DEBUG level
            if self.logger.isEnabledFor(logging.DEBUG):
                subprocess.run(command, check=True, shell=is_shell)
            else:
                subprocess.run(command, check=True, shell=is_shell, capture_output=True)
        except subprocess.CalledProcessError as e:
            raise Exception(f"ADB Command Failed: {e}")
            
    def push_file(self, local_file: str, remote_file: str) -> bool:
        """Push a file using ADB."""
        try:
            command = self._adb_command("push", local_file, remote_file)
            if self.logger.isEnabledFor(logging.DEBUG):
                subprocess.run(command, check=True)
            else:
                subprocess.run(command, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to push file: {e}")
            
    def pull_file(self, remote_file: str, local_file: str) -> bool:
        """Pull a file using ADB."""
        try:
            command = self._adb_command("pull", remote_file, local_file)
            if self.logger.isEnabledFor(logging.DEBUG):
                subprocess.run(command, check=True)
            else:
                subprocess.run(command, check=True, capture_output=True)
            return os.path.exists(local_file) and os.path.getsize(local_file) > 0
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to pull file: {e}")
            
    def read_file(self, remote_file: str) -> Optional[str]:
        """Read a file using ADB."""
        try:
            command = self._adb_command("shell", f"cat {remote_file}")
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            raise Exception(f"Failed to read file: {e}")
            
    def file_exists(self, remote_file: str) -> bool:
        """Check if file exists using ADB."""
        command = self._adb_command("shell", f"[ -f {remote_file} ]")
        result = subprocess.run(command, capture_output=True)
        return result.returncode == 0

    def directory_exists(self, remote_dir: str) -> bool:
        """Check if directory exists using ADB."""
        command = self._adb_command("shell", f"[ -d {remote_dir} ]")
        result = subprocess.run(command, capture_output=True)
        return result.returncode == 0
    
    def install_apk(self, apk_path: str) -> bool:
        """Install an APK using ADB."""
        try:
            command = self._adb_command("install", "-r", apk_path)
            if self.logger.isEnabledFor(logging.DEBUG):
                subprocess.run(command, check=True)
            else:
                subprocess.run(command, check=True, capture_output=True)
            return True
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Failed to install APK: {e}")
            return False

    def run_shell_with_output(self, command: str) -> Optional[str]:
        """Execute a shell command via ADB and return its stdout."""
        try:
            full_command = self._adb_command("shell", command)
            result = subprocess.run(full_command, capture_output=True, text=True, check=True)
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Shell command failed: {e}")
            return None


class GenymotionBackend(EmulatorBackend):
    """
    Backend implementation using Genymotion's HTTP API for emulator interactions.
    """
    
    def __init__(self, ip: str = None, username: str = None, password: str = None, use_env_variables: bool = True,
                 shell_timeout: Optional[int] = None, file_transfer_timeout: Optional[int] = None,
                 install_timeout: Optional[int] = None):
        """Initialize Genymotion backend with optional timeout overrides."""
        if use_env_variables:
            self.ip = os.getenv("GENY_IP")
            self.username = os.getenv("GENY_USERNAME")
            self.password = os.getenv("GENY_PASSWORD")
        else:
            self.ip = ip
            self.username = username
            self.password = password

        if not self.ip or not self.username or not self.password:
            raise Exception("Genymotion backend requires GENY_IP, GENY_USERNAME, and GENY_PASSWORD to be configured")
        
        self.temp_dir = "/sdcard/MockApps"
        self._ensure_temp_directory()
        self.shell_timeout = shell_timeout or 3
        self.file_transfer_timeout = file_transfer_timeout or 30
        self.install_timeout = install_timeout or 30
    
    def _send_shell_command(self, command: str, timeout: Optional[int] = None):
        """Send a shell command to the emulator via HTTP API."""
        url = f"https://{self.ip}:443/api/v1/android/shell"
        headers = {
            "accept": "text/plain",
            "Content-Type": "application/json"
        }
        commands = [f"su -c '{command}'"]
        data = {
            "commands": commands,
            "timeout_in_seconds": timeout
        }
        response = requests.post(url, auth=(self.username, self.password), json=data, headers=headers, verify=False)
        if response.status_code == 200:
            return response.content
        return None
    
    def _ensure_temp_directory(self):
        """Ensure temporary directory exists on emulator."""
        command = f"mkdir -p {self.temp_dir}"
        result = self._send_shell_command(command)
        if result is None:
            raise Exception(f"Temporary directory {self.temp_dir} is ready")
    
    def execute_command(self, command, is_shell: bool = False):
        """Execute a command via Genymotion API."""
        if isinstance(command, list):
            command = " ".join(command)
        return self._send_shell_command(command)
    
    def push_file(self, local_file: str, remote_file: str) -> bool:
        """Push a file using Genymotion HTTP API."""
        if not os.path.exists(local_file):
            raise Exception(f"Local file does not exist: {local_file}")
            
        with open(local_file, 'rb') as f:
            file_data = f.read()
        
        temp_filename = os.path.basename(remote_file)
        temp_path = f"{self.temp_dir}/{temp_filename}"
        
        encoded_path = urllib.parse.quote(temp_path)
        url = f"https://{self.ip}/api/v1/files?path={encoded_path}"
        
        headers = {"Content-Type": "application/octet-stream"}
        
        response = requests.put(
            url,
            auth=(self.username, self.password),
            headers=headers,
            data=file_data,
            verify=False,
            timeout=self.file_transfer_timeout
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to upload file to emulator temp path. Status code: {response.status_code}")
        
        dest_dir = os.path.dirname(remote_file)
        mkdir_command = f"mkdir -p {dest_dir}"
        self._send_shell_command(mkdir_command)
        
        move_command = f"mv {temp_path} {remote_file}"
        move_result = self._send_shell_command(move_command)
        
        if move_result is not None:
            return True
        else:
            cleanup_command = f"rm -f {temp_path}"
            self._send_shell_command(cleanup_command)
            return False
    
    def pull_file(self, remote_file: str, local_file: str) -> bool:
        """Pull a file using Genymotion HTTP API."""
        temp_filename = os.path.basename(remote_file)
        temp_path = f"{self.temp_dir}/{temp_filename}"
        
        copy_command = f"cp {remote_file} {temp_path}"
        copy_result = self._send_shell_command(copy_command)
        
        if copy_result is None:
            raise Exception(f"Failed to copy file from {remote_file} to temp path {temp_path}")
        
        encoded_path = urllib.parse.quote(temp_path)
        url = f"https://{self.ip}/api/v1/files?path={encoded_path}"
        
        response = requests.get(
            url,
            auth=(self.username, self.password),
            verify=False,
            timeout=self.file_transfer_timeout
        )
        
        if response.status_code == 200:
            try:
                local_dir = os.path.dirname(local_file)
                if local_dir:
                    os.makedirs(local_dir, exist_ok=True)
                
                with open(local_file, 'wb') as f:
                    f.write(response.content)
                
                cleanup_command = f"rm -f {temp_path}"
                self._send_shell_command(cleanup_command)
                
                return True
            except Exception as e:
                print(f"Failed to save file locally: {e}")
                return False
        else:
            cleanup_command = f"rm -f {temp_path}"
            self._send_shell_command(cleanup_command)
            return False
    
    def read_file(self, remote_file: str) -> Optional[str]:
        """Read a file using Genymotion HTTP API."""
        command = f"cat {remote_file}"
        result = self._send_shell_command(command)
        if result is not None:
            return result.decode('utf-8').strip()
        return None
    
    def file_exists(self, remote_file: str) -> bool:
        """Check if file exists using Genymotion HTTP API."""
        command = f"test -f {remote_file} && echo exists || echo not_found"
        result = self._send_shell_command(command)
        return result is not None and b'exists' in result
    
    def directory_exists(self, remote_dir: str) -> bool:
        command = f"test -d {remote_dir} && echo exists || echo not_found"
        result = self._send_shell_command(command)
        return result is not None and b"exists" in result
    
    def install_apk(self, apk_path: str) -> bool:
        """Install an APK using Genymotion HTTP API."""
        if not os.path.exists(apk_path):
            raise Exception(f"APK file does not exist: {apk_path}")
        
        # Push APK to emulator first
        remote_path = f"{self.temp_dir}/{os.path.basename(apk_path)}"
        if not self.push_file(apk_path, remote_path):
            return False
        
        # Install from the remote path with increased timeout
        command = f"pm install -r {remote_path}"
        url = f"https://{self.ip}:443/api/v1/android/shell"
        headers = {
            "accept": "text/plain",
            "Content-Type": "application/json"
        }
        data = {
            "commands": [f"su -c '{command}'"],
            "timeout_in_seconds": self.install_timeout
        }
        response = requests.post(url, auth=(self.username, self.password), json=data, headers=headers, verify=False,
                                 timeout=self.install_timeout)
        
        # Clean up the APK file
        cleanup_command = f"rm -f {remote_path}"
        self._send_shell_command(cleanup_command)
        
        return response.status_code == 200

    def run_shell_with_output(self, command: str) -> Optional[str]:
        """Execute a shell command via Genymotion API and return its stdout."""
        result = self._send_shell_command(command)
        if result is not None:
            return result.decode('utf-8').strip()
        return None

    def set_timeouts(self, shell_timeout: Optional[int] = None, file_transfer_timeout: Optional[int] = None,
                     install_timeout: Optional[int] = None):
        """Update timeout configuration for shell, file transfers, or installs."""
        if shell_timeout is not None:
            self.shell_timeout = shell_timeout
        if file_transfer_timeout is not None:
            self.file_transfer_timeout = file_transfer_timeout
        if install_timeout is not None:
            self.install_timeout = install_timeout
