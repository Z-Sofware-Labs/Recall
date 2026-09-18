mod office;
mod project;
mod association;
mod media;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_window_state::Builder::default().build())
    .plugin(tauri_plugin_opener::init())
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_process::init())
    .plugin(tauri_plugin_updater::Builder::new().build())
    .invoke_handler(tauri::generate_handler![
      office::detect_office_suite,
      office::convert_pptx_to_slides,
      project::save_project_file,
      project::save_binary_file,
      project::load_project_file,
      project::get_default_project_directory,
      project::get_cli_startup_file,
      project::open_in_browser,
      association::check_recall_file_association,
      association::register_recall_file_association,
      association::unregister_recall_file_association,
      media::load_media_data_url,
    ])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
