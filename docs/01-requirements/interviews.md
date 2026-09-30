# Persona và phỏng vấn người dùng giả định

| Mục | Nội dung |
|---|---|
| Dự án | E-Learning App — Đề tài số 5, môn Lập trình thiết bị di động |
| Task | R-01 (PLAN §13) — giai đoạn 1: Requirement Analysis |
| Người phụ trách | B (theo PLAN §12) — hạn 07/10/2026 |
| Phiên bản | 1.1 (đồng bộ PLAN.md v1.3) |
| Tài liệu liên quan | [user-stories.md](user-stories.md) · [SRS.md](SRS.md) · [PLAN.md §2, §6](../../PLAN.md) |

> **Lưu ý quan trọng — đây là người dùng giả định.** Theo yêu cầu đề bài ("Thu thập yêu cầu từ người dùng giả định", `MotaDetai_SDLC.txt`), ba persona dưới đây do nhóm **xây dựng dựa trên hiểu biết về hành vi học trực tuyến phổ biến**; các cuộc phỏng vấn là **kịch bản mô phỏng**, không phải dữ liệu khảo sát thật. Tên, tuổi, nghề nghiệp và câu trả lời đều là hư cấu. Nhóm sẽ kiểm chứng lại giả định bằng UAT giả định (2–3 bạn ngoài nhóm dùng thử theo kịch bản — PLAN §14.1) và ghi góp ý vào `improvements.md`.

## Mục lục

1. [Mục tiêu và phương pháp](#1-mục-tiêu-và-phương-pháp)
2. [Ba persona](#2-ba-persona)
3. [Bộ câu hỏi phỏng vấn](#3-bộ-câu-hỏi-phỏng-vấn)
4. [Câu trả lời giả định theo persona](#4-câu-trả-lời-giả-định-theo-persona)
5. [Tổng hợp insight và ánh xạ sang yêu cầu](#5-tổng-hợp-insight-và-ánh-xạ-sang-yêu-cầu)
6. [Insight ngoài phạm vi](#6-insight-ngoài-phạm-vi)
7. [Hạn chế và kế hoạch kiểm chứng](#7-hạn-chế-và-kế-hoạch-kiểm-chứng)

---

## 1. Mục tiêu và phương pháp

**Mục tiêu:**

1. Hiểu bối cảnh, nhu cầu và nỗi đau của những người sẽ dùng ứng dụng học trực tuyến trên điện thoại.
2. Rút ra các yêu cầu chức năng (FR), phi chức năng (NFR) và quy tắc nghiệp vụ (BR) có căn cứ, làm đầu vào cho user stories ([user-stories.md](user-stories.md)) và SRS ([SRS.md](SRS.md)).
3. Xác định rõ những mong muốn **nằm ngoài phạm vi** (Won't — PLAN §2.2) để quản lý kỳ vọng.

**Phương pháp:** phỏng vấn bán cấu trúc theo một bộ câu hỏi chung (14 câu, mục 3), mỗi persona trả lời từ góc nhìn riêng. Câu trả lời được viết theo kịch bản giả định; sau đó nhóm gom các ý lặp lại thành **insight** và ánh xạ sang yêu cầu (mục 5).

**Đối tượng:** ba persona đại diện cho hai nhóm người dùng của ứng dụng (Learner) và một actor phụ (Teacher):

| Persona | Vai trò với hệ thống | Actor (PLAN §6.1) |
|---|---|---|
| P1 — Sinh viên CNTT muốn học thêm | Người học chính | Learner |
| P2 — Người đi làm chuyển sang Design | Người học chính | Learner |
| P3 — Giảng viên | Người sở hữu khóa học, được follow và đánh giá | Teacher |

## 2. Ba persona

### 2.1 P1 — Phạm Minh Quân, sinh viên CNTT muốn học thêm

| Thuộc tính | Nội dung |
|---|---|
| Tuổi – nghề nghiệp | 21 tuổi, sinh viên năm 3 ngành Công nghệ thông tin |
| Mục tiêu | Học thêm Python, SQL, JavaScript ngoài chương trình để xin thực tập; hoàn thành ít nhất một khóa mỗi tháng |
| Thiết bị – mạng | Android tầm trung (Android 12), thường dùng Wi-Fi ký túc xá (chập chờn), 4G có giới hạn dung lượng |
| Thời điểm học | Giờ trống giữa các tiết, trên xe buýt, buổi tối 1–2 giờ |
| Mức độ thành thạo công nghệ | Cao |
| Ngân sách | Thấp; ưu tiên khóa rẻ, miễn phí hoặc đang giảm giá |
| Nỗi đau | Học rời rạc nên quên đang học đến đâu; khó biết khóa nào chất lượng; mạng yếu làm video giật; hay bỏ dở vì không thấy tiến bộ |
| Kỳ vọng với app | Tìm nhanh theo ngôn ngữ lập trình, xem thử trước khi mua, tiếp tục đúng chỗ đang học, thấy % hoàn thành |
| Câu nói đặc trưng | "Em chỉ có vài chục phút mỗi lần, mở app lên là phải học tiếp được ngay." |

### 2.2 P2 — Đỗ Thu Trang, người đi làm chuyển sang Design

| Thuộc tính | Nội dung |
|---|---|
| Tuổi – nghề nghiệp | 28 tuổi, chuyên viên marketing đang chuyển sang UI/UX Design |
| Mục tiêu | Xây lộ trình học UX/UI, có sản phẩm (portfolio) để xin việc vị trí Junior Designer sau 6 tháng |
| Thiết bị – mạng | iPhone (iOS 17), Wi-Fi ổn định ở nhà, 4G khi đi làm |
| Thời điểm học | Buổi tối sau giờ làm, cuối tuần; thỉnh thoảng trong giờ nghỉ trưa |
| Mức độ thành thạo công nghệ | Trung bình – khá |
| Ngân sách | Sẵn sàng trả tiền cho khóa chất lượng, thường mua nhiều khóa cùng lúc |
| Nỗi đau | Quá nhiều khóa, khó phân biệt chất lượng; sợ mua nhầm; cần phản hồi từ cộng đồng khi làm bài tập; muốn biết giảng viên là ai, có kinh nghiệm thực tế không |
| Kỳ vọng với app | Đọc đánh giá thật, xem hồ sơ giảng viên, giỏ hàng nhiều khóa, hỏi đáp khi bí, nộp project và xem bài của người khác |
| Câu nói đặc trưng | "Tôi muốn biết người dạy là ai và những học viên trước đã học được gì rồi mới bỏ tiền." |

### 2.3 P3 — Vũ Đức Anh, giảng viên

| Thuộc tính | Nội dung |
|---|---|
| Tuổi – nghề nghiệp | 35 tuổi, UX Designer kiêm giảng viên thỉnh giảng tại một trường đại học |
| Mục tiêu | Giới thiệu chuyên môn, thu hút học viên, nhận phản hồi để cải thiện khóa học |
| Thiết bị – mạng | Laptop khi soạn bài; điện thoại (Android 14) khi kiểm tra phản hồi |
| Vai trò trong phạm vi đồ án | Actor phụ **Teacher**: sở hữu khóa học, được follow/đánh giá; dữ liệu do seed, **không có giao diện riêng** (PLAN §6.1, G6) |
| Mức độ thành thạo công nghệ | Cao |
| Nỗi đau | Học viên không biết trình độ, múi giờ, lĩnh vực của mình; khó theo dõi ai quan tâm đến khóa; câu hỏi của học viên bị bỏ ngỏ |
| Kỳ vọng với app | Hồ sơ giảng viên đầy đủ và đẹp, số người theo dõi, đánh giá tổng hợp; học viên tương tác lành mạnh trong Q&A |
| Câu nói đặc trưng | "Hồ sơ của tôi phải nói lên tôi là ai và học viên đánh giá các khóa của tôi ra sao." |

### 2.4 So sánh nhanh các persona

| Tiêu chí | P1 — Quân | P2 — Trang | P3 — Anh |
|---|---|---|---|
| Actor | Learner | Learner | Teacher |
| Nền tảng | Android | iOS | Android |
| Yếu tố quyết định mua | Giá, khuyến mãi, xem thử | Đánh giá, giảng viên, nội dung | (không mua) |
| Nhu cầu nổi bật | Tiếp tục nhanh, học khi mạng yếu | Lộ trình, tương tác, portfolio | Hồ sơ nổi bật, phản hồi |
| Tính năng ưu tiên | FR-05, FR-16, FR-15, FR-24 | FR-10, FR-13, FR-14, FR-18, FR-19 | FR-20, FR-10 |

## 3. Bộ câu hỏi phỏng vấn

Bộ câu hỏi gồm **14 câu** (yêu cầu ≥ 10). Mục "Mục đích" cho biết câu hỏi nhằm khai thác yêu cầu nào.

| # | Câu hỏi | Mục đích |
|---|---|---|
| Q1 | Bạn thường học một kỹ năng mới bằng cách nào, ở đâu và vào lúc nào trong ngày? | Hiểu bối cảnh sử dụng, thời lượng mỗi lần học, thiết bị |
| Q2 | Bạn đã từng học trực tuyến qua ứng dụng trên điện thoại chưa? Điều gì làm bạn hài lòng và điều gì làm bạn khó chịu nhất? | Nỗi đau hiện tại, tính năng phải có, lỗi cần tránh |
| Q3 | Khi chọn một khóa học, bạn dựa vào những thông tin nào để quyết định? | Thông tin cần hiển thị trên card và trang chi tiết |
| Q4 | Bạn tìm khóa học bằng cách nào: gõ từ khóa, duyệt danh mục hay xem gợi ý? Bạn cần bộ lọc hoặc cách sắp xếp nào? | Thiết kế tìm kiếm, lọc, sắp xếp |
| Q5 | Trước khi trả tiền, bạn cần xem hoặc biết điều gì để yên tâm? | Xem thử, đánh giá, hồ sơ giảng viên |
| Q6 | Bạn nghĩ gì về việc thanh toán trong app? Bạn muốn mua từng khóa hay nhiều khóa cùng lúc? Điều gì làm bạn ngần ngại? | Giỏ hàng, thanh toán, độ tin cậy |
| Q7 | Khi xem video bài giảng trên điện thoại, bạn cần những gì để việc học thuận tiện? | Trình phát, tiếp tục vị trí, chuyển bài |
| Q8 | Bạn theo dõi tiến độ học của mình như thế nào? Điều gì giúp bạn duy trì động lực? | Tiến độ, phần trăm hoàn thành, trạng thái bài |
| Q9 | Khi gặp phần không hiểu, bạn xử lý ra sao? Hỏi đáp ngay trong khóa có hữu ích với bạn không? | Q&A |
| Q10 | Bạn có làm bài tập hoặc project trong khóa không? Bạn có muốn nộp bài và xem bài của người khác không? | Project, tài liệu |
| Q11 | Kết nối mạng của bạn thường như thế nào? Bạn mong app xử lý ra sao khi mạng yếu hoặc mất? | Offline, cache, hiệu năng |
| Q12 | Bạn có muốn nhận thông báo từ ứng dụng không? Loại thông báo nào hữu ích? Bạn có lo ngại gì về bảo mật tài khoản? | Thông báo, bảo mật |
| Q13 | Bạn quan tâm đến điều gì ở người giảng dạy và bạn muốn thấy gì trong hồ sơ của họ? | Hồ sơ giảng viên, Follow |
| Q14 | Bạn mong muốn gì ở trang hồ sơ cá nhân của mình và ở giao diện ứng dụng nói chung (chữ, màu, thao tác)? | Hồ sơ cá nhân, khả dụng, hiệu năng |

## 4. Câu trả lời giả định theo persona

> Toàn bộ câu trả lời dưới đây là **giả định** (xem cảnh báo đầu tài liệu). Trích dẫn dạng "…" là lời nhân vật hư cấu.

### 4.1 Q1 — Cách học, thời điểm, thiết bị

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Mình học bằng điện thoại là chính, trên xe buýt hoặc giữa hai tiết học, mỗi lần chừng 15–30 phút. Tối về mới ngồi laptop làm bài tập." |
| P2 — Trang | "Tôi học buổi tối sau giờ làm khoảng một tiếng và cuối tuần. Xem video bằng điện thoại vì tiện nằm xem, khi cần làm bài mới mở laptop." |
| P3 — Anh | "Khi soạn bài tôi dùng laptop. Còn phần học viên tương tác, tôi thường xem trên điện thoại vào giờ nghỉ. Tôi cũng tự học công cụ mới qua video ngắn." |

### 4.2 Q2 — Trải nghiệm học qua app di động

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Mình từng dùng vài app nhưng hay bị mất chỗ đang xem, phải kéo lại từ đầu. Video giật khi mạng yếu cũng bực. Thích nhất là app có thanh tiến độ rõ ràng." |
| P2 — Trang | "App tôi từng dùng có quá nhiều mục lộn xộn, khó tìm khóa mình đã mua. Tôi thích khi có thẻ khóa học đẹp, thấy ngay phần trăm đã học." |
| P3 — Anh | "Tôi dùng thử với tư cách học viên. Điểm yếu là phần hỏi đáp rối, khó biết câu hỏi nào mới. Tôi thích giao diện tối giản và dễ đọc." |

### 4.3 Q3 — Tiêu chí chọn khóa học

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Giá trước tiên, rồi điểm đánh giá và số bài học. Thấy nhãn giảm giá hoặc Best-seller là mình để ý. Khóa miễn phí thì mình thử ngay. Khóa nào hay mình bấm thích và chia sẻ cho bạn cùng lớp." |
| P2 — Trang | "Tôi xem điểm đánh giá, số lượng học viên, nội dung từng chương, rồi mới đến giá. Tên giảng viên và kinh nghiệm của họ rất quan trọng." |
| P3 — Anh | "Nếu là học viên thì tôi nhìn vào giảng viên và nội dung chi tiết. Nhãn Best-seller có ích nhưng không đủ, tôi cần đọc đánh giá thật." |

### 4.4 Q4 — Cách tìm kiếm và bộ lọc

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Mình gõ thẳng 'python' hay 'sql'. Có sẵn các chủ đề nóng để bấm là tiện. Muốn lọc theo giá và điểm đánh giá, sắp xếp theo giá tăng dần. Nếu app nhớ các từ khóa mình từng tìm thì đỡ phải gõ lại." |
| P2 — Trang | "Tôi hay duyệt theo danh mục Design, rồi lọc theo điểm đánh giá từ 4 sao trở lên. Có mục 'Gợi ý cho bạn' thì tốt. Kết quả nhiều thì phải cuộn mượt, đừng bắt tôi bấm trang." |
| P3 — Anh | "Tôi thường gõ tên công cụ hoặc tên một giảng viên khác để xem họ dạy gì. Hy vọng tìm được cả theo tên giảng viên." |

### 4.5 Q5 — Thông tin cần trước khi trả tiền

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Mình muốn xem thử vài bài đầu miễn phí để biết giảng viên dạy có dễ hiểu không, tiếng và hình ảnh có ổn không." |
| P2 — Trang | "Xem thử bài miễn phí, đọc đánh giá của người học trước, xem có thể lọc theo số sao để đọc cả đánh giá thấp. Ngoài ra là danh sách bài và thời lượng." |
| P3 — Anh | "Học viên cần thấy mô tả khóa, quyền lợi nhận được và đánh giá. Tôi muốn các đánh giá được hiển thị công khai, công bằng." |

### 4.6 Q6 — Thanh toán và giỏ hàng

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Mình ngại nhập thẻ trong app lạ. Nếu là app học tập thì phải nói rõ là thanh toán an toàn. Mình mua từng khóa, ưu tiên khóa miễn phí hoặc giảm giá." |
| P2 — Trang | "Tôi hay mua cả combo vài khóa, nên cần giỏ hàng, xem được tổng tiền, xóa bớt khóa. Thanh toán xong phải học được ngay, đừng bắt chờ." |
| P3 — Anh | "Tôi không mua nhưng quan sát thấy học viên bỏ giỏ hàng nhiều khi không rõ tổng tiền hoặc không biết đã mua thành công hay chưa." |

### 4.7 Q7 — Nhu cầu khi xem video

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Quan trọng nhất là mở lại đúng chỗ đang xem dở, dù đã thoát app. Chuyển bài nhanh, biết bài nào đã xong. Toàn màn hình khi xem trên xe." |
| P2 — Trang | "Tôi hay bị gián đoạn nên cần tiếp tục đúng vị trí. Nếu xem hết một bài, tự đánh dấu hoàn thành giúp tôi đỡ phải bấm." |
| P3 — Anh | "Tôi muốn học viên xem hết bài và quay lại đúng chỗ, vì như vậy họ tiếp thu tốt hơn. Bài giảng của tôi dài, nên việc ghi nhớ vị trí rất cần thiết." |

### 4.8 Q8 — Theo dõi tiến độ và động lực

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Thanh phần trăm đầy dần làm mình có động lực. Cũng muốn tách các khóa 'đang học' và 'đã xong' để đỡ rối." |
| P2 — Trang | "Tôi muốn thấy tổng thời lượng mỗi khóa, phần trăm hoàn thành, và khi xong khóa thì có thông báo chúc mừng." |
| P3 — Anh | "Tiến độ cho thấy học viên nghiêm túc. Khi học viên hoàn thành khóa, họ thường sẵn lòng để lại đánh giá." |

### 4.9 Q9 — Xử lý khi gặp phần không hiểu, Q&A

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Mình thường lên mạng tự tìm. Nếu ngay trong khóa có mục hỏi đáp, hỏi được và thấy người khác trả lời thì rất tiện. Bấm tim câu hỏi hay cũng tốt." |
| P2 — Trang | "Tôi hay hỏi thẳng trong khóa. Muốn có thông báo khi có người trả lời câu hỏi của mình, và gõ nhanh được vài biểu tượng cảm xúc." |
| P3 — Anh | "Tôi mong học viên hỗ trợ nhau trong hỏi đáp. Ngoài ra tôi muốn trả lời trực tiếp nhưng biết là phiên bản này chưa có công cụ dành cho giảng viên." |

### 4.10 Q10 — Bài tập, project và tài liệu

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Có tài liệu đi kèm để tải về thì tốt. Nộp project để có sản phẩm cho hồ sơ xin việc thì mình có làm nếu không phiền." |
| P2 — Trang | "Rất quan trọng với tôi. Tôi cần mô tả bài tập rõ ràng, tải tài liệu, nộp project và xem project của học viên khác để học hỏi." |
| P3 — Anh | "Project là phần tôi coi trọng nhất. Tôi muốn học viên nộp file gọn (ảnh, pdf, zip) và xem được bài của nhau để so sánh." |

### 4.11 Q11 — Mạng yếu hoặc mất kết nối

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Mạng ký túc xá hay rớt. Mình mong mở app lên vẫn xem được danh sách khóa đã học chứ đừng trắng màn hình, và app báo rõ là đang mất mạng." |
| P2 — Trang | "Tôi ít gặp mất mạng, nhưng nếu có thì mong màn hình khóa của tôi vẫn hiện, không bắt đăng nhập lại." |
| P3 — Anh | "Trên tàu điện tôi hay bị mất sóng. Dữ liệu đã xem nên còn để đọc lại, và app đừng báo lỗi khó hiểu." |

### 4.12 Q12 — Thông báo và bảo mật

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Chỉ cần thông báo việc quan trọng như mua thành công hoặc có người trả lời câu hỏi. Mình không muốn bị làm phiền quá nhiều. Mật khẩu phải được bảo vệ, đừng để lộ." |
| P2 — Trang | "Tôi muốn có mục thông báo trong app: thanh toán thành công, có người trả lời, hoàn thành khóa. Đăng nhập một lần rồi giữ phiên để khỏi nhập lại; đăng xuất thì xóa sạch dữ liệu của tôi." |
| P3 — Anh | "Tôi lo tài khoản bị chiếm dụng. Mật khẩu cần đủ mạnh, và phải chắc chắn chỉ học viên đã mua mới xem được video trả phí." |

### 4.13 Q13 — Mong đợi về hồ sơ giảng viên

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Mình muốn biết thầy cô làm ở đâu, dạy những khóa nào và điểm đánh giá trung bình." |
| P2 — Trang | "Tôi muốn xem tiểu sử, lĩnh vực chuyên sâu, các khóa nhóm theo chủ đề, đánh giá từ học viên, và có nút theo dõi. Có cả giờ địa phương để biết khi nào họ có thể phản hồi. Nếu có trang liệt kê tất cả giảng viên nổi bật thì càng tiện." |
| P3 — Anh | "Hồ sơ cần ảnh bìa, ảnh đại diện, chức danh, nơi làm việc, giờ địa phương, số khóa, số học viên, điểm đánh giá và số người theo dõi. Khóa nào được đánh giá cao thì nên được nhãn 'Top-rated'." |

### 4.14 Q14 — Hồ sơ cá nhân, giao diện và hiệu năng

| Persona | Trả lời giả định |
|---|---|
| P1 — Quân | "Trang cá nhân cần cho thấy số khóa đã lưu, đang học, đã hoàn thành và danh sách khóa đã lưu để mình mua sau. App mở nhanh, cuộn danh sách mượt trên máy tầm trung." |
| P2 — Trang | "Tôi muốn sửa tên, chức danh và ảnh đại diện. Giao diện chữ dễ đọc, nút bấm đủ lớn. Cỡ chữ lớn trên điện thoại của tôi cũng không được vỡ layout." |
| P3 — Anh | "Chữ nhỏ và nút bé là điều tôi ghét nhất. Ứng dụng nên hiển thị lỗi bằng lời dễ hiểu và có nút thử lại." |

## 5. Tổng hợp insight và ánh xạ sang yêu cầu

Cột **Nguồn** cho biết persona nêu ý và câu hỏi liên quan. Cột **Yêu cầu** ánh xạ tới FR/NFR/BR trong [PLAN.md §6](../../PLAN.md); cột **User story** ánh xạ tới [user-stories.md](user-stories.md).

| Insight | Nội dung insight | Nguồn | Yêu cầu (FR / NFR / BR) | Ưu tiên | User story |
|---|---|---|---|---|---|
| IN-01 | Người học có ít thời gian mỗi lần; cần **tiếp tục đúng vị trí đang xem** dù đã thoát app | P1, P2, P3 (Q1, Q7) | FR-16, BR-03, NFR-10 | Must | US-21, US-22 |
| IN-02 | Tìm nhanh theo **từ khóa** (kể cả tên giảng viên, tag) và có sẵn **chủ đề nóng** | P1, P3 (Q4) | FR-05, BR-13 | Must | US-06, US-07 |
| IN-03 | Cần **lọc theo giá, điểm đánh giá, danh mục** và **sắp xếp** kết quả | P1, P2 (Q4) | FR-06 | Should | US-09 |
| IN-04 | **Duyệt theo danh mục** và mục gợi ý "Recommended for you" | P2 (Q4) | FR-07, FR-04, BR-12 | Must | US-05, US-08 |
| IN-05 | Cần **điểm đánh giá, số đánh giá và đọc được review** (kể cả lọc theo số sao) trước khi mua | P1, P2, P3 (Q3, Q5) | FR-10 | Must (xem) | US-13, US-14 |
| IN-06 | Muốn **viết đánh giá** sau khi học để chia sẻ với người khác | P2, P3 (Q8) | FR-11, BR-08 | Should | US-15 |
| IN-07 | Muốn **xem thử bài miễn phí** trước khi quyết định mua | P1, P2 (Q5) | FR-09, BR-01 | Must | US-12 |
| IN-08 | Thấy rõ **giá, khuyến mãi, nhãn Best-seller** trên card khóa học | P1, P3 (Q3) | FR-04, BR-10 | Must | US-05, US-10 |
| IN-09 | Cần **giỏ hàng nhiều khóa**, xem tổng tiền, xóa bớt, thanh toán rõ ràng và học được ngay sau khi trả tiền | P2, P3 (Q6) | FR-13, FR-14, BR-06, BR-07 | Must | US-17, US-18 |
| IN-10 | Người dùng e ngại thanh toán trong app lạ → cần thông báo rõ **thanh toán demo, không cần thẻ thật**; khóa miễn phí ghi danh trực tiếp | P1, P2 (Q6) | FR-14, BR-06, BR-17 | Must | US-18, US-19 |
| IN-11 | Muốn **lưu khóa học** để mua hoặc học sau và xem lại ở trang cá nhân | P1 (Q14), P2 | FR-12, FR-21, BR-15 | Must | US-16, US-31 |
| IN-12 | Cần thấy **trạng thái từng bài** (đã xong, đang học, mở, khóa) và **% hoàn thành** khóa; tách "đang học" và "đã xong" | P1, P2 (Q7, Q8) | FR-09, FR-15, BR-02, BR-04, BR-05 | Must | US-11, US-20 |
| IN-13 | Muốn **hỏi đáp trong khóa**, thích/like, nhận thông báo khi có người trả lời, chèn emoji nhanh | P1, P2, P3 (Q9) | FR-19, BR-09, FR-23 | Should | US-23, US-24, US-33 |
| IN-14 | Cần **mô tả project, tài liệu tải về, nộp project** và xem project của người khác | P1, P2, P3 (Q10) | FR-18, BR-09 | Should | US-25, US-26, US-27 |
| IN-15 | Mạng chập chờn: cần **xem lại dữ liệu đã tải**, banner báo mất mạng, tránh thao tác gây lỗi | P1, P2, P3 (Q11) | FR-24, NFR-04 | Should | US-34 |
| IN-16 | Muốn **thông báo trong app** cho sự kiện quan trọng (thanh toán, có câu trả lời, hoàn thành khóa), không làm phiền quá mức | P1, P2 (Q12) | FR-23 | Should | US-33 |
| IN-17 | **Bảo mật tài khoản:** mật khẩu mạnh, giữ phiên đăng nhập, đăng xuất xóa sạch dữ liệu; chỉ người đã mua mới xem video trả phí | P1, P2, P3 (Q12) | FR-01, FR-02, FR-03, NFR-05, NFR-06, BR-01 | Must | US-01, US-02, US-03, US-04 |
| IN-18 | Muốn xem **hồ sơ giảng viên** đầy đủ (chức danh, nơi làm việc, giờ địa phương, thống kê, khóa theo nhóm, review) và **Follow** | P2, P3 (Q13) | FR-20, BR-14, BR-16 | Should | US-28, US-29, US-30 |
| IN-19 | Giảng viên mong **hồ sơ nổi bật**, nhãn "Top-rated", số người theo dõi phản ánh đúng | P3 (Q13) | FR-20 | Should | US-30 |
| IN-20 | Trang cá nhân hiển thị **thống kê Save / On going / Completed**, cho **sửa tên, headline, ảnh đại diện** | P1, P2 (Q14) | FR-21, FR-22 | Must / Should | US-31, US-32 |
| IN-21 | Ứng dụng **mở nhanh, cuộn mượt** trên máy tầm trung | P1 (Q14) | NFR-01, NFR-02, NFR-03 | Must | US-05, US-07 |
| IN-22 | **Chữ dễ đọc, nút đủ lớn, hỗ trợ cỡ chữ hệ thống**, lỗi nói bằng lời dễ hiểu và có nút Retry | P2, P3 (Q14) | NFR-07 | Must | Áp dụng cho mọi story |
| IN-23 | Hỗ trợ cả Android và iOS | P1 (Android), P2 (iOS) | NFR-08 | Must | Áp dụng cho mọi story |
| IN-24 | Muốn **thích/chia sẻ** khóa học cho bạn bè; nhớ **các từ khóa đã tìm**; xem **danh sách tất cả giảng viên** | P1 (Q3, Q4), P2 (Q13) | FR-17 (Could); mở rộng FR-05, FR-20 (Could, chưa có FR riêng) | Could | US-35, US-36, US-37 |

## 6. Insight ngoài phạm vi

Các mong muốn sau **không được hiện thực** trong phạm vi đồ án (Won't — PLAN §2.2) và được đưa vào đề xuất cải tiến (PLAN §16.3, `improvements.md`):

| Mã | Mong muốn (nguồn) | Lý do ngoài phạm vi | Xử lý |
|---|---|---|---|
| OOS-01 | Giảng viên **tự tạo khóa học, bài học và trả lời Q&A ngay trong ứng dụng** (P3, Q9) | Không làm web admin / giảng viên tạo khóa học trong app; dữ liệu do seed (G6); actor Teacher không có giao diện riêng | Đề xuất cải tiến 6 (web admin/giảng viên) |
| OOS-02 | **Thanh toán thật**, hoàn tiền, mã giảm giá (P1, P2, Q6) | Thanh toán giả lập (G5, ADR-10) | Đề xuất cải tiến 1 |
| OOS-03 | **Tải video xem offline**, tốc độ phát, phụ đề (P1, Q11) | Offline chỉ đọc lại dữ liệu đã cache; không tải video | Đề xuất cải tiến 3 |
| OOS-04 | **Push notification thật** và chat thời gian thực (P2, Q12) | Chỉ có thông báo trong app | Đề xuất cải tiến 2 |
| OOS-05 | **Chứng chỉ hoàn thành (PDF)** (P2, Q8) | Ngoài phạm vi; theo BR-18 (PLAN v1.3) danh sách `benefits` của khóa không ghi "Certificate" (dòng "Certificate of complete" trong ảnh design chỉ là dữ liệu minh họa) | Đề xuất cải tiến 9 |
| OOS-06 | **Đa ngôn ngữ** (P1, Q14) | UI tiếng Anh như design (G8) | Đề xuất cải tiến 10 |

## 7. Hạn chế và kế hoạch kiểm chứng

| Hạn chế | Giảm thiểu |
|---|---|
| Persona và câu trả lời là **giả định**, có thể lệch so với người dùng thật | Kiểm chứng bằng UAT giả định với 2–3 bạn ngoài nhóm (PLAN §14.1), ghi góp ý vào `improvements.md` |
| Chỉ ba persona; chưa có nhóm người dùng lớn tuổi, người dùng không rành công nghệ | Áp dụng NFR-07 (cỡ chữ hệ thống, touch target lớn, thông báo lỗi dễ hiểu) để giảm rủi ro |
| Persona giảng viên không có giao diện riêng | Các nhu cầu của giảng viên được đáp ứng gián tiếp qua hồ sơ, đánh giá và số theo dõi hiển thị cho học viên (FR-20) |
