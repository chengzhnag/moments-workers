
/**
* 文件类型与Content-Type映射表
* 用于设置正确的HTTP响应头，确保浏览器能正确解析文件
*/
export const contentTypeMap = {
  // 文本文件类型
  txt: "text/plain; charset=UTF-8",           // 纯文本文件
  csv: "text/csv; charset=UTF-8",             // CSV表格文件
  html: "text/html; charset=UTF-8",           // HTML网页文件
  css: "text/css; charset=UTF-8",             // CSS样式文件
  js: "application/javascript; charset=UTF-8", // JavaScript文件
  json: "application/json; charset=UTF-8",    // JSON数据文件
  xml: "application/xml; charset=UTF-8",      // XML文件
  md: "text/markdown; charset=UTF-8",         // Markdown文件

  // 图片文件类型
  jpg: "image/jpeg",      // JPEG图片
  jpeg: "image/jpeg",     // JPEG图片(另一种扩展名)
  png: "image/png",       // PNG图片
  gif: "image/gif",       // GIF动画图片
  bmp: "image/bmp",       // BMP位图
  webp: "image/webp",     // WebP图片
  svg: "image/svg+xml",   // SVG矢量图
  ico: "image/x-icon",    // 图标文件

  // 音频文件类型
  mp3: "audio/mpeg",      // MP3音频
  wav: "audio/wav",       // WAV音频
  ogg: "audio/ogg",       // OGG音频
  aac: "audio/aac",       // AAC音频
  flac: "audio/flac",     // FLAC无损音频

  // 视频文件类型
  mp4: "video/mp4",        // MP4视频
  avi: "video/x-msvideo",  // AVI视频
  mov: "video/quicktime",  // MOV视频
  webm: "video/webm",      // WebM视频
  mkv: "video/x-matroska", // MKV视频

  // 文档文件类型
  pdf: "application/pdf",  // PDF文档
  doc: "application/msword", // Word文档(旧格式)
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // Word文档(新格式)
  xls: "application/vnd.ms-excel", // Excel表格(旧格式)
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // Excel表格(新格式)
  ppt: "application/vnd.ms-powerpoint", // PowerPoint演示文稿(旧格式)
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", // PowerPoint演示文稿(新格式)

  // 压缩文件类型
  zip: "application/zip",           // ZIP压缩包
  rar: "application/vnd.rar",       // RAR压缩包
  "7z": "application/x-7z-compressed", // 7Z压缩包
  tar: "application/x-tar",         // TAR压缩包
  gz: "application/gzip",           // GZ压缩包

  // 其他文件类型
  bin: "application/octet-stream",  // 二进制文件
  exe: "application/octet-stream",  // 可执行文件
  ttf: "font/ttf",                  // TrueType字体
  otf: "font/otf",                  // OpenType字体
  woff: "font/woff",                // WOFF字体
  woff2: "font/woff2"               // WOFF2字体
};

// 通过 Telegram Bot API 根据 file_id 获取文件
export async function getTgFileById(c, file_id) {
  let filePath;
  let attempts = 0;
  const maxAttempts = 3;
  while (attempts < maxAttempts) {
    const getFilePath = await fetch(`https://api.telegram.org/bot${c.env.TG_BOT_TOKEN}/getFile?file_id=${file_id}`);
    if (!getFilePath.ok) {
      const err = new Error('获取FilePath失败');
      err.errorData = await getFilePath.json();
      throw err;
    }
    const fileData = await getFilePath.json();
    if (fileData.ok && fileData.result.file_path) {
      filePath = fileData.result.file_path;
      break;
    }
    attempts++;
  }
  if (!filePath) {
    throw new Error('多次尝试后未能获取FilePath');
  }
  const getFileResponse = `https://api.telegram.org/file/bot${c.env.TG_BOT_TOKEN}/${filePath}`;
  const response = await fetch(getFileResponse);
  if (!response.ok) {
    const err = new Error('获取文件内容失败');
    err.errorData = await response.json();
    throw err;
  }
  const fileExtension = filePath.split('.').pop().toLowerCase();
  const contentType = contentTypeMap[fileExtension] || 'text/plain';
  return { response, contentType };
}