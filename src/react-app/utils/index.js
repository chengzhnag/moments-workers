

export function commonUploadFile(file) {
  return new Promise(async (resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/upload-file', {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const result = await response.json();
      console.log('上传成功:', result.data);
      resolve({
        url: result.data.url,
        thumbnailUrl: result.data.thumbnailUrl,
        key: result.data.key,
        type: result.data.mimeType ? result.data.mimeType.startsWith('video/') ? 'video' : 'image' : 'image',
      });
    } else {
      const error = await response.json();
      console.log('上传失败:', error.error);
      reject(error.error);
    }
  });
}

