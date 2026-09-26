use std::fs::{self, File};
use std::io::Write;
use std::path::Path;
use tauri::Manager;

#[tauri::command]
pub fn get_default_project_directory(app_handle: tauri::AppHandle) -> Result<String, String> {
    let doc_dir = app_handle
        .path()
        .document_dir()
        .map_err(|e| format!("Failed to get documents directory: {}", e))?;
    let recall_dir = doc_dir.join("Recall");
    if !recall_dir.exists() {
        let _ = fs::create_dir_all(&recall_dir);
    }
    Ok(recall_dir.to_string_lossy().to_string())
}

/// Atomic file write function.
/// Writes to `{file_path}.tmp.{uuid}`, fsyncs, optionally creates a `.bak` of existing target,
/// and renames temp file to target. On failure, cleans up the temporary file.
pub fn atomic_write_bytes(target_path: &Path, bytes: &[u8], create_backup: bool) -> Result<(), String> {
    let parent = target_path.parent().unwrap_or_else(|| Path::new("."));
    if !parent.exists() {
        fs::create_dir_all(parent).map_err(|e| format!("Failed to create parent directory: {}", e))?;
    }

    let uuid_suffix = format!("{}_{}", std::process::id(), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_nanos());
    let tmp_file_name = format!("{}.tmp.{}", target_path.file_name().and_then(|n| n.to_str()).unwrap_or("file"), uuid_suffix);
    let tmp_path = parent.join(tmp_file_name);

    let write_res = (|| -> Result<(), std::io::Error> {
        let mut file = File::create(&tmp_path)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        Ok(())
    })();

    if let Err(e) = write_res {
        let _ = fs::remove_file(&tmp_path);
        return Err(format!("Failed to write to temporary file: {}", e));
    }

    // If target exists and backup requested, create .bak safely
    if target_path.exists() && create_backup {
        let bak_path = target_path.with_extension(format!("{}.bak", target_path.extension().and_then(|s| s.to_str()).unwrap_or("recall")));
        // Best effort backup copy
        let _ = fs::copy(target_path, &bak_path);
    }

    // Windows atomic replace semantics:
    // If target exists on Windows, fs::rename may fail if target exists without prior removal or replace.
    // Use fallback replace strategy for cross-platform resilience.
    #[cfg(target_os = "windows")]
    {
        // If target file exists, rename or remove with retry
        if target_path.exists() {
            let old_swap = parent.join(format!("{}.old.{}", target_path.file_name().and_then(|n| n.to_str()).unwrap_or("file"), uuid_suffix));
            if fs::rename(target_path, &old_swap).is_ok() {
                if let Err(rename_err) = fs::rename(&tmp_path, target_path) {
                    // Try to restore old
                    let _ = fs::rename(&old_swap, target_path);
                    let _ = fs::remove_file(&tmp_path);
                    return Err(format!("Failed to commit atomic rename: {}", rename_err));
                }
                let _ = fs::remove_file(&old_swap);
                return Ok(());
            } else {
                // If rename failed (e.g. lock), attempt direct copy or remove
                if let Err(e) = fs::remove_file(target_path) {
                    let _ = fs::remove_file(&tmp_path);
                    return Err(format!("Failed to remove existing file during atomic write: {}", e));
                }
            }
        }
    }

    if let Err(e) = fs::rename(&tmp_path, target_path) {
        let _ = fs::remove_file(&tmp_path);
        return Err(format!("Atomic rename failed: {}", e));
    }

    Ok(())
}

#[tauri::command]
pub fn save_project_file(file_path: String, content: String) -> Result<bool, String> {
    let path = Path::new(&file_path);
    atomic_write_bytes(path, content.as_bytes(), true)?;
    Ok(true)
}

#[tauri::command]
pub fn save_binary_file(file_path: String, base64_content: String) -> Result<bool, String> {
    use base64::Engine;
    let path = Path::new(&file_path);
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_content)
        .map_err(|e| format!("Failed to decode base64 content: {}", e))?;

    atomic_write_bytes(path, &bytes, false)?;
    Ok(true)
}

#[tauri::command]
pub fn load_project_file(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        // Check if a backup exists
        let bak_path = path.with_extension(format!("{}.bak", path.extension().and_then(|s| s.to_str()).unwrap_or("recall")));
        if bak_path.exists() {
            return Err(format!("Project file does not exist, but a recovery backup was found at '{}'.", bak_path.display()));
        }
        return Err(format!("File does not exist: {}", file_path));
    }

    let content = fs::read_to_string(path).map_err(|e| format!("Failed to read project file: {}", e))?;
    Ok(content)
}

#[tauri::command]
pub fn get_cli_startup_file() -> Option<String> {
    let args: Vec<String> = std::env::args().collect();
    for arg in args.into_iter().skip(1) {
        if !arg.starts_with('-') && !arg.starts_with('/') {
            let path = Path::new(&arg);
            if path.exists() {
                let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
                if ext.eq_ignore_ascii_case("recall") || ext.eq_ignore_ascii_case("json") {
                    return Some(path.to_string_lossy().to_string());
                }
            }
        }
    }
    None
}

/// Cross-platform opener:
/// Windows: cmd /c start "" "<file_path>"
/// macOS: open "<file_path>"
/// Linux: xdg-open "<file_path>"
#[tauri::command]
pub fn open_in_browser(file_path: String) -> Result<bool, String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        std::process::Command::new("cmd")
            .args(&["/C", "start", "", &file_path])
            .creation_flags(CREATE_NO_WINDOW)
            .spawn()
            .map_err(|e| format!("Failed to open in default browser / application: {}", e))?;
        Ok(true)
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open with macOS 'open' command: {}", e))?;
        Ok(true)
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open with Linux 'xdg-open' command: {}", e))?;
        Ok(true)
    }
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err(format!("Opening files is unsupported on this operating system"))
    }
}

/// Cleans up any leftover .tmp.* files in the given directory or project parent directory
#[tauri::command]
pub fn cleanup_temporary_project_files(directory_path: String) -> Result<usize, String> {
    let dir = Path::new(&directory_path);
    if !dir.exists() || !dir.is_dir() {
        return Ok(0);
    }

    let mut removed = 0;
    if let Ok(entries) = fs::read_dir(dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_file() {
                if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                    if name.contains(".tmp.") {
                        if fs::remove_file(&path).is_ok() {
                            removed += 1;
                        }
                    }
                }
            }
        }
    }
    Ok(removed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn test_atomic_write_bytes_creates_file_and_cleans_tmp() {
        let dir = tempdir().unwrap();
        let target = dir.path().join("test_proj.recall");

        let content = b"{\"title\":\"Test Recall Project\"}";
        atomic_write_bytes(&target, content, true).unwrap();

        assert!(target.exists());
        let read_back = fs::read(&target).unwrap();
        assert_eq!(read_back, content);

        // Ensure no leftover .tmp files
        let entries: Vec<_> = fs::read_dir(dir.path()).unwrap().map(|e| e.unwrap().file_name().to_string_lossy().to_string()).collect();
        assert!(entries.iter().all(|name| !name.contains(".tmp.")));
    }

    #[test]
    fn test_atomic_write_creates_backup_when_overwriting() {
        let dir = tempdir().unwrap();
        let target = dir.path().join("course.recall");

        atomic_write_bytes(&target, b"v1 content", false).unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "v1 content");

        // Now overwrite with backup enabled
        atomic_write_bytes(&target, b"v2 content", true).unwrap();
        assert_eq!(fs::read_to_string(&target).unwrap(), "v2 content");

        let bak_file = dir.path().join("course.recall.bak");
        assert!(bak_file.exists());
        assert_eq!(fs::read_to_string(&bak_file).unwrap(), "v1 content");
    }
}
