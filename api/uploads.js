const { readBuffer, requireAdmin, sendJson, supabaseConfig, supabaseFetch } = require("./_lib");

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp"
};

function parseMultipartFile(buffer, contentType) {
  const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;]+))/i);
  if (!boundaryMatch) throw new Error("上传格式错误");
  const boundaryValue = boundaryMatch[1] || boundaryMatch[2];
  const boundary = Buffer.from(`--${boundaryValue}`);
  const start = buffer.indexOf(boundary);
  if (start === -1) throw new Error("上传内容为空");
  const headerStart = start + boundary.length + 2;
  const headerEnd = buffer.indexOf(Buffer.from("\r\n\r\n"), headerStart);
  if (headerEnd === -1) throw new Error("上传头信息错误");
  const headers = buffer.slice(headerStart, headerEnd).toString("utf8");
  const contentDisposition = headers.match(/Content-Disposition:[^\r\n]+/i)?.[0] || "";
  const contentTypeLine = headers.match(/Content-Type:\s*([^\r\n]+)/i);
  if (!contentDisposition.includes('name="image"')) throw new Error("缺少图片文件");
  const originalName = (contentDisposition.match(/filename="([^"]*)"/i)?.[1] || "").trim();
  if (!originalName) throw new Error("请选择图片");
  const mime = contentTypeLine ? contentTypeLine[1].trim().toLowerCase() : "";
  const ext = ALLOWED_IMAGE_TYPES[mime];
  if (!ext) throw new Error("只支持 jpg、png、webp 图片");
  const fileStart = headerEnd + 4;
  const nextBoundary = buffer.indexOf(Buffer.from(`\r\n--${boundaryValue}`), fileStart);
  if (nextBoundary === -1) throw new Error("上传文件不完整");
  const fileBuffer = buffer.slice(fileStart, nextBoundary);
  if (!fileBuffer.length) throw new Error("图片文件为空");
  if (fileBuffer.length > MAX_UPLOAD_BYTES) throw new Error("图片不能超过 5MB");
  return { fileBuffer, mime, ext };
}

function objectNameFromPublicUrl(publicUrl, bucket) {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) return "";
  return decodeURIComponent(publicUrl.slice(index + marker.length));
}

async function handler(req, res) {
  try {
    if (!requireAdmin(req, res)) return;
    const { url, key, bucket } = supabaseConfig();

    if (req.method === "POST") {
      const body = await readBuffer(req, MAX_UPLOAD_BYTES + 1024 * 1024);
      const { fileBuffer, mime, ext } = parseMultipartFile(body, req.headers["content-type"] || "");
      const objectName = `dishes/${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;
      const response = await fetch(`${url}/storage/v1/object/${bucket}/${objectName}`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": mime,
          "x-upsert": "false"
        },
        body: fileBuffer
      });
      const data = await response.text();
      if (!response.ok) throw new Error(data || "图片上传失败");
      return sendJson(res, 201, { path: `${url}/storage/v1/object/public/${bucket}/${objectName}` });
    }

    if (req.method === "DELETE") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      const body = JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
      const objectName = objectNameFromPublicUrl(body.path || "", bucket);
      if (objectName) {
        await supabaseFetch(`/storage/v1/object/${bucket}`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prefixes: [objectName] })
        });
      }
      return sendJson(res, 200, { deleted: Boolean(objectName) });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    return sendJson(res, 500, { error: error.message });
  }
}

module.exports = handler;
module.exports.config = { api: { bodyParser: false } };
