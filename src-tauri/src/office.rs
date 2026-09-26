use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::process::{Child, Command};
use std::sync::OnceLock;
use std::time::{Duration, Instant};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use tempfile::TempDir;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

const DEFAULT_OFFICE_TIMEOUT_SECS: u64 = 90;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OfficeSuiteInfo {
    pub has_ms_office: bool,
    pub has_libreoffice: bool,
    pub preferred: String, // "ms_office" | "libreoffice" | "none"
    pub ms_office_version: Option<String>,
    pub libreoffice_path: Option<String>,
    pub platform: String,
}

static CACHED_OFFICE_INFO: OnceLock<OfficeSuiteInfo> = OnceLock::new();

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SlideImage {
    pub index: usize,
    pub name: String,
    pub file_path: String,
    pub data_url: String,
}

fn clean_path_str(p: &Path) -> String {
    let s = p.to_string_lossy().to_string();
    if s.starts_with(r"\\?\") {
        s[4..].to_string()
    } else {
        s
    }
}

/// Helper that runs a child process with a timeout, terminating the child if it exceeds the limit.
fn run_command_with_timeout(mut child: Child, timeout: Duration) -> Result<std::process::Output, String> {
    let start = Instant::now();
    loop {
        match child.try_wait() {
            Ok(Some(_status)) => {
                return child.wait_with_output().map_err(|e| format!("Failed to collect output: {}", e));
            }
            Ok(None) => {
                if start.elapsed() >= timeout {
                    let _ = child.kill();
                    let _ = child.wait();
                    return Err(format!("Process timed out after {} seconds and was terminated", timeout.as_secs()));
                }
                std::thread::sleep(Duration::from_millis(100));
            }
            Err(e) => {
                let _ = child.kill();
                return Err(format!("Error monitoring process: {}", e));
            }
        }
    }
}

#[tauri::command]
pub fn detect_office_suite() -> OfficeSuiteInfo {
    CACHED_OFFICE_INFO.get_or_init(detect_office_suite_internal).clone()
}

fn detect_office_suite_internal() -> OfficeSuiteInfo {
    let platform = std::env::consts::OS.to_string();
    #[allow(unused_mut)]
    let mut has_ms = false;
    let mut has_lo = false;
    #[allow(unused_mut)]
    let mut ms_ver = None;
    let mut lo_path = None;

    #[cfg(target_os = "windows")]
    {
        let potential_ms = [
            r"C:\Program Files\Microsoft Office\root\Office16\POWERPNT.EXE",
            r"C:\Program Files (x86)\Microsoft Office\root\Office16\POWERPNT.EXE",
            r"C:\Program Files\Microsoft Office\Office16\POWERPNT.EXE",
            r"C:\Program Files (x86)\Microsoft Office\Office16\POWERPNT.EXE",
            r"C:\Program Files\Microsoft Office\Office15\POWERPNT.EXE",
            r"C:\Program Files (x86)\Microsoft Office\Office15\POWERPNT.EXE",
            r"C:\Program Files\Microsoft Office\Office14\POWERPNT.EXE",
            r"C:\Program Files (x86)\Microsoft Office\Office14\POWERPNT.EXE",
        ];

        for path in potential_ms {
            if Path::new(path).exists() {
                has_ms = true;
                ms_ver = Some("Installed".to_string());
                break;
            }
        }

        if !has_ms {
            let mut ps_cmd = Command::new("powershell");
            ps_cmd.args([
                "-NoProfile",
                "-NonInteractive",
                "-WindowStyle", "Hidden",
                "-Command",
                "try { $p = New-Object -ComObject PowerPoint.Application; $v = $p.Version; $p.Quit(); [System.Runtime.InteropServices.Marshal]::ReleaseComObject($p) | Out-Null; [System.GC]::Collect(); Write-Output $v } catch { exit 1 }"
            ]);
            ps_cmd.creation_flags(CREATE_NO_WINDOW);

            if let Ok(child) = ps_cmd.spawn() {
                if let Ok(output) = run_command_with_timeout(child, Duration::from_secs(10)) {
                    if output.status.success() {
                        let ver = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        if !ver.is_empty() {
                            has_ms = true;
                            ms_ver = Some(ver);
                        }
                    }
                }
            }
        }

        let potential_lo = [
            r"C:\Program Files\LibreOffice\program\soffice.exe",
            r"C:\Program Files (x86)\LibreOffice\program\soffice.exe",
        ];

        for path in potential_lo {
            if Path::new(path).exists() {
                has_lo = true;
                lo_path = Some(path.to_string());
                break;
            }
        }

        if !has_lo {
            let mut where_cmd = Command::new("where.exe");
            where_cmd.arg("soffice");
            where_cmd.creation_flags(CREATE_NO_WINDOW);

            if let Ok(output) = where_cmd.output() {
                if output.status.success() {
                    let p = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !p.is_empty() {
                        has_lo = true;
                        lo_path = Some(p);
                    }
                }
            }
        }
    }

    #[cfg(target_os = "macos")]
    {
        // Robust macOS check: System-wide and Per-User directories
        let mut home_apps = PathBuf::from("/");
        if let Ok(h) = std::env::var("HOME") {
            home_apps = Path::new(&h).join("Applications");
        }

        let ms_paths = [
            PathBuf::from("/Applications/Microsoft PowerPoint.app"),
            home_apps.join("Microsoft PowerPoint.app"),
        ];

        for p in &ms_paths {
            if p.exists() {
                has_ms = true;
                ms_ver = Some("Installed".to_string());
                break;
            }
        }

        let lo_paths = [
            PathBuf::from("/Applications/LibreOffice.app/Contents/MacOS/soffice"),
            home_apps.join("LibreOffice.app/Contents/MacOS/soffice"),
            PathBuf::from("/usr/local/bin/soffice"),
            PathBuf::from("/opt/homebrew/bin/soffice"),
        ];

        for p in &lo_paths {
            if p.exists() {
                has_lo = true;
                lo_path = Some(p.to_string_lossy().to_string());
                break;
            }
        }

        if !has_lo {
            if let Ok(output) = Command::new("which").arg("soffice").output() {
                if output.status.success() {
                    let p = String::from_utf8_lossy(&output.stdout).trim().to_string();
                    if !p.is_empty() && Path::new(&p).exists() {
                        has_lo = true;
                        lo_path = Some(p);
                    }
                }
            }
        }
    }

    #[cfg(target_os = "linux")]
    {
        let potential_lo = [
            "/usr/bin/soffice",
            "/usr/local/bin/soffice",
            "/usr/bin/libreoffice",
            "/usr/local/bin/libreoffice",
            "/var/lib/flatpak/exports/bin/org.libreoffice.LibreOffice",
            "/snap/bin/libreoffice",
        ];

        for path in potential_lo {
            if Path::new(path).exists() {
                has_lo = true;
                lo_path = Some(path.to_string());
                break;
            }
        }

        if !has_lo {
            if let Ok(home) = std::env::var("HOME") {
                let user_flatpak = Path::new(&home)
                    .join(".local/share/flatpak/exports/bin/org.libreoffice.LibreOffice");
                if user_flatpak.exists() {
                    has_lo = true;
                    lo_path = Some(user_flatpak.to_string_lossy().to_string());
                }
            }
        }

        if !has_lo {
            let scan_dirs = ["/usr/bin", "/usr/local/bin"];
            for dir in scan_dirs {
                if let Ok(entries) = fs::read_dir(dir) {
                    for entry in entries.flatten() {
                        let file_name = entry.file_name();
                        let name_str = file_name.to_string_lossy();
                        if (name_str.starts_with("libreoffice") || name_str.starts_with("soffice"))
                            && name_str != "libreoffice-from-scratch"
                        {
                            let candidate = entry.path();
                            if candidate.is_file() {
                                has_lo = true;
                                lo_path = Some(candidate.to_string_lossy().to_string());
                                break;
                            }
                        }
                    }
                }
                if has_lo {
                    break;
                }
            }
        }

        if !has_lo {
            if let Ok(entries) = fs::read_dir("/opt") {
                for entry in entries.flatten() {
                    let file_name = entry.file_name();
                    let name_str = file_name.to_string_lossy();
                    if name_str.starts_with("libreoffice") || name_str.starts_with("openoffice") {
                        let soffice_bin = entry.path().join("program").join("soffice");
                        if soffice_bin.exists() {
                            has_lo = true;
                            lo_path = Some(soffice_bin.to_string_lossy().to_string());
                            break;
                        }
                    }
                }
            }
        }

        if !has_lo {
            for bin in ["soffice", "libreoffice"] {
                if let Ok(output) = Command::new("which").arg(bin).output() {
                    if output.status.success() {
                        let p = String::from_utf8_lossy(&output.stdout).trim().to_string();
                        if !p.is_empty() && Path::new(&p).exists() {
                            has_lo = true;
                            lo_path = Some(p);
                            break;
                        }
                    }
                }
            }
        }
    }

    let preferred = if (platform == "windows" || platform == "macos") && has_ms {
        "ms_office".to_string()
    } else if has_lo {
        "libreoffice".to_string()
    } else if has_ms {
        "ms_office".to_string()
    } else {
        "none".to_string()
    };

    OfficeSuiteInfo {
        has_ms_office: has_ms,
        has_libreoffice: has_lo,
        preferred,
        ms_office_version: ms_ver,
        libreoffice_path: lo_path,
        platform,
    }
}

#[tauri::command]
pub async fn convert_pptx_to_slides(
    _app: tauri::AppHandle,
    pptx_path: String,
    engine: Option<String>,
) -> Result<Vec<SlideImage>, String> {
    let pptx_file = PathBuf::from(&pptx_path);
    if !pptx_file.exists() {
        return Err(format!("File does not exist: {}", pptx_path));
    }

    let detected = detect_office_suite();
    let selected_engine = engine.unwrap_or(detected.preferred);

    // RAII TempDir ensures directory and all intermediate files are cleaned up on success, failure, or panic
    let temp_dir_handle = TempDir::new().map_err(|e| format!("Failed to create RAII temp dir: {}", e))?;
    let temp_dir = temp_dir_handle.path();

    let abs_pptx = clean_path_str(&fs::canonicalize(&pptx_file).unwrap_or(pptx_file.clone()));
    let abs_out = clean_path_str(&fs::canonicalize(temp_dir).unwrap_or(temp_dir.to_path_buf()));

    let timeout = Duration::from_secs(DEFAULT_OFFICE_TIMEOUT_SECS);

    if selected_engine == "ms_office" {
        #[cfg(target_os = "windows")]
        {
            let script = format!(
                "$pptx = '{}';\n\
                 $outDir = '{}';\n\
                 $p = $null;\n\
                 $pres = $null;\n\
                 try {{\n\
                     $p = New-Object -ComObject PowerPoint.Application;\n\
                     $pres = $p.Presentations.Open($pptx, [Microsoft.Office.Core.MsoTriState]::msoTrue, [Microsoft.Office.Core.MsoTriState]::msoFalse, [Microsoft.Office.Core.MsoTriState]::msoFalse);\n\
                     $sw = $pres.PageSetup.SlideWidth;\n\
                     $sh = $pres.PageSetup.SlideHeight;\n\
                     $targetWidth = 1920;\n\
                     $targetHeight = 1080;\n\
                     if ($sw -gt 0 -and $sh -gt 0) {{\n\
                         $targetHeight = [int][Math]::Round($targetWidth * ($sh / $sw));\n\
                     }}\n\
                     $count = $pres.Slides.Count;\n\
                     for ($i = 1; $i -le $count; $i++) {{\n\
                         $slide = $pres.Slides.Item($i);\n\
                         $slidePath = Join-Path $outDir ('Slide' + $i + '.png');\n\
                         $slide.Export($slidePath, 'PNG', $targetWidth, $targetHeight);\n\
                     }}\n\
                 }} catch {{\n\
                     Write-Error $_.Exception.Message;\n\
                     exit 1;\n\
                 }} finally {{\n\
                     if ($pres -ne $null) {{\n\
                         $pres.Close();\n\
                         [System.Runtime.InteropServices.Marshal]::ReleaseComObject($pres) | Out-Null;\n\
                     }}\n\
                     if ($p -ne $null) {{\n\
                         $p.Quit();\n\
                         [System.Runtime.InteropServices.Marshal]::ReleaseComObject($p) | Out-Null;\n\
                     }}\n\
                     [System.GC]::Collect();\n\
                     [System.GC]::WaitForPendingFinalizers();\n\
                 }}",
                abs_pptx.replace("'", "''"),
                abs_out.replace("'", "''")
            );

            let mut ps_cmd = Command::new("powershell");
            ps_cmd.args(["-NoProfile", "-NonInteractive", "-WindowStyle", "Hidden", "-Command", &script]);
            ps_cmd.creation_flags(CREATE_NO_WINDOW);

            let child = ps_cmd.spawn().map_err(|e| format!("Failed to spawn PowerPoint COM process: {}", e))?;
            let res = run_command_with_timeout(child, timeout)?;

            if !res.status.success() {
                let err = String::from_utf8_lossy(&res.stderr);
                let out = String::from_utf8_lossy(&res.stdout);
                return Err(format!("PowerPoint export failed: {} {}", err, out));
            }
        }
        #[cfg(not(target_os = "windows"))]
        {
            return Err("Microsoft Office COM export is only supported on Windows in this build.".to_string());
        }
    } else if selected_engine == "libreoffice" {
        let lo_bin = detected.libreoffice_path.unwrap_or_else(|| "soffice".to_string());

        let mut lo_cmd = Command::new(&lo_bin);
        lo_cmd.args([
            "--headless",
            "--convert-to",
            "html:Impress_HTML_Export",
            &abs_pptx,
            "--outdir",
            &abs_out,
        ]);
        #[cfg(target_os = "windows")]
        lo_cmd.creation_flags(CREATE_NO_WINDOW);

        let child = lo_cmd.spawn().map_err(|e| format!("Failed to spawn LibreOffice: {}", e))?;
        let res = run_command_with_timeout(child, timeout);
        let mut has_images = false;

        if let Ok(ref output) = res {
            if output.status.success() {
                if let Ok(entries) = fs::read_dir(temp_dir) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if let Some(ext) = path.extension() {
                            let ext_str = ext.to_string_lossy().to_lowercase();
                            if ext_str == "png" || ext_str == "jpg" || ext_str == "jpeg" || ext_str == "gif" {
                                has_images = true;
                                break;
                            }
                        }
                    }
                }
            }
        }

        if !has_images {
            let mut lo_png_cmd = Command::new(&lo_bin);
            lo_png_cmd.args([
                "--headless",
                "--convert-to",
                "png",
                &abs_pptx,
                "--outdir",
                &abs_out,
            ]);
            #[cfg(target_os = "windows")]
            lo_png_cmd.creation_flags(CREATE_NO_WINDOW);

            let child_png = lo_png_cmd.spawn().map_err(|e| format!("Failed to spawn LibreOffice fallback: {}", e))?;
            let png_res = run_command_with_timeout(child_png, timeout)?;

            if !png_res.status.success() {
                let err = String::from_utf8_lossy(&png_res.stderr);
                return Err(format!("LibreOffice conversion failed: {}", err));
            }
        }
    } else {
        return Err("No supported Office suite available for conversion.".to_string());
    }

    // Collect all generated images (.PNG or .JPG) in temp_dir
    let mut slide_files: Vec<PathBuf> = Vec::new();
    if let Ok(entries) = fs::read_dir(temp_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if let Some(ext) = path.extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                if ext_str == "png" || ext_str == "jpg" || ext_str == "jpeg" {
                    slide_files.push(path);
                }
            }
        }
    }

    slide_files.sort_by_key(|p| {
        let name = p.file_stem().unwrap_or_default().to_string_lossy();
        extract_number(&name)
    });

    let mut result = Vec::new();
    for (i, path) in slide_files.iter().enumerate() {
        let file_bytes = fs::read(path).map_err(|e| format!("Failed to read slide image: {}", e))?;
        let base64_str = BASE64.encode(&file_bytes);
        let data_url = format!("data:image/png;base64,{}", base64_str);

        result.push(SlideImage {
            index: i + 1,
            name: format!("Slide {}", i + 1),
            file_path: path.to_string_lossy().to_string(),
            data_url,
        });
    }

    if result.is_empty() {
        return Err("No slides were generated from the PowerPoint presentation.".to_string());
    }

    // temp_dir_handle goes out of scope here and automatically deletes the temporary directory and all files
    Ok(result)
}

fn extract_number(s: &str) -> u32 {
    let digits: String = s.chars().filter(|c| c.is_ascii_digit()).collect();
    digits.parse::<u32>().unwrap_or(0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_number() {
        assert_eq!(extract_number("Slide1.PNG"), 1);
        assert_eq!(extract_number("Slide12.PNG"), 12);
        assert_eq!(extract_number("Presentation_slide_300.jpeg"), 300);
        assert_eq!(extract_number("noslide"), 0);
    }

    #[test]
    fn test_office_suite_detection_does_not_panic() {
        let info = detect_office_suite();
        assert!(!info.platform.is_empty());
    }
}
