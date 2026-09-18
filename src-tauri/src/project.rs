use std::fs;
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

#[tauri::command]
pub fn save_project_file(file_path: String, content: String) -> Result<bool, String> {
    let path = Path::new(&file_path);
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }

    fs::write(path, content).map_err(|e| format!("Failed to save project file: {}", e))?;
    Ok(true)
}

#[tauri::command]
pub fn save_binary_file(file_path: String, base64_content: String) -> Result<bool, String> {
    use base64::Engine;
    let path = Path::new(&file_path);
    if let Some(parent) = path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create directory: {}", e))?;
        }
    }

    let bytes = base64::engine::general_purpose::STANDARD
        .decode(base64_content)
        .map_err(|e| format!("Failed to decode base64 content: {}", e))?;

    fs::write(path, bytes).map_err(|e| format!("Failed to save binary file: {}", e))?;
    Ok(true)
}

#[tauri::command]
pub fn load_project_file(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
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
            .map_err(|e| format!("Failed to open browser: {}", e))?;
        Ok(true)
    }
    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("xdg-open")
            .arg(&file_path)
            .spawn()
            .map_err(|e| format!("Failed to open browser: {}", e))?;
        Ok(true)
    }
}
