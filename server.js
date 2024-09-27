// server.js
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Tạo HTTP server để phục vụ file tĩnh
const server = http.createServer((req, res) => {
  // Nếu truy cập vào root hoặc /index.html, phục vụ file index.html
  if (req.url === '/' || req.url === '/index.html') {
    fs.readFile(path.join(__dirname, 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Lỗi máy chủ');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else {
    // Xử lý các yêu cầu khác (ví dụ: file CSS, JS, hình ảnh)
    const filePath = path.join(__dirname, req.url);
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Không tìm thấy trang');
        return;
      }

      // Xác định loại nội dung dựa trên phần mở rộng file
      let contentType = 'text/plain';
      if (req.url.endsWith('.css')) {
        contentType = 'text/css';
      } else if (req.url.endsWith('.js')) {
        contentType = 'application/javascript';
      } else if (req.url.endsWith('.png')) {
        contentType = 'image/png';
      } else if (req.url.endsWith('.jpg') || req.url.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } // Thêm các loại MIME khác nếu cần

      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  }
});

// Tạo WebSocket server sử dụng cùng HTTP server
const wss = new WebSocket.Server({ server });

let clients = [];
const clientNames = new Map();

wss.on('connection', (ws) => {
  clients.push(ws);
  console.log('Một client đã kết nối');
  ws.send('Vui lòng nhập tên của bạn:');

  // Xử lý nhận tên người dùng
  ws.once('message', (name) => {
    const trimmedName = name.toString().trim();
    clientNames.set(ws, trimmedName);
    console.log(`${trimmedName} đã kết nối`);
    broadcast(`${trimmedName} đã tham gia vào phòng chat`, ws);
    ws.send(`Chào mừng ${trimmedName}! Bạn có thể bắt đầu gửi tin nhắn.`);
  });

  // Xử lý nhận tin nhắn từ client
  ws.on('message', (message) => {
    const name = clientNames.get(ws) || 'Unknown';
    const trimmedMessage = message.toString().trim();
    if (trimmedMessage.length > 0) {
      console.log(`${name}: ${trimmedMessage}`);
      broadcast(`${name}: ${trimmedMessage}`, ws);
    }
  });

  // Xử lý khi client ngắt kết nối
  ws.on('close', () => {
    const name = clientNames.get(ws) || 'Unknown';
    console.log(`${name} đã ngắt kết nối`);
    clients = clients.filter((client) => client !== ws);
    clientNames.delete(ws);
    broadcast(`${name} đã rời khỏi phòng chat`, ws);
  });

  // Xử lý lỗi
  ws.on('error', (err) => {
    console.error(`Lỗi: ${err}`);
  });
});

// Hàm để phát sóng tin nhắn tới tất cả client trừ sender
function broadcast(message, sender) {
  clients.forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Lắng nghe trên cổng 8080
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`HTTP và WebSocket Server đang lắng nghe trên cổng ${PORT}`);
});