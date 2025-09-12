
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from 'hono/cache';
import { getTgFileById } from './utils/index.js';

const app = new Hono()

// CORS should be called before the route
app.use('/api/*', cors());

app.get(
  '/api/file/*',
  cache({
    cacheName: 'open-api-image',
    cacheControl: 'public, max-age=31536000',
  })
);

/* 文件上传 start */

// 上传文件到telegram，并存储到IMAGE这个kv中
app.post('/api/upload-file', async (c) => {
  try {
    const body = await c.req.formData();
    const file = body.get('file');
    if (!file) {
      return c.json({ success: false, message: '缺少文件' }, 400);
    }
    const uploadFormData = new FormData();
    uploadFormData.append("chat_id", c.env.TG_CHAT_ID);
    let fileId, fileName, thumbnailFileId, mimeType;
    if (file.type.startsWith('image/gif')) {
      const newFileName = file.name.replace(/\.gif$/, '.jpeg');
      const newFile = new File([file], newFileName, { type: 'image/jpeg' });
      uploadFormData.append("document", newFile);
    } else {
      uploadFormData.append("document", file);
    }
    const telegramResponse = await fetch(`https://api.telegram.org/bot${c.env.TG_BOT_TOKEN}/sendDocument`, { method: 'POST', body: uploadFormData });
    if (!telegramResponse.ok) {
      const errorData = await telegramResponse.json();
      return c.json({ success: false, message: '上传到 Telegram 失败', error: errorData }, 500);
    }
    const responseData = await telegramResponse.json();
    if (responseData.result.video) {
      fileId = responseData.result.video.file_id;
      fileName = responseData.result.video.file_name;
      mimeType = responseData.result.video.mime_type;
      thumbnailFileId = responseData.result.video.thumb?.file_id;
    } else if (responseData.result.document) {
      fileId = responseData.result.document.file_id;
      fileName = responseData.result.document.file_name;
      mimeType = responseData.result.document.mime_type;
      if (responseData.result.document.thumb) {
        thumbnailFileId = responseData.result.document.thumb?.file_id;
      }
    } else if (responseData.result.audio) {
      fileId = responseData.result.audio.file_id;
      fileName = responseData.result.audio.file_name;
      mimeType = responseData.result.audio.mime_type;
    } else if (responseData.result.photo) {
      fileId = responseData.result.photo.file_id;
      fileName = responseData.result.photo.file_name;
      mimeType = responseData.result.photo.mime_type;
      thumbnailFileId = responseData.result.photo.thumb?.file_id;
    } else {
      return c.json({ success: false, message: '获取文件ID失败', data: responseData }, 500);
    }
    const fileExtension = file.name.split('.').pop();
    const timestamp = Date.now();
    // 将 fileId 存储到 IMAGE KV 中
    const data = { ...responseData.result };
    data.mimeType = mimeType;
    data.fileId = fileId;
    data.fileName = fileName || `file_${timestamp}.${fileExtension}`;
    data.key = `${timestamp}.${fileExtension}`;
    if (thumbnailFileId) {
      data.thumbnailFileId = thumbnailFileId;
      data.thumbnailKey = `thumb/${timestamp}.${fileExtension}`;
      data.thumbnailUrl = `${c.env.DOMAIN}/api/file/${data.thumbnailKey}`;
    }
    data.url = `${c.env.DOMAIN}/api/file/${data.key}`;
    delete data.chat;
    delete data.from;
    await c.env.IMAGE.put(`${timestamp}.${fileExtension}`, JSON.stringify(data));
    return c.json({ success: true, message: '文件上传成功', data, });
  } catch (error) {
    return c.json({ success: false, message: '文件上传失败', error: error instanceof Error ? error.message : '未知错误' }, 500);
  }
});

// 根据存储的key获取文件
app.get('/api/file/:key', async (c) => {
  const key = c.req.param('key')
  if (!key) {
    return c.json({ success: false, message: '请传入文件key' });
  }
  const data = await c.env.IMAGE.get(key);
  if (!data) {
    return c.json({ success: false, message: '未找到对应数据' }, 404);
  }
  const parsedData = JSON.parse(data);
  try {
    const { response, contentType } = await getTgFileById(c, parsedData.fileId);
    return c.body(response.body, 200, { 'Content-Type': contentType });
  } catch (error) {
    return c.json({ success: false, message: error.message, error: error.errorData }, 500);
  }
});

// 根据存储的key获取图片、视频缩略图
app.get('/api/file/thumb/:key', async (c) => {
  const key = c.req.param('key')
  if (!key) {
    return c.json({ success: false, message: '请传入文件key' });
  }
  const data = await c.env.IMAGE.get(key);
  if (!data) {
    return c.json({ success: false, message: '未找到对应数据' }, 404);
  }
  const parsedData = JSON.parse(data);
  if (!parsedData.thumbnailFileId) {
    return c.json({ success: false, message: '该文件没有缩略图' }, 400);
  }
  try {
    const { response, contentType } = await getTgFileById(c, parsedData.thumbnailFileId);
    return c.body(response.body, 200, { 'Content-Type': contentType });
  } catch (error) {
    return c.json({ success: false, message: error.message, error: error.errorData }, 500);
  }
});

// 根据存储的key获取文件信息
app.get('/api/file-info/:key', async (c) => {
  const key = c.req.param('key')
  if (!key) {
    return c.json({ success: false, message: '请传入文件key' });
  }
  const data = await c.env.IMAGE.get(key);
  if (!data) {
    return c.json({ success: false, message: '未找到对应数据' }, 404);
  }
  const parsedData = JSON.parse(data);
  return c.json({ success: true, data: parsedData });
});

/* 文件上传 end */


/* ================== 业务API整合 start ================== */

// 统一响应格式
function createResponse(c, data, status = 200) {
  return c.json({
    success: status >= 200 && status < 300,
    data: status >= 200 && status < 300 ? data : null,
    error: status >= 400 ? data : null,
    timestamp: new Date().toISOString()
  }, status);
}

// 身份验证中间件
async function authenticateAdmin(c) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return createResponse(c, { error: '缺少或无效的 Authorization 认证信息' }, 401);
  }
  try {
    const credentials = atob(authHeader.slice(6));
    const [account, password] = credentials.split(':');
    const user = await c.env.DB.prepare(
      'SELECT id, account, name, role, password FROM users WHERE account = ?'
    ).bind(account).first();
    if (!user) {
      return createResponse(c, { error: '用户不存在' }, 401);
    }
    if (user.password !== password) {
      return createResponse(c, { error: '密码错误' }, 401);
    }
    if (user.role !== 'admin') {
      return createResponse(c, { error: '权限不足，需要管理员权限' }, 403);
    }
    c.set('user', user);
    return null;
  } catch (error) {
  return createResponse(c, { error: '认证失败', message: error.message }, 401);
  }
}

async function authenticateNormal(c) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return createResponse(c, { error: '缺少或无效的 Authorization 认证信息' }, 401);
  }
  try {
    const credentials = atob(authHeader.slice(6));
    const [account, password] = credentials.split(':');
    const user = await c.env.DB.prepare(
      'SELECT id, account, name, role, password FROM users WHERE account = ?'
    ).bind(account).first();
    if (!user) {
      return createResponse(c, { error: '用户不存在' }, 401);
    }
    if (user.password !== password) {
      return createResponse(c, { error: '密码错误' }, 401);
    }
    c.set('user', user);
    return null;
  } catch (error) {
  return createResponse(c, { error: '认证失败', message: error.message }, 401);
  }
}

// /api/auth
app.post('/api/auth', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return createResponse(c, { error: '未授权', message: '缺少或无效的 Authorization 认证信息' }, 401);
  }
  try {
    const credentials = atob(authHeader.slice(6));
    const [account, password] = credentials.split(':');
    const user = await c.env.DB.prepare(
      'SELECT id, account, password, name, role, extra_data FROM users WHERE account = ?'
    ).bind(account).first();
    if (!user) {
      return createResponse(c, { error: '未授权', message: '用户不存在' }, 401);
    }
    if (user.password !== password) {
      return createResponse(c, { error: '未授权', message: '密码错误' }, 401);
    }
    return createResponse(c, {
      id: user.id,
      account: user.account,
      name: user.name,
      role: user.role,
      extra_data: user.extra_data,
    }, 200);
  } catch (error) {
  return createResponse(c, { error: '服务器内部错误', message: error.message }, 500);
  }
});

// /api/users
app.get('/api/users', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = (page - 1) * limit;
  const { results } = await c.env.DB.prepare(
    'SELECT id, account, name, role, created_at, updated_at, extra_data FROM users LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();
  const countResult = await c.env.DB.prepare('SELECT COUNT(*) as total FROM users').first();
  return createResponse(c, {
    users: results,
    pagination: {
      page,
      limit,
      total: countResult.total,
      pages: Math.ceil(countResult.total / limit)
    }
  }, 200);
});

app.get('/api/users/:id', async (c) => {
  const userId = c.req.param('id');
  const user = await c.env.DB.prepare(
    'SELECT id, account, name, role, created_at, updated_at, extra_data FROM users WHERE id = ?'
  ).bind(userId).first();
  if (!user) {
    return createResponse(c, { error: 'Not Found', message: 'User not found' }, 404);
  }
  return createResponse(c, user, 200);
});

app.post('/api/users', async (c) => {
  const auth = await authenticateAdmin(c);
  if (auth) return auth;
  const body = await c.req.json();
  if (!body.account || !body.password || !body.name) {
  return createResponse(c, { error: '参数错误', message: '账号、密码和姓名为必填项' }, 400);
  }
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE account = ?'
  ).bind(body.account).first();
  if (existingUser) {
  return createResponse(c, { error: '账号已存在', message: '该账号已被注册' }, 409);
  }
  const result = await c.env.DB.prepare(
    'INSERT INTO users (account, password, name, role, extra_data) VALUES (?, ?, ?, ?, ?)'
  ).bind(
    body.account,
    body.password,
    body.name,
    body.role || 'normal',
    body.extra_data ? JSON.stringify(body.extra_data) : null
  ).run();
  const newUser = await c.env.DB.prepare(
    'SELECT id, account, name, role, created_at, updated_at, extra_data FROM users WHERE id = ?'
  ).bind(result.meta.last_row_id).first();
  return createResponse(c, newUser, 201);
});

app.put('/api/users/:id', async (c) => {
  const auth = await authenticateAdmin(c);
  if (auth) return auth;
  const userId = c.req.param('id');
  const body = await c.req.json();
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ?'
  ).bind(userId).first();
  if (!existingUser) {
  return createResponse(c, { error: '未找到', message: '用户不存在' }, 404);
  }
  const updates = [];
  const bindings = [];
  if (body.account !== undefined) { updates.push('account = ?'); bindings.push(body.account); }
  if (body.password !== undefined) { updates.push('password = ?'); bindings.push(body.password); }
  if (body.name !== undefined) { updates.push('name = ?'); bindings.push(body.name); }
  if (body.role !== undefined) { updates.push('role = ?'); bindings.push(body.role); }
  if (body.extra_data !== undefined) { updates.push('extra_data = ?'); bindings.push(body.extra_data ? JSON.stringify(body.extra_data) : null); }
  if (updates.length === 0) {
  return createResponse(c, { error: '参数错误', message: '没有需要更新的字段' }, 400);
  }
  updates.push('updated_at = datetime(\'now\', \'localtime\')');
  bindings.push(userId);
  await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...bindings).run();
  const updatedUser = await c.env.DB.prepare(
    'SELECT id, account, name, role, created_at, updated_at, extra_data FROM users WHERE id = ?'
  ).bind(userId).first();
  return createResponse(c, updatedUser, 200);
});

app.delete('/api/users/:id', async (c) => {
  const auth = await authenticateAdmin(c);
  if (auth) return auth;
  const userId = c.req.param('id');
  const existingUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ?'
  ).bind(userId).first();
  if (!existingUser) {
  return createResponse(c, { error: '未找到', message: '用户不存在' }, 404);
  }
  await c.env.DB.prepare('DELETE FROM records WHERE creator_id = ?').bind(userId).run();
  await c.env.DB.prepare('DELETE FROM users WHERE id = ?').bind(userId).run();
  return createResponse(c, { message: '用户删除成功' }, 200);
});

// /api/records
app.get('/api/records', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '10');
  const offset = (page - 1) * limit;
  const { results } = await c.env.DB.prepare(`
    SELECT r.*, u.account as creator_account, u.name as creator_name 
    FROM records r 
    JOIN users u ON r.creator_id = u.id 
    ORDER BY r.created_at DESC 
    LIMIT ? OFFSET ?
  `).bind(limit, offset).all();
  const countResult = await c.env.DB.prepare('SELECT COUNT(*) as total FROM records').first();
  return createResponse(c, {
    records: results,
    pagination: {
      page,
      limit,
      total: countResult.total,
      pages: Math.ceil(countResult.total / limit)
    }
  }, 200);
});

app.get('/api/records/:id', async (c) => {
  const recordId = c.req.param('id');
  const record = await c.env.DB.prepare(`
    SELECT r.*, u.account as creator_account, u.name as creator_name 
    FROM records r 
    JOIN users u ON r.creator_id = u.id 
    WHERE r.id = ?
  `).bind(recordId).first();
  if (!record) {
    return createResponse(c, { error: 'Not Found', message: 'Record not found' }, 404);
  }
  return createResponse(c, record, 200);
});

app.post('/api/records', async (c) => {
  const auth = await authenticateAdmin(c);
  if (auth) return auth;
  const body = await c.req.json();
  if (body.creator_id === undefined) {
  return createResponse(c, { error: '参数错误', message: '必须提供创建者ID' }, 400);
  }
  const creator = await c.env.DB.prepare(
    'SELECT id FROM users WHERE id = ?'
  ).bind(body.creator_id).first();
  if (!creator) {
  return createResponse(c, { error: '参数错误', message: '创建者不存在' }, 400);
  }
  const result = await c.env.DB.prepare(
    'INSERT INTO records (creator_id, content_text, content_media, extra_data) VALUES (?, ?, ?, ?)'
  ).bind(
    body.creator_id,
    body.content_text || null,
    body.content_media ? (Array.isArray(body.content_media) ? JSON.stringify(body.content_media) : body.content_media) : null,
    body.extra_data ? JSON.stringify(body.extra_data) : null
  ).run();
  const newRecord = await c.env.DB.prepare(`
    SELECT r.*, u.account as creator_account, u.name as creator_name 
    FROM records r 
    JOIN users u ON r.creator_id = u.id 
    WHERE r.id = ?
  `).bind(result.meta.last_row_id).first();
  return createResponse(c, newRecord, 201);
});

app.put('/api/records/:id', async (c) => {
  const auth = await authenticateNormal(c);
  if (auth) return auth;
  const recordId = c.req.param('id');
  const body = await c.req.json();
  const existingRecord = await c.env.DB.prepare(
    'SELECT id FROM records WHERE id = ?'
  ).bind(recordId).first();
  if (!existingRecord) {
  return createResponse(c, { error: '未找到', message: '记录不存在' }, 404);
  }
  const updates = [];
  const bindings = [];
  if (body.creator_id !== undefined) { updates.push('creator_id = ?'); bindings.push(body.creator_id); }
  if (body.content_text !== undefined) { updates.push('content_text = ?'); bindings.push(body.content_text); }
  if (body.content_media !== undefined) { updates.push('content_media = ?'); bindings.push(body.content_media ? (Array.isArray(body.content_media) ? JSON.stringify(body.content_media) : body.content_media) : null); }
  if (body.extra_data !== undefined) { updates.push('extra_data = ?'); bindings.push(body.extra_data ? JSON.stringify(body.extra_data) : null); }
  if (updates.length === 0) {
  return createResponse(c, { error: '参数错误', message: '没有需要更新的字段' }, 400);
  }
  updates.push('updated_at = datetime(\'now\', \'localtime\')');
  bindings.push(recordId);
  await c.env.DB.prepare(
    `UPDATE records SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...bindings).run();
  const updatedRecord = await c.env.DB.prepare(`
    SELECT r.*, u.account as creator_account, u.name as creator_name 
    FROM records r 
    JOIN users u ON r.creator_id = u.id 
    WHERE r.id = ?
  `).bind(recordId).first();
  return createResponse(c, updatedRecord, 200);
});

app.delete('/api/records/:id', async (c) => {
  const auth = await authenticateAdmin(c);
  if (auth) return auth;
  const recordId = c.req.param('id');
  const existingRecord = await c.env.DB.prepare(
    'SELECT id FROM records WHERE id = ?'
  ).bind(recordId).first();
  if (!existingRecord) {
  return createResponse(c, { error: '未找到', message: '记录不存在' }, 404);
  }
  await c.env.DB.prepare('DELETE FROM records WHERE id = ?').bind(recordId).run();
  return createResponse(c, { message: '记录删除成功' }, 200);
});

/* ================== 业务API整合 end ================== */

export default app;