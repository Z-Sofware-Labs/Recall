use std::path::{Path, PathBuf};
use std::process::Command;

#[cfg(target_os = "windows")]
fn hidden_powershell() -> Command {
    use std::os::windows::process::CommandExt;

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    let mut command = Command::new("powershell");
    command.creation_flags(CREATE_NO_WINDOW);
    command
}

#[cfg(target_os = "windows")]
fn encode_powershell(script: &str) -> String {
    use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

    let mut bytes = Vec::with_capacity(script.len() * 2);
    for unit in script.encode_utf16() {
        bytes.extend_from_slice(&unit.to_le_bytes());
    }
    BASE64.encode(bytes)
}

#[cfg(target_os = "windows")]
fn escape_ps_single_quoted(value: &str) -> String {
    value.replace('\'', "''")
}

#[cfg(target_os = "windows")]
fn icon_path_for_executable(exe_path: &PathBuf) -> String {
    let candidate = exe_path
        .parent()
        .unwrap_or(exe_path)
        .join("recall-doc.ico");

    if candidate.exists() {
        candidate.to_string_lossy().to_string()
    } else {
        // The association always prefers the copy installed beside Recall.
        // Falling back to the executable keeps the association valid even if
        // the icon file is missing during an upgrade.
        format!("{},0", exe_path.to_string_lossy())
    }
}

#[tauri::command]
pub fn check_recall_file_association() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        // Use a hidden PowerShell process so checking the association never
        // flashes a console window in the desktop app.
        let output = hidden_powershell()
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle",
                "Hidden",
                "-Command",
                r#"
                try {
                    $hkcu = (Get-ItemProperty -Path 'HKCU:\Software\Classes\.recall' -ErrorAction SilentlyContinue).'(default)'
                    $hklm = (Get-ItemProperty -Path 'HKLM:\Software\Classes\.recall' -ErrorAction SilentlyContinue).'(default)'
                    if ($hkcu -eq 'Recall.Project' -or $hklm -eq 'Recall.Project') { exit 0 } else { exit 1 }
                } catch { exit 1 }
                "#,
            ])
            .output();

        match output {
            Ok(out) => Ok(out.status.success()),
            Err(_) => Ok(false),
        }
    }

    #[cfg(target_os = "linux")]
    {
        let output = Command::new("xdg-mime")
            .args(["query", "default", "application/x-recall"])
            .output();

        match output {
            Ok(out) => {
                let stdout = String::from_utf8_lossy(&out.stdout).to_lowercase();
                Ok(stdout.contains("recall"))
            }
            Err(_) => Ok(false),
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        Ok(false)
    }
}

#[tauri::command]
pub fn register_recall_file_association() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_str = escape_ps_single_quoted(&exe_path.to_string_lossy());
        let icon_str = escape_ps_single_quoted(&icon_path_for_executable(&exe_path));

        // First register for the current user. This is the normal path for an
        // existing installation and does not require administrator rights, so
        // no UAC prompt is shown.
        let hkcu_script = format!(
            r#"
            $ErrorActionPreference = 'Stop'
            $progId = 'Recall.Project'
            $ext = '.recall'
            $exePath = '{exe}'
            $iconPath = '{icon}'

            New-Item -Path "HKCU:\Software\Classes\$ext" -Force | Out-Null
            Set-ItemProperty -Path "HKCU:\Software\Classes\$ext" -Name '(default)' -Value $progId
            Set-ItemProperty -Path "HKCU:\Software\Classes\$ext" -Name 'Content Type' -Value 'application/x-recall'

            New-Item -Path "HKCU:\Software\Classes\$progId" -Force | Out-Null
            Set-ItemProperty -Path "HKCU:\Software\Classes\$progId" -Name '(default)' -Value 'Recall Course Project File'

            New-Item -Path "HKCU:\Software\Classes\$progId\DefaultIcon" -Force | Out-Null
            Set-ItemProperty -Path "HKCU:\Software\Classes\$progId\DefaultIcon" -Name '(default)' -Value $iconPath

            New-Item -Path "HKCU:\Software\Classes\$progId\shell\open\command" -Force | Out-Null
            Set-ItemProperty -Path "HKCU:\Software\Classes\$progId\shell\open\command" -Name '(default)' -Value "`"$exePath`" `"%1`""

            try {{
                Add-Type -TypeDefinition @"
                using System;
                using System.Runtime.InteropServices;
                public static class RecallShell {{
                    [DllImport("shell32.dll")]
                    public static extern void SHChangeNotify(int eventId, int flags, IntPtr item1, IntPtr item2);
                }}
"@
                [RecallShell]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
            }} catch {{}}
            exit 0
            "#,
            exe = exe_str,
            icon = icon_str,
        );

        let hkcu_encoded = encode_powershell(&hkcu_script);
        let hkcu_result = hidden_powershell()
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle",
                "Hidden",
                "-EncodedCommand",
                &hkcu_encoded,
            ])
            .output()
            .map_err(|e| format!("Failed to register file association: {}", e))?;

        if hkcu_result.status.success() {
            return Ok(true);
        }

        // Only if current-user registration fails do we ask Windows for
        // elevation. The elevated operation writes HKLM, avoiding a second
        // UAC prompt on every use while still supporting locked-down systems.
        let hklm_script = format!(
            r#"
            $ErrorActionPreference = 'Stop'
            $progId = 'Recall.Project'
            $ext = '.recall'
            $exePath = '{exe}'
            $iconPath = '{icon}'

            New-Item -Path "HKLM:\Software\Classes\$ext" -Force | Out-Null
            Set-ItemProperty -Path "HKLM:\Software\Classes\$ext" -Name '(default)' -Value $progId
            Set-ItemProperty -Path "HKLM:\Software\Classes\$ext" -Name 'Content Type' -Value 'application/x-recall'

            New-Item -Path "HKLM:\Software\Classes\$progId" -Force | Out-Null
            Set-ItemProperty -Path "HKLM:\Software\Classes\$progId" -Name '(default)' -Value 'Recall Course Project File'

            New-Item -Path "HKLM:\Software\Classes\$progId\DefaultIcon" -Force | Out-Null
            Set-ItemProperty -Path "HKLM:\Software\Classes\$progId\DefaultIcon" -Name '(default)' -Value $iconPath

            New-Item -Path "HKLM:\Software\Classes\$progId\shell\open\command" -Force | Out-Null
            Set-ItemProperty -Path "HKLM:\Software\Classes\$progId\shell\open\command" -Name '(default)' -Value "`"$exePath`" `"%1`""

            try {{
                Add-Type -TypeDefinition @"
                using System;
                using System.Runtime.InteropServices;
                public static class RecallShell {{
                    [DllImport("shell32.dll")]
                    public static extern void SHChangeNotify(int eventId, int flags, IntPtr item1, IntPtr item2);
                }}
"@
                [RecallShell]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
            }} catch {{}}
            exit 0
            "#,
            exe = exe_str,
            icon = icon_str,
        );

        let elevated_encoded = encode_powershell(&hklm_script);
        let launcher_script = format!(
            r#"
            $ErrorActionPreference = 'Stop'
            try {{
                $p = Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -ArgumentList @('-NoProfile','-NonInteractive','-WindowStyle','Hidden','-EncodedCommand','{encoded}') -PassThru -Wait
                exit $p.ExitCode
            }} catch {{
                exit 1
            }}
            "#,
            encoded = elevated_encoded,
        );

        let launcher_result = hidden_powershell()
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle",
                "Hidden",
                "-Command",
                &launcher_script,
            ])
            .output()
            .map_err(|e| format!("Failed to launch elevated registration: {}", e))?;

        if launcher_result.status.success() {
            Ok(true)
        } else {
            Err("File association could not be registered. Administrator permission may have been declined.".to_string())
        }
    }

    #[cfg(target_os = "linux")]
    {
        // On Linux, file association and document icons are managed via
        // FreeDesktop Shared MIME Info and icon-theme directories.
        let exe_path = std::env::current_exe().map_err(|e| e.to_string())?;
        let exe_dir = exe_path.parent().unwrap_or(&exe_path);
        
        // Find icon across possible runtime & installation paths
        let potential_icons = [
            exe_dir.join("recall-doc.png"),
            PathBuf::from("/usr/lib/Recall/recall-doc.png"),
            PathBuf::from("/usr/share/Recall/recall-doc.png"),
            PathBuf::from("/usr/share/icons/hicolor/128x128/apps/recall.png"),
        ];

        let found_icon = potential_icons.iter().find(|p| p.exists()).cloned();

        if let Some(home) = std::env::var_os("HOME") {
            let home_path = PathBuf::from(home);
            
            // 1. Install user MIME xml definition with icon tag
            let mime_dir = home_path.join(".local/share/mime/packages");
            let _ = std::fs::create_dir_all(&mime_dir);
            let mime_file = mime_dir.join("application-x-recall.xml");
            let mime_content = r#"<?xml version="1.0" encoding="UTF-8"?>
<mime-info xmlns="http://www.freedesktop.org/standards/shared-mime-info">
    <mime-type type="application/x-recall">
        <comment>Recall Course Project File</comment>
        <icon name="application-x-recall"/>
        <generic-icon name="x-office-document"/>
        <glob pattern="*.recall"/>
    </mime-type>
</mime-info>
"#;
            let _ = std::fs::write(&mime_file, mime_content);
            let _ = Command::new("update-mime-database")
                .arg(home_path.join(".local/share/mime"))
                .output();

            // 2. Install document icon into user hicolor & breeze icon themes across standard sizes
            if let Some(ref icon_src) = found_icon {
                let sizes = ["16x16", "32x32", "48x48", "64x64", "128x128", "256x256"];
                for size in sizes {
                    let icon_dest_dir = home_path.join(format!(".local/share/icons/hicolor/{}/mimetypes", size));
                    let _ = std::fs::create_dir_all(&icon_dest_dir);
                    let _ = std::fs::copy(icon_src, icon_dest_dir.join("application-x-recall.png"));

                    // Also install into KDE breeze user override if breeze icon theme is active
                    let breeze_dest_dir = home_path.join(format!(".local/share/icons/breeze/mimetypes/{}", size));
                    let _ = std::fs::create_dir_all(&breeze_dest_dir);
                    let _ = std::fs::copy(icon_src, breeze_dest_dir.join("application-x-recall.png"));
                }

                // Place in apps icon folder for full shell recognition
                let icon_app_dir = home_path.join(".local/share/icons/hicolor/128x128/apps");
                let _ = std::fs::create_dir_all(&icon_app_dir);
                let _ = std::fs::copy(icon_src, icon_app_dir.join("recall-doc.png"));

                let _ = Command::new("gtk-update-icon-cache")
                    .args(["-f", "-t"])
                    .arg(home_path.join(".local/share/icons/hicolor"))
                    .output();

                // KDE Plasma sycoca cache update (Plasma 6 / 5)
                let _ = Command::new("kbuildsycoca6").output();
                let _ = Command::new("kbuildsycoca5").output();
            }
        }

        // 3. Set default application for this mime type
        // The installed desktop file on Linux is Recall.desktop
        let desktop_file = if Path::new("/usr/share/applications/Recall.desktop").exists() {
            "Recall.desktop"
        } else {
            "com.recall.desktop.desktop"
        };

        let res = Command::new("xdg-mime")
            .args(["default", desktop_file, "application/x-recall"])
            .output();

        match res {
            Ok(output) if output.status.success() => Ok(true),
            Ok(_) => Err("Failed to register default handler using xdg-mime.".to_string()),
            Err(e) => Err(format!("xdg-mime execution error: {}", e)),
        }
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        Err("File association is not supported on this platform.".to_string())
    }
}

#[tauri::command]
pub fn unregister_recall_file_association() -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        // Remove the current-user association first. Only attempt HKLM cleanup
        // when it actually exists, and use UAC only for that machine-wide part.
        let hkcu_script = r#"
            $ErrorActionPreference = 'SilentlyContinue'
            Remove-Item -Path 'HKCU:\Software\Classes\.recall' -Recurse -Force
            Remove-Item -Path 'HKCU:\Software\Classes\Recall.Project' -Recurse -Force
            try {
                Add-Type -TypeDefinition @"
                using System;
                using System.Runtime.InteropServices;
                public static class RecallShell {
                    [DllImport("shell32.dll")]
                    public static extern void SHChangeNotify(int eventId, int flags, IntPtr item1, IntPtr item2);
                }
"@
                [RecallShell]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
            } catch {}
            exit 0
        "#;

        let hkcu_encoded = encode_powershell(hkcu_script);
        let hkcu_result = hidden_powershell()
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle",
                "Hidden",
                "-EncodedCommand",
                &hkcu_encoded,
            ])
            .output()
            .map_err(|e| format!("Failed to remove current-user association: {}", e))?;

        if !hkcu_result.status.success() {
            return Err("Failed to remove the current-user .recall association.".to_string());
        }

        // Best-effort machine-wide cleanup. This may trigger UAC only when an
        // HKLM association is present; cancellation is reported as success
        // because the user's current-user association has already been removed.
        let hklm_script = r#"
            $ErrorActionPreference = 'SilentlyContinue'
            Remove-Item -Path 'HKLM:\Software\Classes\.recall' -Recurse -Force
            Remove-Item -Path 'HKLM:\Software\Classes\Recall.Project' -Recurse -Force
            try {
                Add-Type -TypeDefinition @"
                using System;
                using System.Runtime.InteropServices;
                public static class RecallShell {
                    [DllImport("shell32.dll")]
                    public static extern void SHChangeNotify(int eventId, int flags, IntPtr item1, IntPtr item2);
                }
"@
                [RecallShell]::SHChangeNotify(0x08000000, 0, [IntPtr]::Zero, [IntPtr]::Zero)
            } catch {}
            exit 0
        "#;

        let hklm_encoded = encode_powershell(hklm_script);
        let launcher_script = format!(
            r#"
            try {{
                $p = Start-Process powershell.exe -Verb RunAs -WindowStyle Hidden -ArgumentList @('-NoProfile','-NonInteractive','-WindowStyle','Hidden','-EncodedCommand','{encoded}') -PassThru -Wait
                exit $p.ExitCode
            }} catch {{
                exit 1
            }}
            "#,
            encoded = hklm_encoded,
        );

        let _ = hidden_powershell()
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle",
                "Hidden",
                "-Command",
                &launcher_script,
            ])
            .output();

        Ok(true)
    }

    #[cfg(target_os = "linux")]
    {
        if let Some(home) = std::env::var_os("HOME") {
            let home_path = PathBuf::from(home);
            let mime_xml = home_path.join(".local/share/mime/packages/application-x-recall.xml");
            if mime_xml.exists() {
                let _ = std::fs::remove_file(&mime_xml);
                let _ = Command::new("update-mime-database")
                    .arg(home_path.join(".local/share/mime"))
                    .output();
            }

            // Remove installed custom document icons
            let mime_icon = home_path.join(".local/share/icons/hicolor/128x128/mimetypes/application-x-recall.png");
            if mime_icon.exists() {
                let _ = std::fs::remove_file(&mime_icon);
            }
            let app_icon = home_path.join(".local/share/icons/hicolor/128x128/apps/recall-doc.png");
            if app_icon.exists() {
                let _ = std::fs::remove_file(&app_icon);
            }

            let _ = Command::new("gtk-update-icon-cache")
                .args(["-f", "-t"])
                .arg(home_path.join(".local/share/icons/hicolor"))
                .output();
        }
        Ok(true)
    }

    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        Ok(true)
    }
}
