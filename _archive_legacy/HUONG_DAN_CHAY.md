# Hướng dẫn cài đặt & chạy MKT Dashboard

## Bước 1 — Cài Python (nếu chưa có)

Tải Python 3.11 hoặc 3.12 tại: https://www.python.org/downloads/
- Khi cài, tick chọn **"Add Python to PATH"** → nhấn Install Now

Kiểm tra sau khi cài:
```
python --version
```

---

## Bước 2 — Cài thư viện

Mở **PowerShell** hoặc **Command Prompt**, chạy:

```
pip install streamlit pandas openpyxl numpy xlrd
```

---

## Bước 3 — Chạy app

```
cd "C:\Users\Admin\OneDrive\Documents\MKT_Dashboard_App"
streamlit run app.py
```

Trình duyệt tự mở tại http://localhost:8501

---

## Bước 4 — Sử dụng

1. Sidebar → kiểm tra thư mục mặc định: `C:\Users\Admin\OneDrive\Documents\MKT DTP`
2. Chọn file Excel → chọn sheet → nhấn **Tải dữ liệu**
3. Tab **⚙️ Cài đặt cột**: kiểm tra và chỉnh map cột nếu cần
4. Tab **📊 Tổng quan**: xem KPI card tổng quan
5. Tab **📋 Theo Hạng mục**: xem card từng đầu mục
6. Tab **🔍 Bảng Chi tiết**: lọc, tìm kiếm
7. Tab **📄 Báo cáo 1 trang**: xem/in báo cáo tổng hợp
8. Tab **✏️ Nhập tay & Export**: export Excel / HTML / copy text

---

## Cấu trúc thư mục

```
MKT_Dashboard_App/
├── app.py              ← File chính
├── requirements.txt    ← Danh sách thư viện
└── HUONG_DAN_CHAY.md  ← File này
```

---

## Quy tắc màu trạng thái

| Tỷ lệ hoàn thành | Trạng thái | Màu |
|-------------------|------------|-----|
| ≥ 100% | Vượt/Hoàn thành | 🟢 Xanh lá |
| 80–99% | Gần đạt | 🔵 Xanh dương |
| 50–79% | Cần thúc đẩy | 🟠 Cam |
| < 50% | Rủi ro | 🔴 Đỏ |
| Trống | Chưa cập nhật | ⬜ Xám |

---

## Lưu ý cột Excel

App tự nhận diện các cột. Nếu tên cột trong Excel khác với tên chuẩn,
dùng tab **⚙️ Cài đặt cột** để map thủ công.

Cột quan trọng nhất:
- **Hạng mục** → đầu mục chính (cột A, thường dùng merge cells)
- **Tỷ lệ hoàn thành team** → dùng để tính màu trạng thái
- **Người chịu trách nhiệm chính** → hiển thị nhân sự
