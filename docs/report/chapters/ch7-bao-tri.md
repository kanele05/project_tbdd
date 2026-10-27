# CHƯƠNG 7. BẢO TRÌ VÀ CẢI TIẾN (MAINTENANCE)

Chương này trình bày giai đoạn **Bảo trì và cải tiến**: quy trình ghi nhận và sửa lỗi sau khi sản phẩm chạy thật, nhật ký lỗi kèm mã commit sửa, quy trình phát hành bản vá (hotfix) và cập nhật ứng dụng di động, ba sự cố thật mà nhóm gặp khi vận hành, và bảng đề xuất cải tiến có thứ tự ưu tiên. Mã commit dẫn trong chương lấy từ lịch sử git của nhánh `develop` (`git log`).

## 7.1 Quy trình bảo trì

### 7.1.1 Quy trình ghi nhận và sửa lỗi

Quy trình nhóm áp dụng (PLAN §16.1), mỗi bước đều có sản phẩm cụ thể:

1. **Phát hiện:** từ kiểm thử (chương 5), người dùng thử trực tiếp trên `eliuh.site`/APK, hoặc từ giám sát (Grafana, log) – lỗi được ghi lại với mã `BUG-<khu vực>-<số>` theo mẫu: mức độ, màn hình, bước tái hiện, mong đợi, thực tế, ảnh.
2. **Phân loại mức độ** theo Bảng 5.2: Critical / Major / Minor / Cosmetic; Critical và Major được xử lý trước.
3. **Sửa:** nhánh `fix/…` từ `develop` (hotfix khẩn cấp có thể từ `main`); mỗi lỗi sửa kèm **test tái hiện** (test tự động mới hoặc cập nhật test cũ) để lỗi không quay lại. Commit theo Conventional Commits (`fix(mobile): …`, `fix(server): …`).
4. **Kiểm tra:** CI chạy lại toàn bộ test; với lỗi giao diện, kiểm lại bằng cùng kịch bản Playwright đã phát hiện lỗi (retest, mục 5.7.3).
5. **Phát hành:** merge vào `main` → CI/CD tự triển khai (chương 6); nếu lỗi nằm ở JavaScript của app di động thì phát hành thêm qua EAS Update.
6. **Ghi nhận:** cập nhật nhật ký lỗi (mục 7.2) và nhật ký thay đổi kế hoạch PLAN §22.

### 7.1.2 Quy ước phiên bản và nhánh

- Nhánh `main` (bản ổn định/nộp) ← `develop` (tích hợp) ← `feature/<task-id>-…`, `fix/…`. Mặc định của repo trên GitHub là `develop`.
- Phiên bản theo SemVer: `v0.x` trong lúc phát triển; `v1.0.0` là bản phát hành chính thức; `v1.0.x` là bản vá. Đẩy tag `v*` sẽ kích hoạt workflow Deploy và gắn thêm tag image `1.0.0`, `1.0` (mục 6.5).
- Tại thời điểm viết báo cáo (26/10/2026), repo có 64 commit trên `develop` và **chưa có tag phát hành**; `CHANGELOG.md` chưa được tạo, lịch sử thay đổi nằm ở git log và PLAN §22. Theo lịch rút gọn (hạn nộp 05/11/2026), nhóm dự kiến phát hành `v1.0.0` trong khoảng 31/10–01/11/2026; đẩy tag này sẽ kích hoạt workflow Deploy. `[[CẦN NHÓM BỔ SUNG: ngày tạo tag v1.0.0, liên kết GitHub Release và APK sau khi phát hành]]`

### 7.1.3 Các mốc phát triển và phát hành chính

**Bảng 7.1 – Mốc thời gian (theo lịch sử git và PLAN §22)**

| Ngày | Sự kiện |
|---|---|
| 30/09/2026 | Khởi tạo repo, kế hoạch (PLAN v1.0–1.3), scaffold Expo SDK 57 |
| 02–03/10 | Hoàn tất server và mobile cho Sprint 1–3 (MVP); polish, WCAG AA, tăng coverage test |
| 04/10 | Bắt đầu giai đoạn 2: chọn concept giao diện Noir, theme sáng/tối, i18n vi/en, Gemini, Prometheus, Docker, CI/CD, xác thực đầy đủ (AUTH-01…07) |
| 07/10 | Chọn và dựng AWS EC2 Sydney sau khi các nhà cung cấp khác không khả thi |
| 09–10/10 | CI/CD chạy trên EC2; reCAPTCHA v2; vai trò học viên/giảng viên; xem thử YouTube |
| 11/10 | Hoàn tất Studio của giảng viên và Quản trị (TA-01…07); giao diện web kiểu Netflix |
| 13/10 | EAS Update; model AI dự phòng; sửa lỗi upload trên web |
| 17–19/10 | Sự cố tên miền (mục 7.3.3) |
| 24/10 | **Đóng băng mã nguồn**, bắt đầu kiểm thử có minh chứng |
| 25–26/10 | Sửa 22 lỗi, kiểm lại 21/21 Đạt; thay video seed hỏng; phát hành EAS Update |
| 27/10 | Chốt phạm vi tài liệu, viết báo cáo |
| 26–30/10 *(kế hoạch)* | Hoàn thành nháp báo cáo |
| 31/10–01/11 *(kế hoạch)* | Dựng báo cáo Word (.docx); phát hành `v1.0.0` (tag, GitHub Release kèm APK) |
| 02–03/11 *(kế hoạch)* | Làm slide và video |
| 04/11 *(kế hoạch)* | Rà soát cuối |
| 05/11 *(kế hoạch)* | **Hạn nộp bài** |
| 06–07/11 *(kế hoạch)* | Diễn tập trình bày |
| 08/11 *(kế hoạch)* | **Buổi trình bày** |

## 7.2 Nhật ký lỗi

### 7.2.1 Lỗi từ đợt kiểm thử 24–26/10/2026

Hai mươi hai lỗi phát hiện ở chương 5 đã được sửa trong ba commit ngày 26/10/2026. Bảng 7.2 liệt kê trạng thái cuối cùng; chi tiết bước tái hiện và ảnh trước/sau nằm ở `docs/04-testing/evidence/*/bugs.md` và `retest/results.md`.

**Bảng 7.2 – Nhật ký lỗi và commit sửa**

| Mã lỗi | Mức độ | Mô tả ngắn | Commit sửa | Trạng thái |
|---|---|---|---|---|
| BUG-LEARN-01 | Major | Tải tài liệu dự án lỗi trên web (`expo-file-system` không chạy trên web) | `db225df` (thêm `downloadResource.web.ts`) | Đã sửa, kiểm lại Đạt |
| BUG-LEARN-02 | Major | Video seed `download.blender.org` trả 403, 45 bài lỗi | `0d82a10` + chạy script `replaceLessonVideo.ts` trên production | Đã sửa, kiểm lại Đạt |
| BUG-AUTH-01 | Minor | Nút "Tôi đã lưu các mã này" không điều hướng khi mở trực tiếp URL | `db225df` (router có điểm quay lại dự phòng) | Đã sửa, kiểm lại Đạt |
| BUG-DISC-02 | Minor | Không đếm lượt chia sẻ trên web | `db225df` (`useShareCourse`) | Đã sửa, kiểm lại Đạt |
| BUG-DISC-03 | Minor | Thẻ thanh toán thành công bị thanh điều hướng che (desktop) | `db225df` (`PaymentResultView`) | Đã sửa, kiểm lại Đạt |
| BUG-DISC-04 | Minor | Chia sẻ không phản hồi khi không có Web Share API | `db225df` (sao chép liên kết + toast) | Đã sửa, kiểm lại Đạt |
| BUG-LEARN-03 | Minor | Khung video lỗi bố cục | `db225df` (`PlayerStatus`, `LessonPlayer`) | Đã sửa, kiểm lại Đạt |
| BUG-LEARN-04 | Minor | Ghi chú lỗi AI Tutor nằm ngoài màn hình | `db225df` (`useStickToBottom`, `AiTutorScreen`) | Đã sửa sau lần kiểm lại thứ hai |
| BUG-LEARN-09 | Minor | Form đánh giá không đóng khi mở bằng URL trực tiếp | `db225df` (`WriteReviewScreen`) | Đã sửa, kiểm lại Đạt |
| BUG-STU-01 | Minor | Từ chối link YouTube có `t=30s`, `t=1m30s` | `23b74f9` (mobile và server `youtube.ts`) | Đã sửa, kiểm lại Đạt |
| BUG-STU-03 | Minor | Không cảnh báo khi tải lại lúc còn thay đổi chưa lưu | `db225df` | Đã sửa, kiểm lại Đạt |
| BUG-STU-04 | Minor | Bài "AI đề xuất" mất sau khi tải lại | `db225df` | Đã sửa, kiểm lại Đạt |
| BUG-DISC-01 | Cosmetic | Lưới poster desktop lệch, trống bên phải | `db225df` (`ResponsiveGrid`) | Đã sửa, kiểm lại Đạt |
| BUG-DISC-05 | Cosmetic | "6+ đánh giá" khi tổng là 6 | `db225df` (`ReviewsHeadline`) | Đã sửa, kiểm lại Đạt |
| BUG-DISC-06 | Cosmetic | Mục "Khóa học này bao gồm" lặp hai lần | `db225df` | Đã sửa, kiểm lại Đạt |
| BUG-LEARN-05 | Cosmetic | Video 360p không lấp đầy cột chính | `db225df` | Đã sửa, kiểm lại Đạt |
| BUG-LEARN-06 | Cosmetic | Viền focus chữ nhật trong ô nhập Q&A | `db225df` (`Composer`) | Đã sửa, kiểm lại Đạt |
| BUG-LEARN-07 | Cosmetic | Lỗi thiếu tệp chỉ hiện ở lần bấm thứ hai | `db225df` (`SubmitProjectScreen`) | Đã sửa, kiểm lại Đạt |
| BUG-LEARN-08 | Cosmetic | Tiêu đề form sửa đánh giá | `db225df` (`ReviewForm`) | Đã sửa, kiểm lại Đạt |
| BUG-STU-02 | Cosmetic | Câu ghim lên đầu nhưng ngoài khung nhìn | `db225df` (`QuestionDetailScreen`) | Đã sửa sau lần kiểm lại thứ hai |
| BUG-ADM-01 | Cosmetic | "Gửi Một phút trước" viết hoa giữa câu | `db225df` (các dòng hàng chờ quản trị) | Đã sửa, kiểm lại Đạt |
| BUG-AUTH-02 | Cosmetic | Nhãn banner/danh mục từ dữ liệu mẫu vẫn tiếng Anh | – | Không sửa (đã quyết định: dữ liệu mẫu giữ tiếng Anh, CLAUDE.md §2) |

`[[CẦN NHÓM BỔ SUNG: nếu cần ghi tên người phát hiện/người sửa từng lỗi theo mẫu PLAN §14.4; hiện thông tin này chỉ có ở mức "phát hiện bởi đợt kiểm thử có minh chứng"]]` Hai lỗi BUG-LEARN-04 và BUG-STU-02 được sửa ở lần kiểm lại thứ hai (26/10); nhật ký git không tách riêng commit cho lần sửa này nên nhóm ghi chung vào commit sửa lỗi của đợt `db225df`.

### 7.2.2 Lỗi phát hiện khi tích hợp và khi người dùng thử trên sản phẩm chạy thật

Ngoài đợt kiểm thử chính thức, nhiều lỗi được phát hiện trong lúc ghép nối và dùng thử trên `eliuh.site`/APK, được sửa bằng các commit `fix` riêng:

**Bảng 7.3 – Các lỗi sửa trong quá trình phát triển và vận hành**

| Ngày | Commit | Lỗi / nguyên nhân | Cách sửa |
|---|---|---|---|
| 03/10 | `f7bc1b2` | Nội dung cuộn không hiện trên Android và web khi dùng `BrandRefreshControl` | Chuyển tiếp `children` trong component |
| 04/10 | `2f92a28` | Nhãn tab "Khóa học của tôi" tiếng Việt quá dài | Rút gọn nhãn |
| 10/10 | `a6af1a0` | Trình phát YouTube chồng lên thanh tab Học (khung cố định 16:9 cộng hàng ghi nguồn) | Khung lấy chiều cao tự nhiên của trình phát |
| 10/10 | `36f0fc4` | WebView YouTube/reCAPTCHA bị thay nội dung khi mở liên kết ngoài; modal xem thử khó đọc ở giao diện sáng | Mở liên kết ngoài bằng trình duyệt hệ thống, siết danh sách nguồn WebView, modal dùng theme tối |
| 10/10 | `fd34614` | Sau khi khởi động lại máy, `pg_dump` đầu tiên chạy trước khi database sẵn sàng rồi chờ đến hôm sau, tạo khoảng trống sao lưu tới 2 ngày | Chờ database sẵn sàng và thử lại tối đa 6 lần cách nhau 5 phút (mục 6.9.1) |
| 10/10 | `958ab41` | Workflow mặc định chưa đúng nhà cung cấp CAPTCHA; chưa cache tệp tĩnh băm tên | Mặc định reCAPTCHA v2, kiểm tra site key ở bước preflight, thêm `Cache-Control: immutable` |
| 10/10 | `6d0b885` | Màn Học trên màn hình nhỏ chưa gọn; các mục review P3 | Chỉnh bố cục, sửa các mục P3 |
| 11/10 | `ad12f0c` | Thông báo lưu sẵn câu chữ theo ngôn ngữ lúc tạo, đổi ngôn ngữ app thì danh sách lẫn lộn | Lưu khóa dịch (`data.key`, `params`) và dịch lúc hiển thị; thêm script backfill cho dữ liệu cũ |
| 13/10 | `7a27ece` | Ảnh bìa/avatar/project tải lên từ web bị lỗi 400 `VALIDATION_ERROR` vì trình duyệt chuyển phần `{uri,name,type}` thành `[object Object]` | Gửi tệp dạng Blob khi chạy trên web (`lib/formData.ts`) |
| 13/10 | `cda0250` | Màn có nhiều "guard" thay đổi chưa lưu hỏi lại nhiều lần khi rời | Chỉ hỏi một lần |
| 13/10 | `f8a95c4`, `179ef83` | AI Gemini quá tải làm tính năng soạn khóa báo "chưa khả dụng" | Ghi lý do lỗi AI vào log; thêm model dự phòng (mục 7.3.1) |

## 7.3 Hotfix, phát hành và các sự cố thật

### 7.3.1 Quy trình hotfix và phát hành thực tế

Với sản phẩm chạy thật, nhóm áp dụng hai đường phát hành tùy loại thay đổi:

**Bảng 7.4 – Hai đường phát hành bản vá**

| Loại thay đổi | Đường phát hành | Thời gian |
|---|---|---|
| Server, cấu hình, bản web | Merge vào `main` → `deploy.yml` tự kiểm thử, build image, đẩy GHCR, cập nhật EC2 và kiểm tra `/health` (mục 6.6). Trước thay đổi dữ liệu hoặc cấu hình quan trọng: sao lưu database và `.env`, gắn tag image `pre-<tên>-<ngày>` để rollback | khoảng 6–7 phút |
| Mã JavaScript của app Android đã cài | **EAS Update** (OTA): `npm run update:preview -- "mô tả"`; script (`mobile/scripts/eas-update.mjs`, commit `5cc24c3`; sửa truyền môi trường EAS ở `8e93a62`) lấy biến môi trường đúng profile, tắt đọc `.env` cục bộ, xóa cache Metro. APK tự nhận ở lần mở sau | vài phút, không cần người dùng cài lại |
| Thay đổi native hoặc nâng SDK | Build APK mới bằng EAS Build và tăng `version` trong `app.json` | 10–30 phút xếp hàng của EAS |

Với dữ liệu đã có người dùng, nhóm **không bao giờ reseed**; thay đổi dữ liệu thực hiện bằng script có chế độ dry-run mặc định và `--apply` để ghi (`updateCoursePreviews.ts`, `setUserRole.ts`, `backfillNotificationKeys.ts`, `replaceLessonVideo.ts`), luôn sao lưu trước và chạy lại dry-run sau để xác nhận không còn thay đổi (mục 6.11).

### 7.3.2 Sự cố 1 – Gemini quá tải và model dự phòng (13/10/2026)

- **Triệu chứng:** tính năng AI soạn khóa trên Android báo "chưa khả dụng". Cùng một model `gemini-3.5-flash-lite`, chạy local nhận lỗi HTTP 503, còn từ máy chủ EC2 Sydney yêu cầu **treo cho tới khi hết thời gian chờ 45 giây** rồi mới lỗi.
- **Nguyên nhân:** dịch vụ Gemini ở gói miễn phí bị quá tải ở model đó; ứng dụng chỉ có một model duy nhất nên không có đường lùi, và log lúc đó chưa ghi lý do lỗi nên khó chẩn đoán.
- **Cách xử lý (commit `f8a95c4`, `179ef83`):**
  1. Log AI ghi thêm **lý do lỗi** (ví dụ HTTP 503) – không ghi khóa API hay nội dung người dùng.
  2. Thêm biến `GEMINI_FALLBACK_MODEL`: khi model chính trả lỗi *unavailable*, *timeout* hoặc *rate_limited*, hệ thống thử model phụ; mỗi model được một nửa `AI_TIMEOUT_MS`; với luồng streaming (AI Tutor), chỉ đổi model khi **chưa gửi chữ nào** cho người dùng để câu trả lời không bị đứt đoạn. Test của provider được bổ sung tương ứng (`gemini.provider.test.ts`).
  3. Trên production đổi model chính sang `gemini-3.5-flash`, model dự phòng `gemini-3.1-flash-lite` (bản `.env` cũ được lưu trong thư mục sao lưu trước deploy).
- **Bài học:** dịch vụ AI bên ngoài phải coi là có thể lỗi; cần đường lùi, thời gian chờ có giới hạn, và log đủ lý do. Các trạng thái lỗi AI trên giao diện đã có nút thử lại (kiểm ở TC-LEARN-46…48).

### 7.3.3 Sự cố 2 – Video seed ngừng phục vụ (26/10/2026)

- **Phát hiện:** trong đợt kiểm thử, bài 04 của khóa UX Foundation (cũng là bài "đang học" mặc định của tài khoản demo) báo "Không tải được video này" (BUG-LEARN-02, Major).
- **Nguyên nhân:** 45 bài học trong dữ liệu mẫu dùng clip Sintel trailer đặt tại `download.blender.org`; máy chủ này nay trả HTTP 403 (kể cả khi đổi User-Agent), trình duyệt chặn bằng `ERR_BLOCKED_BY_RESPONSE.NotSameOrigin`. Đây là lỗi **phụ thuộc nội dung bên thứ ba**.
- **Cách xử lý (commit `0d82a10`):**
  1. Đổi nguồn video trong seed sang một clip khác của `test-videos.co.uk` (Big Buck Bunny 720p), để người cài mới không gặp lỗi.
  2. Viết script `server/scripts/replaceLessonVideo.ts` (service `lessonVideoReplace.service.ts`, test tích hợp `lessonVideoReplace.test.ts`) cập nhật **dữ liệu đã có** mà không reseed: thay URL, tính lại tổng thời lượng khóa học và kẹp vị trí xem trong giới hạn thời lượng mới. Mặc định dry-run.
  3. Trên production: sao lưu database, dry-run, chạy `--apply` – kết quả **45 bài, 30 khóa, 283 bản ghi tiến độ** được cập nhật; chạy lại dry-run cho 0 bài.
  4. Kiểm lại: video phát bình thường ở cả điện thoại và máy tính (`currentTime` tăng, không còn HTTP 403).
- **Bài học:** hạn chế phụ thuộc vào đường dẫn tệp của bên thứ ba cho dữ liệu mẫu; nếu buộc phải dùng thì có script thay thế và kiểm tra đường dẫn định kỳ.

### 7.3.4 Sự cố 3 – Tên miền bị khóa (clientHold, 17–19/10/2026)

- **Triệu chứng:** ngày 17/10 toàn bộ `eliuh.site`, `app.`, `api.`, `grafana.` ngừng phân giải DNS – web, API và Grafana đều không truy cập được dù máy chủ vẫn chạy bình thường.
- **Nguyên nhân:** nhà đăng ký đặt trạng thái **clientHold** cho tên miền vì chưa xác minh email của chủ thể đăng ký (quy định ICANN, thời hạn 15 ngày kể từ lúc đăng ký). Đây không phải lỗi hệ thống của nhóm.
- **Cách xử lý:** trưởng nhóm xác minh email chủ thể tại nhà đăng ký ngày 19/10; trạng thái registry trở về `active` lúc 10:35 cùng ngày và dịch vụ chạy lại ngay mà không phải cấu hình lại. Có thể kiểm tra trạng thái bằng truy vấn RDAP của registry (trường `status`).
- **Bài học:** sau khi mua tên miền phải xác minh email chủ thể ngay và đặt lịch nhắc; khi sự cố "mọi thứ chết" nên kiểm tra DNS/trạng thái tên miền trước khi nghi ngờ máy chủ. Đây cũng là lý do nên có giám sát từ bên ngoài (uptime) – hiện đã có sẵn dịch vụ tùy chọn Uptime Kuma trong Compose nhưng chưa bật (mục 6.3).

## 7.4 Theo dõi sau phát hành

- **Giám sát chủ động:** Grafana (độ trễ, tỷ lệ lỗi, tài nguyên máy, log chậm/lỗi) – chương 6.8.
- **Sao lưu:** dump hằng ngày, snapshot EBS, kiểm tra định kỳ bằng `ls backups/` và log container `backup`.
- **Chi phí:** theo dõi credit AWS; máy chạy khoảng 0,11 USD/giờ nên chỉ bật khi demo, dừng khi không dùng.
- **Phản hồi người dùng:** `[[CẦN NHÓM BỔ SUNG: kết quả dùng thử của người ngoài nhóm (số người, kịch bản, góp ý) nếu có — đưa vào bảng cải tiến 7.5]]`

## 7.5 Đề xuất cải tiến

Bảng 7.5 tổng hợp từ PLAN §16.3, kết quả kiểm thử, các sự cố ở 7.3 và danh sách việc còn mở trong nhật ký dự án. *Ưu tiên:* **Cao** = ảnh hưởng độ tin cậy/an toàn hoặc yêu cầu khi bảo vệ; **TB** = nâng chất lượng rõ rệt; **Thấp** = mở rộng. *Ước lượng* là ước tính sơ bộ của nhóm theo ngày công một người (S ≤ 1 ngày, M 2–4 ngày, L 1–2 tuần, XL > 2 tuần).

**Bảng 7.5 – Đề xuất cải tiến**

| # | Cải tiến | Lý do / nguồn | Ưu tiên | Ước lượng |
|---|---|---|---|---|
| 1 | Cấu hình **alert rule** trong Grafana (API down, 5xx tăng, đĩa > 80 %, OOM) và bật Uptime Kuma kiểm tra từ bên ngoài | Chưa có cảnh báo tự động; sự cố tên miền 17/10 cho thấy cần giám sát ngoài máy chủ | Cao | S–M |
| 2 | Sao lưu **ra ngoài máy chủ** (S3/Cloudinary hoặc máy khác) cho cả database và thư mục uploads, kiểm tra khôi phục định kỳ | Hiện bản dump nằm cùng máy, chỉ có snapshot EBS làm lớp ngoài | Cao | M |
| 3 | **Kiểm thử trên thiết bị thật** (Android và iOS): TalkBack/VoiceOver, cỡ chữ lớn, tải tệp bằng `expo-file-system`, share sheet, offline, FPS; kiểm thử UAT với người ngoài nhóm | Chương 5.7.5 – các hạng mục chưa kiểm được | Cao | M |
| 4 | Giảm **thời gian tải lần đầu** của web (8–10 s): chia nhỏ bundle, nén Brotli, preload font, CDN gần người dùng hoặc đặt máy chủ gần Việt Nam hơn | Số đo TC-PROD-10 và độ trễ VN–Sydney | Cao | M–L |
| 5 | **Thanh toán thật** (Stripe/MoMo/VNPay sandbox), mã giảm giá | Hiện thanh toán giả lập (PLAN §16.3 mục 1) | TB | L |
| 6 | **Push notification** (expo-notifications) cho trả lời Q&A, duyệt/từ chối khóa, khuyến mãi | PLAN §16.3 mục 2 | TB | M |
| 7 | Lưu tệp upload lên **object storage** (S3/Cloudinary) thay vì ổ đĩa máy chủ; trình phát HLS, tải video học offline, phụ đề, tốc độ phát | PLAN §16.3 mục 3, 5; giảm phụ thuộc ổ đĩa EC2 | TB | L |
| 8 | Đăng nhập **Google/Apple** và **sinh trắc học** (đã bỏ AUTH-10 khỏi phạm vi) | PLAN §16.3 mục 4; AUTH-10 | TB | M |
| 9 | **Tìm kiếm full-text** (PostgreSQL `tsvector`/`pg_trgm`), gợi ý khi gõ, `GET /tags` đầy đủ để chọn thẻ trong Studio | PLAN §16.3 mục 7; Studio hiện chỉ chọn được thẻ "hot" | TB | M |
| 10 | **Gợi ý khóa học** dựa trên hành vi xem; chứng chỉ hoàn thành (PDF), gamification (streak, huy hiệu) | PLAN §16.3 mục 8–9 | Thấp | L |
| 11 | **Ngôn ngữ người dùng lưu ở server** để email duyệt/từ chối khóa và OTP gửi đúng ngôn ngữ (hiện theo ngôn ngữ lúc gửi) | Việc còn mở trong nhật ký dự án | TB | S–M |
| 12 | **Staging riêng** (Compose thứ hai hoặc profile) và quy trình canary trước khi lên production | Hiện chỉ một môi trường, an toàn dựa vào CI + sao lưu | TB | M |
| 13 | **Sentry** (hoặc tương đương) cho lỗi crash của app; `Content-Security-Policy` cho bản web | PLAN §16.3 mục 11; việc hạ tầng còn lại | TB | S–M |
| 14 | **Redis cache** thay cache in-memory của server khi chạy nhiều bản API | PLAN §16.3 mục 11 | Thấp | M |
| 15 | **E2E Maestro** cho 3 luồng chính và tài liệu API **Swagger/OpenAPI** | Đã bỏ T-06, S-22 khỏi phạm vi (PLAN v2.27) | Thấp | M |
| 16 | **Kiểm thử tải** (k6/Artillery) và kiểm thử xâm nhập cơ bản; đo lại coverage sau các thay đổi giai đoạn 2 | Chưa thực hiện; coverage đo lần cuối 03/10 | TB | M |
| 17 | Build **IPA/Google Play** (AAB đã có profile `production`) | iPhone hiện dùng PWA vì thiếu tài khoản Apple Developer | Thấp | L |
| 18 | Dịch phần **dữ liệu mẫu** (CTA banner, tên danh mục) hoặc cho phép quản trị chỉnh bản dịch | BUG-AUTH-02 (hiện giữ tiếng Anh) | Thấp | S |
| 19 | Nâng cấp thành phần hạ tầng: `docker-ce`, dọn build cache lớn trên EC2 | Việc hạ tầng còn lại | Thấp | S |

## 7.6 Bài học kinh nghiệm

1. **Kiểm thử có minh chứng sau khi đóng băng mã nguồn** giúp phát hiện lỗi mà test tự động không bắt được (lỗi bố cục desktop, hành vi riêng của trình duyệt như Web Share API, `FormData`), nhưng cần sớm kiểm trên thiết bị thật.
2. **Phụ thuộc bên ngoài** (Gemini, YouTube, nguồn video, nhà đăng ký tên miền, nhà cung cấp email/CAPTCHA) là nguồn rủi ro lớn nhất khi chạy thật; mỗi phụ thuộc cần đường lùi hoặc kịch bản xử lý (model dự phòng, script thay dữ liệu, nhắc xác minh).
3. **Script dữ liệu có dry-run, sao lưu trước, chạy lại để xác nhận** giúp thay đổi dữ liệu thật mà không phải reseed.
4. **CI/CD bắt buộc kiểm thử trước khi build** giữ cho 407 suite luôn xanh trước mỗi lần cập nhật production, giảm hẳn rủi ro khi sửa lỗi gấp.
5. **Ghi nhật ký quyết định** (PLAN §22) giúp tái hiện vì sao đổi nhà cung cấp, đổi phạm vi, đóng băng code – thông tin cần thiết khi viết báo cáo.
