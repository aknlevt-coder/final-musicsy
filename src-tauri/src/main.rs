use tauri::{AppHandle, Manager, Emitter}; // v2 için Manager ve Emitter eklendi
use tauri_plugin_shell::ShellExt;
use tauri_plugin_shell::process::CommandEvent;
use serde::Serialize;
use std::path::PathBuf;
use std::fs::File;
use std::io::{Read, Write};
use zip::write::SimpleFileOptions;
use zip::CompressionMethod;

#[derive(Serialize)]
struct TrackInfo {
    id: String,
    name: String,
    artist: String,
    duration_ms: u64,
    video_url: String,
}

#[derive(Clone, Serialize)]
struct DownloadProgressPayload {
    index: usize,
    progress: String,
}

#[derive(Serialize)]
struct ParseResponse {
    success: bool,
    #[serde(rename = "type")]
    response_type: String,
    count: usize,
    tracks: Vec<TrackInfo>,
}

#[tauri::command]
async fn parse_youtube(app: AppHandle, url: String) -> Result<ParseResponse, String> {
    let output = app.shell()
        .sidecar("yt-dlp")
        .map_err(|e| e.to_string())?
        .args(["--dump-json", "--flat-playlist", &url])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    let mut tracks = Vec::new();

    for line in stdout.lines() {
        if let Ok(item) = serde_json::from_str::<serde_json::Value>(line) {
            let title = item["title"].as_str().unwrap_or("Bilinmeyen").to_string();
            let uploader = item["uploader"].as_str().unwrap_or("Bilinmeyen Sanatçı").to_string();
            let video_url = item["webpage_url"].as_str().unwrap_or(&url).to_string();
            let id = item["id"].as_str().unwrap_or("").to_string();
            let duration = item["duration"].as_u64().unwrap_or(0) * 1000;

            tracks.push(TrackInfo {
                id,
                name: title,
                artist: uploader,
                duration_ms: duration,
                video_url,
            });
        }
    }

    Ok(ParseResponse {
        success: true,
        response_type: if tracks.len() > 1 { "playlist".into() } else { "track".into() },
        count: tracks.len(),
        tracks,
    })
}

#[tauri::command]
async fn search_youtube(app: AppHandle, query: String) -> Result<TrackInfo, String> {
    let search_query = format!("ytsearch1:{}", query);
    
    let output = app.shell()
        .sidecar("yt-dlp")
        .map_err(|e| e.to_string())?
        .args(["--dump-json", &search_query])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    
    if let Ok(item) = serde_json::from_str::<serde_json::Value>(&stdout) {
        let title = item["title"].as_str().unwrap_or("").to_string();
        let uploader = item["uploader"].as_str().unwrap_or("").to_string();
        let url = item["webpage_url"].as_str().unwrap_or("").to_string();
        
        Ok(TrackInfo {
            id: item["id"].as_str().unwrap_or("").to_string(),
            name: title,
            artist: uploader,
            duration_ms: item["duration"].as_u64().unwrap_or(0) * 1000,
            video_url: url,
        })
    } else {
        Err("Arama sonucu bulunamadı".into())
    }
}

#[tauri::command]
async fn download_mp3(app: AppHandle, url: String, title: String, index: usize) -> Result<String, String> {
    let clean_title = title.replace(|c: char| !c.is_alphanumeric() && c != ' ', "");
    
    // İşletim sisteminin geçici (Temp) klasörüne indiriyoruz
    let temp_dir = std::env::temp_dir();
    let output_path = temp_dir.join(format!("{}.mp3", clean_title));
    let output_str = output_path.to_str().unwrap().to_string();

    let (mut rx, _child) = app.shell()
        .sidecar("yt-dlp")
        .map_err(|e| e.to_string())?
        .args([
            &url,
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "0",
            "--extractor-args", "youtube:player_client=android,ios",
            "--newline",
            "-o", &output_str,
            "--no-playlist"
        ])
        .spawn()
        .map_err(|e| e.to_string())?;

    let mut error_output = String::new();

    while let Some(event) = rx.recv().await {
        match event {
            CommandEvent::Stdout(line) => {
                let line_str = String::from_utf8_lossy(&line);
                if line_str.contains("[download]") && line_str.contains("%") {
                    if let Some(percent_start) = line_str.find(']') {
                        if let Some(percent_end) = line_str.find('%') {
                            let percent_str = line_str[percent_start + 1..percent_end].trim();
                            let _ = app.emit("download-progress", DownloadProgressPayload {
                                index,
                                progress: percent_str.to_string(),
                            });
                        }
                    }
                }
            }
            CommandEvent::Stderr(line) => {
                error_output.push_str(&String::from_utf8_lossy(&line));
                error_output.push('\n');
            }
            _ => {}
        }
    }

    if output_path.exists() {
        // İndirilen geçici dosyanın tam yolunu frontend'e döndür
        Ok(output_str)
    } else {
        Err(error_output)
    }
}

#[tauri::command]
async fn create_zip_and_save(app: AppHandle, file_paths: Vec<String>) -> Result<String, String> {
    if file_paths.is_empty() {
        return Err("Paketlenecek dosya bulunamadı.".into());
    }

    let download_dir = app.path().download_dir().unwrap_or_else(|_| PathBuf::from("C:/"));

    // Tek dosyaysa ZIP yapmaya gerek yok, direkt taşı
    if file_paths.len() == 1 {
        let src = PathBuf::from(&file_paths[0]);
        let filename = src.file_name().unwrap().to_string_lossy().to_string();
        let dest = download_dir.join(filename);
        
        std::fs::rename(&src, &dest).or_else(|_| {
            std::fs::copy(&src, &dest).map(|_| { let _ = std::fs::remove_file(&src); })
        }).map_err(|e| e.to_string())?;
        
        return Ok(format!("Şarkı kaydedildi: {}", dest.display()));
    }

    // Birden fazla dosyaysa ZIP arşivi oluştur
    let timestamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_secs();
    let zip_filename = format!("MusicSy_Paket_{}.zip", timestamp);
    let dest_path = download_dir.join(&zip_filename);
    
    let file = File::create(&dest_path).map_err(|e| e.to_string())?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);

    for path_str in file_paths {
        let path = PathBuf::from(&path_str);
        if !path.exists() { continue; }
        
        let filename = path.file_name().unwrap().to_string_lossy().to_string();
        zip.start_file(filename, options.clone()).map_err(|e| e.to_string())?;
        
        let mut f = File::open(&path).map_err(|e| e.to_string())?;
        let mut buffer = Vec::new();
        f.read_to_end(&mut buffer).map_err(|e| e.to_string())?;
        zip.write_all(&buffer).map_err(|e| e.to_string())?;
        
        // Geçici dosyayı sil
        let _ = std::fs::remove_file(&path);
    }
    
    zip.finish().map_err(|e| e.to_string())?;

    Ok(format!("Paket kaydedildi: {}", dest_path.display()))
}

#[tauri::command]
async fn fetch_html(url: String) -> Result<String, String> {
    reqwest::get(&url)
        .await
        .map_err(|e| e.to_string())?
        .text()
        .await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn update_yt_dlp(app: AppHandle) -> Result<String, String> {
    let output = app.shell()
        .sidecar("yt-dlp")
        .map_err(|e| e.to_string())?
        .args(["-U"])
        .output()
        .await
        .map_err(|e| e.to_string())?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    Ok(stdout.to_string())
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            parse_youtube,
            search_youtube,
            download_mp3,
            create_zip_and_save,
            fetch_html,
            update_yt_dlp
        ])
        .run(tauri::generate_context!())
        .expect("Uygulama çalıştırılamadı");
}