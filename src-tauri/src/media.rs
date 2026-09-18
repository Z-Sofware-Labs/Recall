use std::fs::File;
use std::io::Read;
use std::path::Path;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};

#[tauri::command]
pub fn load_media_data_url(file_path: String) -> Result<String, String> {
    let clean_path_str = if file_path.starts_with("file:///") {
        &file_path[8..]
    } else if file_path.starts_with("file://") {
        &file_path[7..]
    } else {
        &file_path
    };

    let path = Path::new(clean_path_str);
    if !path.exists() {
        return Err(format!("File does not exist: {}", clean_path_str));
    }

    let mut file = File::open(path).map_err(|e| format!("Failed to open file '{}': {}", clean_path_str, e))?;
    let mut buffer = Vec::new();
    file.read_to_end(&mut buffer).map_err(|e| format!("Failed to read file '{}': {}", clean_path_str, e))?;

    let ext = path.extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_lowercase();

    let mime = match ext.as_str() {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        "bmp" => "image/bmp",
        "ico" => "image/x-icon",
        "mp4" => "video/mp4",
        "webm" => "video/webm",
        "ogg" | "ogv" => "video/ogg",
        "mov" => "video/quicktime",
        "avi" => "video/x-msvideo",
        "mkv" => "video/x-matroska",
        _ => "application/octet-stream",
    };

    let encoded = BASE64.encode(&buffer);
    Ok(format!("data:{};base64,{}", mime, encoded))
}
