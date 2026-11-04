# MKT Dashboard — Hướng dẫn sử dụng

Dashboard nội bộ Planning Department dùng để theo dõi hoạt động MKT, Sale Online, KOC/Affiliate, tuyển dụng và công việc.

- Website: https://kehoachdtp-collab.github.io/marketing-dtp/
- Mã nguồn: https://github.com/kehoachdtp-collab/marketing-dtp
- Trang chính: `index.html`
- Backend xác thực và đồng bộ: Supabase

> Repository này công khai. Không commit mật khẩu, token, API key, CCCD, dữ liệu khách hàng hoặc dữ liệu backup có thông tin cá nhân.

## Mục lục

- [Đăng nhập và phân quyền](#đăng-nhập-và-phân-quyền)
- [Lưu dữ liệu và đồng bộ](#lưu-dữ-liệu-và-đồng-bộ)
- [Nguồn dữ liệu và import Excel](#nguồn-dữ-liệu-và-import-excel)
- [Phím tắt lưu](#phím-tắt-lưu)
- [Các module](#các-module)
- [Video AI](#video-ai)
- [Supabase và cú pháp reset mật khẩu](#supabase-và-cú-pháp-reset-mật-khẩu)
- [Sao lưu, phát hành và xử lý lỗi](#sao-lưu-phát-hành-và-xử-lý-lỗi)
- [Bảo mật](#bảo-mật)

## Đăng nhập và phân quyền

Tài khoản được xác thực qua Supabase. Quyền truy cập được gán theo module: chỉ xem, xem/sửa, import hoặc toàn quyền. Admin quản lý user trong **Quản trị hệ thống → Quản lý user**.

Mật khẩu được lưu dạng hash một chiều nên không thể xem lại. Admin có thể đặt mật khẩu mới trong bảng Quản lý user. Nếu admin không đăng nhập được, dùng SQL reset ở phần bên dưới.

## Lưu dữ liệu và đồng bộ

Ứng dụng dùng `localStorage` của trình duyệt để phản hồi nhanh và dùng bảng `kv_stores` trên Supabase để đồng bộ giữa máy. Sau khi import hoặc sửa dữ liệu, bấm **Cập nhật/Đồng bộ** và xác nhận thông báo hoàn tất trước khi chuyển sang máy khác.

Nếu hai máy đang cùng sửa một dữ liệu, hãy đồng bộ trước và sau khi sửa để tránh ghi đè phiên bản mới hơn. Tránh xóa dữ liệu website/local storage nếu chưa có bản sao trên Supabase.

Ảnh CCCD trong luồng hợp đồng được OCR trên trình duyệt; chỉ lưu các trường text đã kiểm tra.

## Nguồn dữ liệu và import Excel

### Google Sheets

Mở **Quản trị hệ thống → Nguồn dữ liệu**, khai báo đường dẫn hoặc ID Sheet, tên tab, header và ánh xạ cột theo cấu hình trên màn hình. Chạy **Kiểm tra kết nối/Đồng bộ** và xem kết quả. Sheet cần được chia sẻ đúng quyền truy cập; không bật công khai cho bảng có dữ liệu cá nhân.

Với dữ liệu KOC master, có thể import Excel để quản lý trực tiếp trong ứng dụng. Hãy chọn nguồn dữ liệu đúng trong module, không chọn Google Sheet nếu muốn dùng dữ liệu đã import vào master.

### Excel

1. Bấm **Tải mẫu** trong module nếu có.
2. Giữ nguyên tên header và cấu trúc cột.
3. Bấm **Import Excel**, chọn file và kiểm tra xem trước.
4. Xác nhận chế độ nhập đang chọn: thêm, cập nhật theo mã, hay thay thế.
5. Kiểm tra số dòng và một số bản ghi sau import.
6. Bấm **Cập nhật/Đồng bộ** để các máy khác nhận dữ liệu.

Trước chế độ ghi đè, hãy xuất hoặc giữ bản Excel gốc. Không chọn ghi đè nếu file không chứa toàn bộ dữ liệu cần giữ.

## Phím tắt lưu

- **Ctrl+S** lưu các trường đang hỗ trợ phím tắt trong module hiện tại.
- **Enter** lưu trường đang sửa ở bảng có hỗ trợ Enter.
- Trong textarea, Enter tạo dòng mới; dùng Ctrl+S để lưu.
- Import, xóa, tạo hợp đồng và một số thao tác khác vẫn cần nút xác nhận riêng.

## Các module

- **Tổng quan MKT**: chỉ số và cảnh báo tổng hợp.
- **Business to Business**: lead, chăm sóc, trạng thái và chi phí.
- **Sale Online**: sản phẩm, chiến dịch, đơn hàng/doanh thu, quảng cáo, tồn kho, KOC/Affiliate, hợp đồng và Nhiệm vụ Shop.
- **Tuyển dụng**: chiến dịch và chỉ số tuyển.
- **Theo dõi công việc**: giao việc, deadline, tiến độ và báo cáo nhân viên.
- **Nguồn dữ liệu**: cấu hình đồng bộ và theo dõi nguồn.
- **Quản lý user**: tài khoản, trạng thái và quyền; dành cho Admin.

### KOC / Affiliate và hợp đồng

Import KOC theo file mẫu, kiểm tra mã KOC và social link để tránh trùng. Với hợp đồng, chọn KOC/sản phẩm và mẫu phù hợp, kiểm tra OCR/thông tin thanh toán, bấm **Review**, sửa các trường bị cảnh báo rồi mới xác nhận lưu/tải Word. OCR có thể sai; cần đối chiếu giấy tờ.

## Video AI

1. Mở **Video AI**, nhập ý tưởng vào ô **Bạn muốn tạo video gì?**.
2. Chọn thể loại, phong cách, thời lượng, tỷ lệ, số scene, ngôn ngữ và nền tảng.
3. Bổ sung sản phẩm, khách hàng mục tiêu, CTA.
4. Bấm **Tạo kịch bản & cảnh** để sinh kịch bản và prompt theo scene.
5. Có thể chỉnh prompt riêng một scene; hồ sơ nhân vật/sản phẩm dùng chung ở cấp dự án.
6. Sao chép prompt hoàn chỉnh hoặc dùng Generate Scene/Generate All Scenes.

Nút mở Google Flow chuyển tới tài khoản Google được chọn trong trình duyệt và hỗ trợ đưa prompt sang Flow. Tạo video tự động trực tiếp từ ứng dụng cần HTTPS API/Webhook tạo video. Không nhập API key vào HTML hoặc README; giữ key ở backend.

## Supabase và cú pháp reset mật khẩu

Mở **Supabase Dashboard → dự án marketing-dtp → SQL Editor → New query**. Chỉ người có quyền quản trị dự án Supabase mới thực hiện thao tác này.

**Lưu ý quan trọng:** Tài khoản hiện tại có username chính xác là `admin`, **không phải** `<admin>`. Không được sao chép các dấu `< >` của ví dụ placeholder cũ. Tuyệt đối không ghi mật khẩu thật vào README, GitHub hoặc tin nhắn; mật khẩu từng lộ trong ảnh cần thay bằng mật khẩu mới khác hoàn toàn.

### Bước 1 — Kiểm tra tài khoản admin

Chạy trước đoạn sau:

```sql
SELECT username, role, status
FROM public.app_users
WHERE username = 'admin';
```

Kết quả mong đợi: **1 dòng** với `username = admin`, `role = admin` và `status = active`. Nếu không có dòng nào, không chạy bước đổi mật khẩu và cần kiểm tra đúng dự án Supabase.

### Bước 2 — Đặt mật khẩu mới

Trong đoạn SQL dưới đây, **chỉ thay lần xuất hiện đầu tiên** của `NHAP_MAT_KHAU_MOI_TAI_DAY` ở phần `SELECT` bằng mật khẩu mạnh mới (tối thiểu 12 ký tự). **Giữ nguyên** lần xuất hiện thứ hai trong điều kiện `p.value <> ...` để tránh vô tình lưu mật khẩu placeholder. Không thêm dấu ngoặc nhọn.

```sql
-- RESET MẬT KHẨU TÀI KHOẢN admin
WITH new_password AS (
    SELECT 'NHAP_MAT_KHAU_MOI_TAI_DAY'::text AS value
)
UPDATE public.app_users AS u
SET
    password_hash = extensions.crypt(
        p.value,
        extensions.gen_salt('bf')
    ),
    updated_at = now()
FROM new_password AS p
WHERE u.username = 'admin'
  AND p.value <> 'NHAP_MAT_KHAU_MOI_TAI_DAY'
  AND length(p.value) >= 12
RETURNING
    u.username,
    u.role,
    u.status,
    u.updated_at;
```

**Chạy và kiểm tra:** Kết quả phải có **1 dòng** cho `admin`. Nếu là `Success. No rows returned` thì **chưa có gì được cập nhật** — thường do quên thay mật khẩu mẫu, nhập dưới 12 ký tự, hoặc chọn sai username.

Mật khẩu phân biệt chữ hoa/chữ thường. Nếu mật khẩu chứa dấu nháy đơn `'`, phải viết thành `''` bên trong chuỗi SQL. Đừng gửi mật khẩu vào cuộc trò chuyện. Sau khi chạy, nên đóng hoặc xóa câu SQL chứa mật khẩu thật khỏi lịch sử truy vấn lưu trên Supabase nếu có thể.

### Bước 3 — Kiểm tra đăng nhập

Mở https://kehoachdtp-collab.github.io/marketing-dtp/ rồi nhập username **`admin`** và mật khẩu vừa đặt.

Nếu vẫn báo sai: kiểm tra dự án Supabase đang chọn, kết quả UPDATE có trả về 1 dòng không, và trạng thái `active`. Website đang sử dụng hàm `public.verify_password` để kiểm tra hash bcrypt.

### Đổi mật khẩu tài khoản nhân viên

Khi đã đăng nhập bằng tài khoản Admin, nên đổi mật khẩu cho nhân viên qua **Quản trị hệ thống → Quản lý user** thay vì chạy SQL trực tiếp. Chỉ dùng SQL Editor khi cần khôi phục tài khoản Admin và có quyền quản trị Supabase. Không đoán UUID hoặc lấy mật khẩu mẫu từ bản seed/demo cũ.

## Sao lưu, phát hành và xử lý lỗi

Trước import lớn hoặc ghi đè, giữ file Excel gốc hoặc xuất dữ liệu. Không commit file backup hoặc dữ liệu cá nhân. Khi khác dữ liệu giữa máy, tạm dừng sửa song song, đồng bộ và xác định bản mới nhất trên Supabase trước khi thao tác.

GitHub Pages chạy từ nhánh `main`: https://kehoachdtp-collab.github.io/marketing-dtp/. Sau commit, kiểm tra **Actions** để biết trạng thái deploy. Nếu trình duyệt còn bản cũ, nhấn **Ctrl+Shift+R**.

Clone và kiểm tra repo:

```bash
git clone https://github.com/kehoachdtp-collab/marketing-dtp.git
cd marketing-dtp
git pull --ff-only origin main
git status --short --branch
```

Trước khi commit:

```bash
git diff --check
git diff -- README.md index.html
git add README.md
git commit -m "Add MKT dashboard usage guide"
git push origin main
```

Chỉ add file liên quan. Không commit `.env`, token, mật khẩu, CCCD hoặc file backup.

### Lỗi thường gặp

- **Trang cũ**: Ctrl+Shift+R, đợi GitHub Pages deploy và xem tab Actions.
- **Máy khác thiếu dữ liệu**: bấm Cập nhật/Đồng bộ, kiểm tra mạng, trạng thái Supabase và dữ liệu đã được ghi cloud chưa.
- **Sai đăng nhập**: kiểm tra username; nhờ Admin reset hoặc dùng SQL Editor nếu mất quyền Admin. Không thể giải mã hash để xem mật khẩu cũ.
- **Excel lỗi hoặc thiếu dòng**: kiểm tra header, định dạng file, chế độ nhập và file có đang mở trong Excel hay không.
- **OCR sai**: dùng ảnh rõ, đủ sáng; so sánh từng trường trước khi lưu.
- **Video không render**: nếu chưa có API/Webhook thì ứng dụng chỉ tạo/sao chép prompt cho Google Flow.

## Bảo mật

- Repository public: mọi file được commit đều có thể xem công khai.
- Không lưu mật khẩu, API key, service-role key hoặc dữ liệu cá nhân trong mã nguồn.
- Không đưa service-role key vào trình duyệt; dùng publishable/anon key với RPC/RLS đúng cấu hình.
- Cấp quyền theo nhu cầu tối thiểu. Sau khi reset, đổi mật khẩu tạm ngay.
