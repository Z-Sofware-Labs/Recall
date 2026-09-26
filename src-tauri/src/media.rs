use std::fs::File;
use std::io::Read;
use std::path::Path;
use sha2::{Digest, Sha256};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MediaMetadata {
    pub hash: String,
    pub size_bytes: u64,
    pub mime_type: String,
    pub extension: String,
    pub file_name: String,
}

pub fn strip_file_prefix(path_str: &str) -> &str {
    if path_str.starts_with("file:///") {
        &path_str[8..]
    } else if path_str.starts_with("file://") {
        &path_str[7..]
    } else {
        path_str
    }
}

pub fn mime_type_from_ext(ext: &str) -> &'static str {
    match ext {
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
        "mp3" => "audio/mpeg",
        "wav" => "audio/wav",
        "aac" => "audio/aac",
        "m4a" => "audio/mp4",
        _ => "application/octet-stream",
    }
}

#[tauri::command]
pub fn get_media_metadata(file_path: String) -> Result<MediaMetadata, String> {
    let clean = strip_file_prefix(&file_path);
    let path = Path::new(clean);
    if !path.exists() {
        return Err(format!("File does not exist: {}", clean));
    }

    let metadata = std::fs::metadata(path).map_err(|e| format!("Failed to read metadata: {}", e))?;
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("").to_lowercase();
    let mime = mime_type_from_ext(&ext);

    // Compute SHA-256 in chunks to avoid allocating entire file in RAM for large videos
    let mut file = File::open(path).map_err(|e| format!("Failed to open file '{}': {}", clean, e))?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 65536];

    loop {
        let count = file.read(&mut buffer).map_err(|e| format!("Failed to stream file for hashing: {}", e))?;
        if count == 0 {
            break;
        }
        hasher.update(&buffer[..count]);
    }

    let hash_result = format!("{:x}", hasher.finalize());
    let file_name = path.file_name().and_then(|n| n.to_str()).unwrap_or("media").to_string();

    Ok(MediaMetadata {
        hash: hash_result,
        size_bytes: metadata.len(),
        mime_type: mime.to_string(),
        extension: ext,
        file_name,
    })
}

#[tauri::command]
pub fn load_media_data_url(file_path: String) -> Result<String, String> {
    let clean_path_str = strip_file_prefix(&file_path);
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

    let mime = mime_type_from_ext(&ext);
    let encoded = BASE64.encode(&buffer);
    Ok(format!("data:{};base64,{}", mime, encoded))
}

/// Copies an external media file into the project's local media directory without Base64 encoding.
#[tauri::command]
pub fn copy_media_file_to_project(source_path: String, project_media_dir: String, target_file_name: String) -> Result<String, String> {
    let clean_src = strip_file_prefix(&source_path);
    let src_path = Path::new(clean_src);
    if !src_path.exists() {
        return Err(format!("Source media file does not exist: {}", clean_src));
    }

    let dest_dir = Path::new(&project_media_dir);
    if !dest_dir.exists() {
        std::fs::create_dir_all(dest_dir).map_err(|e| format!("Failed to create destination media directory: {}", e))?;
    }

    let dest_path = dest_dir.join(&target_file_name);
    std::fs::copy(src_path, &dest_path).map_err(|e| format!("Failed to copy media file: {}", e))?;

    Ok(dest_path.to_string_lossy().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;
    use std::io::Write;

    #[test]
    fn test_get_media_metadata_computes_sha256() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("sample.mp4");
        {
            let mut f = File::create(&file_path).unwrap();
            f.write_all(b"recall video stream content test").unwrap();
        }

        let meta = get_media_metadata(file_path.to_string_lossy().to_string()).unwrap();
        assert_eq!(meta.extension, "mp4");
        assert_eq!(meta.mime_type, "video/mp4");
        assert_eq!(meta.size_bytes, 32);
        assert!(!meta.hash.is_empty());
    }

    #[test]
    fn test_copy_media_file_to_project() {
        let dir = tempdir().unwrap();
        let src_file = dir.path().join("source.png");
        let dest_dir = dir.path().join("project_media");

        {
            let mut f = File::create(&src_file).unwrap();
            f.write_all(b"image bytes").unwrap();
        }

        let copied_path = copy_media_file_to_project(
            src_file.to_string_lossy().to_string(),
            dest_dir.to_string_lossy().to_string(),
            "asset_1.png".to_string(),
        ).unwrap();

        assert!(Path::new(&copied_path).exists());
        assert_eq!(std::fs::read(&copied_path).unwrap(), b"image bytes");
    }
}
