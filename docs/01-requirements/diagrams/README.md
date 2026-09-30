# Sơ đồ giai đoạn Requirement Analysis

Thư mục này chứa sơ đồ dạng mã nguồn (PlantUML) của tài liệu yêu cầu. Sơ đồ là code nên được quản lý phiên bản trong Git và có thể sinh lại ảnh bất cứ lúc nào (ADR-12, PLAN §5.2).

| File | Nội dung | Ảnh sinh ra |
|---|---|---|
| [use-case.puml](use-case.puml) | 4 sơ đồ use case: tổng quan 21 UC + 3 sơ đồ theo nhóm chức năng | `use-case.png`, `use-case-account-profile.png`, `use-case-discovery-purchase.png`, `use-case-learning-interaction.png` |

> Bản xem nhanh trên GitHub của sơ đồ tổng quan có trong [SRS.md §3.3](../SRS.md#33-sơ-đồ-use-case) (Mermaid). Ảnh PNG dùng để nộp bài và đưa vào slide.

## 1. Cấu trúc file `use-case.puml`

Mỗi khối `@startuml <tên>` ... `@enduml` là một sơ đồ độc lập, **tên khối chính là tên file ảnh** khi xuất:

| Khối `@startuml` | Nội dung |
|---|---|
| `use-case` | Tổng quan: 4 actor (Guest, Learner, Teacher, Payment Gateway giả lập), 21 UC theo 6 package (Tài khoản, Khám phá, Mua và ghi danh, Học tập, Tương tác, Hồ sơ), quan hệ `<<include>>` / `<<extend>>` |
| `use-case-account-profile` | UC-01, 02, 03, 18, 19, 20 |
| `use-case-discovery-purchase` | UC-04 đến UC-12 |
| `use-case-learning-interaction` | UC-08, 13, 14, 15, 16, 17, 21 |

Quy ước màu: xanh nhạt = Must · tím nhạt = Should · xám = Could · vàng nhạt = chức năng dùng chung (Xác thực phiên, Kiểm tra quyền ghi danh — không đánh số UC).

## 2. Chuẩn bị môi trường (một lần)

Cài extension **PlantUML** (tác giả `jebbs`, ID `jebbs.plantuml`) trong VS Code (đã nằm trong danh sách extension ở task P-05).

Extension cần một trong hai cách render:

| Cách | Yêu cầu | Ghi chú |
|---|---|---|
| **A. Render cục bộ (khuyến nghị)** | Cài **Java** (JRE 11 trở lên) và **Graphviz** | Không gửi nội dung sơ đồ ra ngoài; dùng được khi không có mạng |
| B. Render bằng PlantUML Server | Có mạng | Extension mặc định dùng server công cộng nên **nội dung `.puml` được gửi lên server ngoài**. Không nên dùng với sơ đồ nhạy cảm; với dự án này sơ đồ không chứa bí mật nhưng nhóm nên chọn cách A |

Máy dev hiện tại chưa có Java (CLAUDE.md §3). Cài đặt trên Windows (kiểm tra tên gói bằng `winget search` nếu lệnh báo không tìm thấy):

```bash
winget install EclipseAdoptium.Temurin.21.JRE
winget install Graphviz.Graphviz
# mở terminal mới rồi kiểm tra
java -version
dot -V
```

Trong VS Code, mở **Settings (JSON)** (hoặc file `.vscode/settings.json` của máy bạn — không cần commit) và đặt:

```json
{
  "plantuml.render": "Local",
  "plantuml.exportFormat": "png",
  "plantuml.exportOutDir": "docs/01-requirements/diagrams",
  "plantuml.exportSubFolder": false
}
```

- `plantuml.render = Local` buộc extension dùng Java cục bộ thay vì server công cộng.
- Nếu `dot` không nằm trong `PATH`, thêm `"plantuml.commandArgs": ["-graphvizdot", "C:/Program Files/Graphviz/bin/dot.exe"]`.
- Nếu không muốn cài Graphviz, có thể thử engine dựng sẵn bằng cách thêm dòng `!pragma layout smetana` ngay sau `@startuml <tên>` (vẫn cần Java; bố cục có thể khác đôi chút).

## 3. Xem trước và xuất PNG

**Xem trước**

1. Mở `use-case.puml` trong VS Code.
2. Nhấn `Alt + D` (hoặc `Ctrl+Shift+P` → **PlantUML: Preview Current Diagram**). Đặt con trỏ trong khối `@startuml` nào thì xem khối đó.

**Xuất PNG**

1. `Ctrl+Shift+P` → **PlantUML: Export Current Diagram** → chọn định dạng `png` để xuất sơ đồ đang chọn.
2. Hoặc **PlantUML: Export Current File Diagrams** để xuất **cả 4 sơ đồ** trong file một lần.
3. Ảnh được ghi vào thư mục `docs/01-requirements/diagrams/` với tên trùng tên khối (`use-case.png`, …). Muốn ảnh sắc nét cho slide, thêm `"plantuml.exportFormat": "svg"` rồi xuất thêm bản SVG, hoặc dùng `skinparam dpi 200` ngay sau `@startuml`.
4. Mở ảnh, kiểm tra chữ tiếng Việt hiển thị đúng dấu và không bị cắt; sau đó commit cả `.puml` lẫn `.png`.

**Xuất bằng dòng lệnh (tùy chọn, khi đã có Java)**

```bash
java -jar plantuml.jar -tpng -charset UTF-8 -o . use-case.puml
```

## 4. Quy tắc cập nhật sơ đồ

- Sửa `.puml` trước, xuất lại PNG, rồi mới cập nhật phần Mermaid trong SRS §3.3 cho khớp.
- Mã UC, tên UC và ưu tiên phải **khớp PLAN.md §6.2**. Khi PLAN đổi, sửa cả sơ đồ và `SRS.md`.
- Không dán ảnh chụp màn hình sơ đồ thay cho `.puml`; ảnh PNG chỉ là sản phẩm sinh ra từ mã nguồn.
- Mỗi PR sửa sơ đồ ghi rõ Task ID (R-03) và đính kèm ảnh PNG mới để reviewer xem nhanh.

## 5. Xử lý sự cố thường gặp

| Hiện tượng | Nguyên nhân / cách xử lý |
|---|---|
| "Cannot find Java" | Chưa cài Java hoặc chưa mở terminal mới sau khi cài; kiểm tra `java -version`, đặt `plantuml.java` trong Settings nếu Java không có trong `PATH` |
| Lỗi "Dot executable" / sơ đồ báo thiếu Graphviz | Cài Graphviz và khởi động lại VS Code, hoặc dùng `!pragma layout smetana` |
| Chữ tiếng Việt bị vuông/ô | Máy thiếu font hỗ trợ tiếng Việt; đổi `skinparam defaultFontName` sang font có sẵn (Arial, Segoe UI, DejaVu Sans) |
| Preview trắng, không báo lỗi | Con trỏ đang nằm ngoài khối `@startuml`/`@enduml`; đặt con trỏ trong khối cần xem |
| Xuất ra tên file lạ (`use-case_001.png`) | Khối `@startuml` thiếu tên; luôn đặt tên khối như trong file hiện tại |
