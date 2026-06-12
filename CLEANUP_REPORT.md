# CLEANUP REPORT

| File/thư mục | Hành động | Lý do | Có thể khôi phục ở đâu |
|---|---|---|---|
| app.py | Archive sang _archive_legacy | Streamlit/Python cũ, không phải entrypoint demo hiện tại | _archive_legacy/app.py |
| requirements.txt | Archive sang _archive_legacy | Dependency cho Streamlit/Python cũ | _archive_legacy/requirements.txt |
| HUONG_DAN_CHAY.md | Archive sang _archive_legacy | Hướng dẫn cũ, hiện đã có README.md và MO_DASHBOARD.txt | _archive_legacy/HUONG_DAN_CHAY.md |
| index.html | Giữ lại | Entrypoint demo hiện tại, chứa login và dashboard localStorage | Không archive |
| server.js | Giữ lại | Đang được package.json dev và MKT_DASHBOARD.bat dùng để chạy demo localhost:3399/login | Không archive |
| MKT_DASHBOARD.bat | Giữ lại | Launcher hiện tại để mở dashboard demo | Không archive |
| MKT_DASHBOARD.url | Giữ lại | Shortcut hiện tại đến /login | Không archive |
| MO_DASHBOARD.txt | Giữ lại | Hướng dẫn mở dashboard và tài khoản demo | Không archive |
| app/ | Giữ lại | NextJS scaffold, theo yêu cầu không xóa/archive | Không archive |
| lib/ | Giữ lại | NextJS/Supabase foundation, theo yêu cầu không xóa/archive | Không archive |
| database/ | Giữ lại | Migration Auth/Admin, theo yêu cầu không xóa/archive | Không archive |
| scripts/ | Giữ lại | Script seed owner, theo yêu cầu không xóa/archive | Không archive |
| node_modules/ | Giữ lại | Dependency local hiện có | Không archive |
| .next/ | Giữ lại | Build/cache Next hiện có, theo yêu cầu không xóa/archive | Không archive |
| .env* | Không đụng | Không đọc/sửa/archive bất kỳ file env nào | Không áp dụng |