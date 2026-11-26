# Xuất cao độ hố ga — DWG → CSV

Đường dẫn sau khi cập nhật GitHub Pages: https://lamhuunhan1999.github.io/xuat-cao-do-ho-ga/

Chuyển điểm cao độ và cọc chi tiết ADS Civil trong DWG sang hai CSV cho Lisp Hố ga v3.6. Chạy trực tiếp trong Chrome/Edge; không cần ZWCAD, Python hay file CMD. Bản vẽ được xử lý trong Web Worker trên thiết bị, không tải lên máy chủ.

## Bản 2.1 — sửa đọc cọc có nét dẫn nhãn

- Nhận diện cọc ADS có một vạch ngắn và một đoạn gạch dưới nhãn dài, dựa trên chiều dài, vị trí, tính thẳng hàng và điểm chèn chữ. Không chọn đoạn ngắn một cách tùy ý.
- Bỏ qua lớp tim tuyến đã biết `ACDBALIGNMENT`; không dùng nó làm điểm cao độ hoặc cọc. Các lớp tùy biến chưa biết vẫn báo lỗi.
- Gộp cọc có cùng lý trình, tâm trùng trong 0,000001 m và hướng trùng (cho phép đảo chiều vector); giữ các tên trong một dòng.
- Cọc cùng lý trình, cách tâm không quá 0,001 m nhưng khác vị trí/hướng: yêu cầu chọn cọc theo hồ sơ. Không tự lấy trung bình. Chọn từng ô rồi bấm **Đọc DWG và tạo CSV** lần nữa. Báo cáo JSON giữ các ứng viên và mã cọc đã chọn.
- Cùng lý trình nhưng cách tâm lớn hơn 0,001 m: chặn xuất để kiểm tra/tách tuyến.

## Cách dùng

1. Lưu DWG sau khi cập nhật dữ liệu khảo sát trong ADS.
2. Mở trang, chọn DWG (tối đa 100 MB), bấm **Đọc DWG và tạo CSV**.
3. Kiểm tra số cọc, số điểm, lý trình, cao độ và các cảnh báo; tải bộ CSV.
4. Trong ZWCAD: `HGCAODO` → nguồn cao độ **CSV** → `CaoDo.csv`; nguồn cọc **CSV** → `Coc.csv`.
5. Dùng lại hai CSV nếu dữ liệu khảo sát không đổi. Chỉ cần chuyển lại khi vị trí, hướng, lý trình cọc hoặc cao độ thay đổi.

Nút **Dừng xử lý** kết thúc Worker ngay cả khi bộ đọc đang giải mã DWG. Nút **Xóa kết quả** giải phóng các kết quả tải xuống trong bộ nhớ trang.

## Định dạng giữ nguyên

- `CaoDo.csv`: `X;Y;Z;ID`
- `Coc.csv`: `S;NAME;X;Y;NX;NY`

S là lý trình cộng dồn (m). NX/NY là vector ngang cọc hướng về bên trái theo chiều tăng lý trình. Không tự đổi đơn vị hay đảo X/Y: DWG phải cùng hệ tọa độ, đơn vị mét với bản vẽ hố ga. Tên ngoài ASCII được ghi dạng escape trong CSV để dùng với Lisp cũ; báo cáo JSON giữ tên Unicode.

## Phạm vi

- Điểm ADS `AcDbStationPoint1`, cọc `ACDBPOLE` có đồ họa đại diện đã lưu.
- Cọc đã tách LINE + TEXT, có XData ItemId chung, trên layer `TK-DBO-1104/1105/1106/1107`.
- Chỉ Model space; chưa xử lý điểm/cọc trong block hoặc Xref. Mỗi DWG một tuyến.
- Không đọc NTD, không đoán cao độ từ các nhãn TEXT rời.
- Dữ liệu thiếu, lý trình xung đột hoặc lớp tùy biến chưa hỗ trợ sẽ chặn xuất CSV.
- Bộ đọc có thể trả cảnh báo không nghiêm trọng 4/64 với đối tượng tùy biến ADS. Công cụ công khai các mã này và kiểm tra từng đồ họa cọc/điểm trước khi xuất. Các cờ lỗi khác chặn xử lý.
- Đọc XYZ trong đồ họa được lưu, không truy cập cơ sở dữ liệu nội bộ ADS. Đối chiếu một vài cọc/điểm trước khi dùng; không bảo đảm hỗ trợ mọi DWG.

## Kiểm thử

Đã đối chiếu riêng tư với các bản vẽ mẫu (không đưa bản vẽ lên repository):

- Drawing1: 11.539 điểm, 762 đối tượng cọc; 26 nhóm trùng tâm/hướng được gộp và 4 cặp cần chọn hướng. Sau khi chọn: 732 dòng cọc. Đã đối chiếu tâm của từng dòng với vạch cọc nguồn, không lấy nét nhãn lệch 30 m.
- 24.351 điểm và 1.560 cọc: CSV cao độ khớp từng byte bản Windows v1; CSV cọc có sai khác làm tròn vector không quá 1,1 × 10⁻¹⁴.
- Bản có cọc đã tách: 10.868 điểm và 1.537 cọc.
- Đã thử giao diện Chromium: tải ZIP, đối chiếu CSV, Dừng, file giả DWG, thiếu cọc và màn hình hẹp 390 px; không lỗi JavaScript và không có yêu cầu tải bản vẽ lên mạng.

## Triển khai GitHub Pages

**Settings → Pages → Deploy from a branch → main → /(root) → Save.** Trang chủ phải là `index.html` (không có dấu chấm cuối).

Trang dùng đường dẫn tương đối nên hoạt động trong thư mục `/xuat-cao-do-ho-ga/`. Không cần máy chủ ứng dụng hay GitHub Actions. Lần đầu trình duyệt tải bộ đọc WebAssembly khoảng 7,5 MB từ jsDelivr (dự phòng unpkg); không gửi dữ liệu DWG tới các nguồn này. Phiên bản được ghim và kiểm tra SHA-256. Mất kết nối tới cả hai nguồn sẽ có thông báo lỗi rõ ràng.

Kiểm thử nhỏ không cần bản vẽ riêng tư: `node --test tests/engine.test.mjs`.

## Phát triển và giấy phép

Mã nguồn ứng dụng: GPL-3.0-or-later, xem `LICENSE`. Không có mã theo dõi, quảng cáo, tài khoản hay lưu bản vẽ trên mạng.

Bộ đọc `@mlightcad/libredwg-web@0.9.4`, dựa trên GNU LibreDWG, GPL-3.0. Xem `THIRD_PARTY.md` để lấy mã nguồn tương ứng, nguồn tải và mã kiểm tra. File `archive/trang-gioi-thieu.html` giữ lại trang giới thiệu ban đầu.
