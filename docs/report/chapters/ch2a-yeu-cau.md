# CHƯƠNG 2. GIAI ĐOẠN 1 – PHÂN TÍCH YÊU CẦU (REQUIREMENT ANALYSIS – SRS)

Chương này trình bày giai đoạn thứ nhất của SDLC theo `MotaDetai_SDLC.txt`: thu thập yêu cầu từ người dùng giả định, xác định actor, use case, chức năng chính và lập tài liệu yêu cầu phần mềm (SRS). Nguồn dữ liệu là PLAN.md §2.4, §6 (yêu cầu), cùng bản phân tích persona và phỏng vấn viết ngày 30/09/2026 và được cập nhật theo các quyết định đến ngày 27/10/2026. Các mục 2.1 đến 2.5 nằm trong phần này; đặc tả chi tiết từng use case, yêu cầu chức năng, phi chức năng, quy tắc nghiệp vụ và ma trận truy vết nằm ở các mục 2.6 đến 2.10.

## 2.1 Thu thập yêu cầu từ người dùng giả định

Đề bài yêu cầu thu thập yêu cầu từ **người dùng giả định**. Nhóm vì vậy không thực hiện khảo sát thật mà làm theo bốn bước: khảo sát hiện trạng các nền tảng học trực tuyến phổ biến, xây dựng ba persona, tiến hành phỏng vấn theo kịch bản giả định, rồi tổng hợp thành insight và ánh xạ sang yêu cầu.

> **Lưu ý trung thực.** Toàn bộ persona, tên, tuổi, nghề nghiệp, câu trả lời phỏng vấn dưới đây là **hư cấu** do nhóm xây dựng dựa trên hiểu biết về hành vi học trực tuyến. Chúng không phải dữ liệu khảo sát thật. Phần kiểm chứng giả định bằng người dùng dùng thử thật được nêu ở mục 2.1.6.

### 2.1.1 Khảo sát hiện trạng

Nhóm xem xét ba loại nền tảng học trực tuyến mà nhiều người đã quen dùng, dựa trên hiểu biết chung và trải nghiệm dùng thử của các thành viên (không phải số liệu thống kê). Mục đích là xác định những tính năng người học đã quen và những chỗ có thể làm tốt hơn trong phạm vi một đồ án.

**Bảng 2.1 – Khảo sát hiện trạng một số loại nền tảng**

| Loại nền tảng | Ví dụ | Mô hình | Điểm mạnh nhóm ghi nhận | Điểm chưa phù hợp với mục tiêu đồ án |
|---|---|---|---|---|
| Chợ khóa học (marketplace) | Udemy, Unica | Giảng viên tự đăng khóa, người học mua từng khóa, có đợt giảm giá | Danh mục khóa đa dạng; trang chi tiết có đánh giá, giảng viên, nội dung từng bài; xem thử bài; Q&A theo khóa | Quy mô lớn, nhiều chức năng ngoài phạm vi (chứng chỉ, giảm giá theo đợt, báo cáo vi phạm); không phải mã nguồn mở để học hỏi |
| Khóa học của trường đại học và đối tác | Coursera | Khóa do trường, tổ chức cung cấp; có chứng chỉ, thường theo lộ trình | Lộ trình học rõ, bài nộp có chấm điểm | Mô hình thuê bao và chứng chỉ phức tạp; chưa phải bài toán cần làm ở đồ án |
| Học miễn phí theo bài | Khan Academy, kênh YouTube giáo dục | Nội dung miễn phí, theo dõi tiến độ | Dễ tiếp cận, tiến độ rõ ràng | Thiếu luồng mua và ghi danh, thiếu giảng viên tự bán khóa |

Từ khảo sát, nhóm rút ra các tính năng người học đã quen và coi là nền tảng của sản phẩm: tìm kiếm và danh mục; trang chi tiết có xem thử và đánh giá; giỏ hàng và thanh toán; học video có tiến độ; hỏi đáp trong khóa; hồ sơ giảng viên. Đồng thời nhóm thấy ba điểm có thể làm nổi bật hơn trong phạm vi đồ án: (1) trải nghiệm **di động trước**, tiếp tục đúng chỗ đang học, hoạt động khi mạng yếu; (2) **trợ lý AI** bám nội dung khóa học; (3) một **luồng kiểm duyệt** khóa học đơn giản giữa giảng viên và quản trị viên. [[CẦN NHÓM BỔ SUNG: ngày khảo sát, ảnh chụp màn hình các ứng dụng đã dùng thử nếu muốn đưa vào phụ lục]]

### 2.1.2 Ba persona

**Bảng 2.2 – Ba persona (giả định)**

| Thuộc tính | P1 – Phạm Minh Quân | P2 – Đỗ Thu Trang | P3 – Vũ Đức Anh |
|---|---|---|---|
| Vai trò với hệ thống | Học viên | Học viên | Giảng viên |
| Tuổi, nghề nghiệp | 21 tuổi, sinh viên năm 3 ngành Công nghệ thông tin | 28 tuổi, chuyên viên marketing đang chuyển sang UI/UX Design | 35 tuổi, UX Designer kiêm giảng viên thỉnh giảng tại một trường đại học |
| Mục tiêu | Học thêm Python, SQL, JavaScript để xin thực tập; xong ít nhất một khóa mỗi tháng | Xây lộ trình học UX/UI, có portfolio để xin vị trí Junior Designer sau 6 tháng | Giới thiệu chuyên môn, thu hút học viên, nhận phản hồi để cải thiện khóa học |
| Thiết bị, mạng | Android tầm trung; Wi-Fi ký túc xá chập chờn, 4G giới hạn dung lượng | iPhone; Wi-Fi ổn định ở nhà, 4G khi đi làm | Laptop khi soạn bài; điện thoại Android khi xem phản hồi |
| Thời điểm học | Giờ trống giữa tiết, trên xe buýt, buổi tối 1–2 giờ | Buổi tối sau giờ làm, cuối tuần | Soạn bài trên laptop, kiểm tra tương tác trên điện thoại vào giờ nghỉ |
| Mức thành thạo công nghệ | Cao | Trung bình – khá | Cao |
| Ngân sách | Thấp; ưu tiên khóa rẻ, miễn phí hoặc giảm giá | Sẵn sàng trả tiền cho khóa chất lượng, hay mua nhiều khóa cùng lúc | (không mua khóa) |
| Nỗi đau | Học rời rạc nên quên đang học đến đâu; khó biết khóa nào chất lượng; mạng yếu làm video giật; dễ bỏ dở vì không thấy tiến bộ | Quá nhiều khóa, khó phân biệt chất lượng, sợ mua nhầm; cần phản hồi khi làm bài; muốn biết giảng viên là ai | Học viên không biết trình độ, lĩnh vực của người dạy; khó biết ai quan tâm khóa; câu hỏi của học viên bị bỏ ngỏ |
| Kỳ vọng với app | Tìm nhanh theo ngôn ngữ lập trình, xem thử trước khi mua, tiếp tục đúng chỗ, thấy % hoàn thành | Đọc đánh giá thật, xem hồ sơ giảng viên, giỏ hàng nhiều khóa, hỏi đáp khi bí, nộp và xem project | Hồ sơ giảng viên đầy đủ, số người theo dõi, đánh giá tổng hợp; hỏi đáp lành mạnh |
| Câu nói đặc trưng | "Em chỉ có vài chục phút mỗi lần, mở app lên là phải học tiếp được ngay." | "Tôi muốn biết người dạy là ai và những học viên trước đã học được gì rồi mới bỏ tiền." | "Hồ sơ của tôi phải nói lên tôi là ai và học viên đánh giá các khóa của tôi ra sao." |

Ghi chú về vai trò Quản trị viên: không xây persona riêng vì vai trò này được xác định từ yêu cầu vận hành (duyệt nội dung, quản lý người dùng), không phải từ nhu cầu người học. Đặc tả hành vi quản trị nằm ở các use case UC031–UC035.

### 2.1.3 Phỏng vấn giả định

**Phương pháp.** Phỏng vấn bán cấu trúc theo một bộ **14 câu hỏi** dùng chung (Q1 đến Q14, kịch bản ngày 30/09/2026); mỗi persona trả lời từ góc nhìn của mình. Hai câu bổ sung (Q15, Q16) thuộc vòng hai, viết ngày 10/10/2026 để khai thác nhu cầu mới của giai đoạn 2. Bảng dưới đây tóm tắt câu hỏi, mục đích và ba câu trả lời giả định đã rút gọn.

**Bảng 2.3 – Bộ câu hỏi phỏng vấn và câu trả lời giả định (rút gọn)**

| # | Câu hỏi | P1 – Quân (học viên) | P2 – Trang (học viên) | P3 – Anh (giảng viên) |
|---|---|---|---|---|
| Q1 | Bạn thường học kỹ năng mới bằng cách nào, ở đâu, lúc nào? | Học bằng điện thoại là chính, trên xe buýt hoặc giữa hai tiết, mỗi lần 15–30 phút; tối mới dùng laptop làm bài. | Học buổi tối khoảng một giờ và cuối tuần; xem video bằng điện thoại, cần làm bài mới mở laptop. | Soạn bài trên laptop; theo dõi tương tác học viên trên điện thoại giờ nghỉ. |
| Q2 | Bạn đã học qua app trên điện thoại chưa? Điều gì hài lòng, điều gì khó chịu nhất? | Hay bị mất chỗ đang xem, phải kéo lại từ đầu; video giật khi mạng yếu; thích thanh tiến độ rõ ràng. | App cũ nhiều mục lộn xộn, khó tìm khóa đã mua; thích thẻ khóa học đẹp, thấy ngay % đã học. | Phần hỏi đáp rối, khó biết câu hỏi nào mới; thích giao diện tối giản, dễ đọc. |
| Q3 | Bạn dựa vào thông tin nào để chọn khóa học? | Giá trước, rồi điểm đánh giá, số bài; để ý nhãn giảm giá và Best-seller; khóa miễn phí thì thử ngay. | Điểm đánh giá, số học viên, nội dung từng chương rồi mới đến giá; tên và kinh nghiệm giảng viên rất quan trọng. | Nhìn vào giảng viên và nội dung chi tiết; cần đọc đánh giá thật, không chỉ nhãn Best-seller. |
| Q4 | Bạn tìm khóa bằng cách nào? Cần lọc, sắp xếp ra sao? | Gõ thẳng từ khóa; muốn có chủ đề nóng để bấm; lọc theo giá, điểm; app nhớ từ khóa đã tìm. | Duyệt theo danh mục, lọc từ 4 sao; muốn mục "Gợi ý cho bạn"; cuộn mượt, không phân trang bằng nút. | Gõ tên công cụ hoặc tên giảng viên khác để xem họ dạy gì; mong tìm được theo tên giảng viên. |
| Q5 | Trước khi trả tiền bạn cần biết điều gì? | Xem thử vài bài đầu miễn phí để biết giảng viên dạy có dễ hiểu không. | Xem thử bài miễn phí, đọc đánh giá (kể cả lọc theo số sao), xem danh sách bài và thời lượng. | Học viên cần thấy mô tả, quyền lợi nhận được và đánh giá công khai, công bằng. |
| Q6 | Bạn nghĩ gì về thanh toán trong app? Mua một khóa hay nhiều khóa? | Ngại nhập thẻ trong app lạ; mua từng khóa, ưu tiên khóa miễn phí hoặc giảm giá. | Hay mua cả combo vài khóa nên cần giỏ hàng, tổng tiền, xóa bớt; thanh toán xong phải học được ngay. | Học viên bỏ giỏ hàng nhiều khi không rõ tổng tiền hoặc không biết đã mua thành công chưa. |
| Q7 | Khi xem video trên điện thoại, bạn cần gì? | Mở lại đúng chỗ đang xem dở dù đã thoát app; chuyển bài nhanh; toàn màn hình. | Hay bị gián đoạn nên cần tiếp tục đúng vị trí; xem hết bài tự đánh dấu hoàn thành. | Muốn học viên quay lại đúng chỗ vì bài giảng dài. |
| Q8 | Bạn theo dõi tiến độ và giữ động lực thế nào? | Thanh phần trăm đầy dần tạo động lực; tách "đang học" và "đã xong". | Muốn thấy tổng thời lượng, % hoàn thành, thông báo chúc mừng khi xong khóa. | Học viên hoàn thành khóa thường sẵn lòng để lại đánh giá. |
| Q9 | Khi không hiểu bạn xử lý ra sao? Hỏi đáp trong khóa có hữu ích không? | Hay tự tìm trên mạng; hỏi đáp trong khóa, thấy người khác trả lời, thả tim thì rất tiện. | Hỏi thẳng trong khóa; muốn có thông báo khi có người trả lời; gõ nhanh vài emoji. | Mong học viên hỗ trợ nhau; muốn tự trả lời trực tiếp nhưng bản đầu chưa có công cụ cho giảng viên. |
| Q10 | Bạn có làm bài tập, project không? Có muốn xem bài người khác không? | Cần tài liệu đi kèm để tải; sẵn sàng nộp project để có sản phẩm xin việc. | Rất quan trọng: mô tả bài rõ, tải tài liệu, nộp project, xem project người khác để học hỏi. | Project là phần coi trọng nhất; muốn nộp file gọn (ảnh, pdf, zip) và xem bài của nhau. |
| Q11 | Mạng của bạn thế nào? Muốn app xử lý ra sao khi mạng yếu hoặc mất? | Mạng ký túc xá hay rớt; vẫn xem được danh sách khóa đã học, báo rõ khi mất mạng. | Ít mất mạng; nếu có thì khóa của mình vẫn hiện, không bắt đăng nhập lại. | Hay mất sóng trên tàu điện; dữ liệu đã xem còn để đọc lại, không báo lỗi khó hiểu. |
| Q12 | Bạn có muốn nhận thông báo không? Lo ngại gì về bảo mật? | Chỉ thông báo việc quan trọng (mua thành công, có người trả lời); mật khẩu phải được bảo vệ. | Muốn mục thông báo trong app; giữ phiên đăng nhập; đăng xuất thì xóa sạch dữ liệu. | Lo tài khoản bị chiếm; chỉ học viên đã mua mới xem được video trả phí. |
| Q13 | Bạn quan tâm gì ở người dạy? Muốn thấy gì trong hồ sơ họ? | Biết thầy cô làm ở đâu, dạy khóa nào, điểm đánh giá trung bình. | Tiểu sử, lĩnh vực, khóa nhóm theo chủ đề, đánh giá, nút theo dõi, giờ địa phương; trang liệt kê giảng viên nổi bật. | Hồ sơ có ảnh, chức danh, nơi làm việc, giờ địa phương, số khóa, số học viên, điểm đánh giá, số người theo dõi. |
| Q14 | Bạn mong gì ở hồ sơ cá nhân và giao diện nói chung? | Hồ sơ cho thấy số khóa đã lưu, đang học, đã xong; app mở nhanh, cuộn mượt trên máy tầm trung. | Sửa tên, chức danh, ảnh; chữ dễ đọc, nút đủ lớn, cỡ chữ lớn không vỡ giao diện. | Ghét nhất chữ nhỏ, nút bé; lỗi nói bằng lời dễ hiểu và có nút thử lại. |
| Q15 *(vòng 2, 10/10/2026)* | Nếu giảng viên tự đăng khóa trong app, bạn muốn quy trình thế nào? | Muốn khóa đã được kiểm tra trước khi hiển thị để đỡ gặp khóa sơ sài. | Muốn khóa đủ mô tả, bài học, giá rõ ràng trước khi xuất bản. | Muốn soạn từng bước, lưu nháp, gửi duyệt, biết bị từ chối vì lý do gì để sửa; muốn sửa khóa đã đăng mà không làm gián đoạn học viên đang học. |
| Q16 *(vòng 2)* | Bạn nghĩ gì về giao diện tối, tiếng Việt/English và trợ lý AI trong khóa học? | Dùng ban đêm nên cần giao diện tối; muốn AI tóm tắt bài và ra vài câu hỏi ôn tập. | Muốn đổi ngôn ngữ theo ý mình; AI trả lời phải bám nội dung khóa, không bịa. | Muốn AI giúp gợi ý dàn ý khi soạn khóa nhưng mình vẫn là người quyết định nội dung cuối cùng. |

### 2.1.4 Quy trình nghiệp vụ

Từ các câu trả lời, nhóm mô tả quy trình nghiệp vụ tổng quát của hệ thống gồm hai vòng liên kết nhau: vòng cung cấp nội dung (Giảng viên – Quản trị viên) và vòng học tập (Học viên). Các bước tuần tự:

1. **Soạn khóa.** Giảng viên tạo khóa ở trạng thái nháp: nhập thông tin, giá, thẻ, chương, bài (gắn link YouTube), tùy chọn dùng AI gợi ý.
2. **Gửi duyệt.** Khi đủ điều kiện (BR-20) giảng viên gửi duyệt; khóa chuyển sang trạng thái chờ duyệt.
3. **Kiểm duyệt.** Quản trị viên xem hàng chờ, xem kết quả AI kiểm duyệt sơ bộ (chỉ tư vấn), rồi duyệt hoặc từ chối kèm lý do.
4. **Xuất bản.** Duyệt xong, khóa hiển thị trong danh mục; người theo dõi giảng viên nhận thông báo khóa mới; nếu bị từ chối, giảng viên nhận thông báo và email kèm lý do rồi sửa và gửi lại.
5. **Khám phá.** Học viên đăng ký, đăng nhập, xem trang chủ, tìm kiếm, lọc, xem chi tiết, xem thử bài, lưu khóa.
6. **Mua và ghi danh.** Học viên thêm vào giỏ, thanh toán giả lập (hoặc ghi danh trực tiếp khóa miễn phí); hệ thống tạo đơn hàng và ghi danh.
7. **Học tập.** Học viên xem video, hệ thống lưu vị trí và tự đánh dấu hoàn thành; có thể hỏi AI Tutor, tóm tắt bài, làm quiz.
8. **Tương tác.** Học viên đặt câu hỏi và trả lời trong Q&A; giảng viên trả lời (huy hiệu Giảng viên, ghim); học viên nộp project; giảng viên chấm điểm và nhận xét; học viên nhận thông báo.
9. **Đánh giá.** Học viên viết đánh giá khóa; giảng viên phản hồi; điểm trung bình khóa và giảng viên được cập nhật.
10. **Vận hành.** Quản trị viên xem dashboard, quản lý người dùng; hệ thống được giám sát bằng Prometheus và Grafana.

![Hình 2.1 – Quy trình nghiệp vụ tổng quát: vòng cung cấp nội dung và vòng học tập](../../uml/png/BIZ-flow.png)

*Hình 2.1 – Quy trình nghiệp vụ tổng quát: vòng cung cấp nội dung và vòng học tập*

### 2.1.5 Insight và yêu cầu rút ra

Nhóm gom các ý lặp lại ở nhiều persona thành 20 insight và ánh xạ sang yêu cầu (FR là yêu cầu chức năng, NFR là phi chức năng, BR là quy tắc nghiệp vụ; nội dung đầy đủ ở mục 2.7 đến 2.9).

**Bảng 2.4 – Insight và yêu cầu tương ứng**

| Mã | Insight | Nguồn | Yêu cầu | Ưu tiên |
|---|---|---|---|---|
| IN-01 | Người học có ít thời gian mỗi lần, cần **tiếp tục đúng vị trí đang xem** dù đã thoát app | P1, P2, P3 (Q1, Q7) | FR-16, BR-03, NFR-10 | Must |
| IN-02 | Cần tìm nhanh theo **từ khóa** (kể cả tên giảng viên, tag), có sẵn **chủ đề nóng** và nhớ từ khóa đã tìm | P1, P3 (Q4) | FR-05, BR-13 | Must |
| IN-03 | Cần **lọc** theo giá, điểm đánh giá, danh mục và **sắp xếp** kết quả | P1, P2 (Q4) | FR-06 | Should |
| IN-04 | Muốn **duyệt theo danh mục** và có mục gợi ý cho riêng mình | P2 (Q4) | FR-04, FR-07, FR-34, BR-12 | Must |
| IN-05 | Cần xem **điểm, số lượng và nội dung đánh giá** (lọc theo số sao) trước khi mua; muốn tự viết đánh giá sau khi học | P1, P2, P3 (Q3, Q5, Q8) | FR-10, FR-11, BR-08 | Must / Should |
| IN-06 | Muốn **xem thử bài miễn phí** trước khi quyết định mua | P1, P2 (Q5) | FR-09, BR-01 | Must |
| IN-07 | Cần thấy rõ **giá, khuyến mãi, nhãn Best-seller** trên thẻ khóa | P1, P3 (Q3) | FR-04, BR-10 | Must |
| IN-08 | Cần **giỏ hàng nhiều khóa**, tổng tiền rõ, thanh toán xong học được ngay; thanh toán chỉ là mô phỏng, nói rõ để người dùng yên tâm | P1, P2, P3 (Q6) | FR-13, FR-14, BR-06, BR-07 | Must |
| IN-09 | Muốn **lưu khóa** để mua hoặc học sau và xem lại ở hồ sơ | P1, P2 (Q14) | FR-12, FR-21 | Must |
| IN-10 | Cần thấy **trạng thái từng bài** và **% hoàn thành**; tách "đang học" và "đã xong" | P1, P2 (Q7, Q8) | FR-09, FR-15, BR-02, BR-04, BR-05 | Must |
| IN-11 | Muốn **hỏi đáp trong khóa**, thả tim, nhận thông báo khi có trả lời, gõ emoji nhanh | P1, P2, P3 (Q9) | FR-19, FR-23, BR-09 | Should |
| IN-12 | Cần **mô tả project, tài liệu, nộp project** và xem bài của người khác | P1, P2, P3 (Q10) | FR-18 | Should |
| IN-13 | Mạng chập chờn: cần **xem lại dữ liệu đã tải**, banner báo mất mạng | P1, P2, P3 (Q11) | FR-24, NFR-04 | Should |
| IN-14 | Muốn **thông báo trong app** cho sự kiện quan trọng, không quá nhiều | P1, P2 (Q12) | FR-23 | Should |
| IN-15 | **Bảo mật tài khoản:** mật khẩu mạnh, giữ phiên đăng nhập, quản lý thiết bị; chỉ người đã mua mới xem được video trả phí | P1, P2, P3 (Q12) | FR-01…FR-03, FR-25…FR-30, NFR-05, NFR-06, BR-01 | Must |
| IN-16 | Muốn xem **hồ sơ giảng viên** đầy đủ (chức danh, nơi làm việc, giờ địa phương, thống kê, khóa theo nhóm, đánh giá) và **theo dõi** giảng viên | P2, P3 (Q13) | FR-20, BR-14, BR-16 | Should |
| IN-17 | Ứng dụng **mở nhanh, cuộn mượt** trên máy tầm trung; chữ dễ đọc, nút đủ lớn, lỗi nói bằng lời dễ hiểu và có nút thử lại | P1, P2, P3 (Q14) | NFR-01…NFR-03, NFR-07, NFR-13 | Must |
| IN-18 | Giảng viên cần **soạn khóa từng bước, lưu nháp, gửi duyệt, biết lý do bị từ chối**, sửa khóa đã đăng mà không ảnh hưởng học viên đang học; học viên muốn khóa được kiểm tra trước khi hiển thị | P1, P2, P3 (Q9, Q15) | FR-39…FR-44, FR-50, BR-19…BR-23 | Must |
| IN-19 | Giảng viên cần **trả lời hỏi đáp có huy hiệu, chấm project, phản hồi đánh giá** và xem thống kê khóa | P3 (Q9, Q10) | FR-45…FR-49, BR-24…BR-26 | Must / Should |
| IN-20 | Muốn **giao diện tối, đổi ngôn ngữ, trợ lý AI** bám nội dung khóa; AI chỉ gợi ý, người dùng quyết định | P1, P2, P3 (Q16) | FR-31…FR-36, FR-44, FR-51, BR-29, NFR-14 | Must / Should |

**Insight nằm ngoài phạm vi.** Các mong muốn sau không được hiện thực và được đưa vào đề xuất cải tiến (Chương 7): thanh toán thật, hoàn tiền, mã giảm giá (Q6); tải video xem offline và phụ đề (Q11); push notification thật và chat thời gian thực (Q12); chứng chỉ hoàn thành dạng PDF (Q8). Ba mong muốn của vòng một đã được chuyển thành yêu cầu ở giai đoạn 2: đa ngôn ngữ, giao diện tối và giảng viên tự tạo khóa trong app (thể hiện trong bảng 1.2).

### 2.1.6 Hạn chế của phương pháp và cách kiểm chứng

| Hạn chế | Cách giảm thiểu |
|---|---|
| Persona và câu trả lời là **giả định**, có thể lệch so với người dùng thật | Đối chiếu bằng kiểm thử chức năng có minh chứng (Chương 5) và để người dùng thật dùng thử bản triển khai |
| Chỉ có ba persona; chưa có người lớn tuổi hoặc người ít rành công nghệ | Áp dụng NFR-07 (cỡ chữ theo hệ thống, vùng chạm lớn, thông báo lỗi dễ hiểu, nút thử lại) |
| Persona giảng viên ở vòng một chưa có công cụ riêng | Vòng hai (Q15) và mở rộng Giảng viên – Quản trị (PLAN.md §2.4) bù đắp |

[[CẦN NHÓM BỔ SUNG: kết quả dùng thử với 2–3 bạn ngoài nhóm (nếu đã làm): số người, ngày, nhận xét chính]]

## 2.2 Tác nhân (actor)

Tác nhân là người hoặc hệ thống bên ngoài tương tác với hệ thống. Nhóm xác định **4 tác nhân người dùng** và **5 hệ thống ngoài** (PLAN.md §6.1, §2.4.1). Bảng 2.5 mô tả từng tác nhân.

**Bảng 2.5 – Danh sách tác nhân**

| Tác nhân | Loại | Mô tả | Quyền và hành vi chính |
|---|---|---|---|
| **Guest** (Khách) | Người dùng | Người chưa đăng nhập | Chỉ đăng ký tài khoản (chọn vai trò Học viên hoặc Giảng viên) và đăng nhập; các chức năng còn lại yêu cầu đăng nhập |
| **Learner** (Học viên) | Người dùng | Người dùng chính của ứng dụng, đã đăng nhập | Duyệt, tìm, xem chi tiết, lưu, mua và ghi danh; học video; hỏi đáp; nộp project; đánh giá; theo dõi giảng viên; xem thông báo; dùng AI; quản lý hồ sơ, bảo mật và cài đặt |
| **Teacher** (Giảng viên) | Người dùng | Người soạn và bán khóa học; tự đăng ký, không cần duyệt tài khoản. **Kế thừa Learner** (quan hệ tổng quát hóa): vẫn duyệt, mua, học khóa của người khác | Quản lý khóa của mình (tạo nháp, soạn chương và bài, gửi duyệt, sửa khóa đã xuất bản qua bản sửa đổi, ẩn và khôi phục); dùng AI soạn khóa; xem thống kê; chấm project; trả lời Q&A có huy hiệu và ghim; phản hồi đánh giá; sửa hồ sơ giảng viên. **Không mua được khóa của chính mình** (BR-23) |
| **Admin** (Quản trị viên) | Người dùng | Người vận hành nội dung và người dùng. Không đăng ký được; chỉ tạo bằng dữ liệu seed (môi trường phát triển) hoặc script nâng quyền trên máy chủ (production) | Xem hàng chờ, xem trước nội dung và so sánh bản cũ/mới; duyệt hoặc từ chối khóa kèm lý do; xem AI kiểm duyệt sơ bộ; ẩn và khôi phục khóa; khóa và mở khóa tài khoản; xem dashboard |
| **Payment Gateway (giả lập)** | Hệ thống ngoài | Bên xác nhận thanh toán. Trong đồ án là **mô phỏng** trong máy chủ, không có giao dịch tiền thật | Trả kết quả thanh toán thành công hoặc thất bại (có tùy chọn mô phỏng thất bại để kiểm thử) |
| **Google Gemini** | Hệ thống ngoài | Dịch vụ AI | Tóm tắt khóa và bài; AI Tutor; quiz; gợi ý lộ trình; AI gợi ý soạn khóa; AI kiểm duyệt sơ bộ |
| **Google reCAPTCHA v2** | Hệ thống ngoài | Dịch vụ chống bot | Xác minh token ở đăng ký, quên mật khẩu và đăng nhập sau nhiều lần sai |
| **Brevo SMTP** | Hệ thống ngoài | Dịch vụ gửi email | Gửi mã OTP xác minh email, mã đặt lại mật khẩu, cảnh báo đăng nhập thiết bị mới, kết quả duyệt khóa |
| **YouTube** | Hệ thống ngoài | Nguồn video bài học | Phát video bài học qua trình phát nhúng chính thức, theo link giảng viên nhập |

Quan hệ giữa các tác nhân:

- **Teacher** kế thừa **Learner**: mọi use case của Learner đều dùng được bởi Teacher (trừ mua khóa của chính mình).
- **Guest** chuyển thành Learner hoặc Teacher sau khi đăng ký, xác minh email và đăng nhập.
- **Admin** là vai trò riêng. Khi cần kiểm tra nội dung, Admin xem được mọi bài học mà không ghi tiến độ (BR-23).
- Các hệ thống ngoài là tác nhân thứ cấp: không khởi động use case mà chỉ tham gia trả lời hoặc nhận yêu cầu từ hệ thống.

## 2.3 Sơ đồ phân cấp chức năng

Sơ đồ phân cấp chức năng chia hệ thống thành các nhóm chức năng lớn (mức 1) và chức năng con (mức 2), gom theo yêu cầu chức năng FR-01 đến FR-54. Hình 2.2 là sơ đồ dạng cây; bên dưới là cùng nội dung dạng danh sách để dễ đối chiếu.

![Hình 2.2 – Sơ đồ phân cấp chức năng của E-Learning App](../../uml/png/FUNC-tree.png)

*Hình 2.2 – Sơ đồ phân cấp chức năng của E-Learning App*

**Cây chức năng (dạng danh sách)**

```
E-Learning App
├── 1. Tài khoản và bảo mật
│   ├── 1.1 Đăng ký (chọn vai trò, CAPTCHA)                         FR-01, FR-30
│   ├── 1.2 Xác minh email bằng OTP                                  FR-25
│   ├── 1.3 Đăng nhập, đăng xuất, khóa tạm khi sai nhiều lần         FR-02, FR-03, FR-30
│   ├── 1.4 Quên mật khẩu, đặt lại, đổi mật khẩu                    FR-26, FR-27
│   ├── 1.5 Xác thực hai lớp (TOTP, mã khôi phục)                    FR-28
│   └── 1.6 Phiên và thiết bị (refresh token, đăng xuất từ xa)       FR-29
├── 2. Khám phá khóa học
│   ├── 2.1 Trang chủ (banner, danh mục, Popular, Recommended,
│   │        Course that inspires, Top teachers)                     FR-04
│   ├── 2.2 Tìm kiếm (từ khóa, chủ đề nóng, từ khóa gần đây)         FR-05
│   ├── 2.3 Lọc và sắp xếp                                           FR-06
│   ├── 2.4 Duyệt theo danh mục hoặc nhóm "View more"                FR-07
│   ├── 2.5 Chi tiết khóa (Overview, Lessons, Review, xem thử)       FR-08, FR-09, FR-10
│   ├── 2.6 Lưu và bỏ lưu khóa                                       FR-12
│   ├── 2.7 Thích và chia sẻ khóa                                    FR-17
│   └── 2.8 Hồ sơ giảng viên và theo dõi                             FR-20
├── 3. Mua và ghi danh
│   ├── 3.1 Giỏ hàng                                                 FR-13
│   └── 3.2 Thanh toán giả lập, ghi danh khóa miễn phí               FR-14
├── 4. Học tập
│   ├── 4.1 Khóa học của tôi (All, On going, Completed)              FR-15
│   ├── 4.2 Học video, lưu và tiếp tục vị trí, tự hoàn thành         FR-16
│   └── 4.3 Xem lại dữ liệu khi mất mạng                             FR-24
├── 5. Tương tác
│   ├── 5.1 Hỏi đáp (Q&A)                                            FR-19
│   ├── 5.2 Đánh giá khóa học                                        FR-11
│   └── 5.3 Project (xem mô tả, tải tài liệu, nộp bài)               FR-18
├── 6. Trợ lý AI
│   ├── 6.1 Tóm tắt khóa và bài học                                  FR-31
│   ├── 6.2 AI Tutor (hỏi đáp theo nội dung khóa)                    FR-32
│   ├── 6.3 Quiz trắc nghiệm theo bài                                FR-33
│   └── 6.4 Gợi ý lộ trình học                                       FR-34
├── 7. Hồ sơ và thông báo
│   ├── 7.1 Hồ sơ cá nhân và thống kê                                FR-21
│   ├── 7.2 Sửa hồ sơ, đổi ảnh đại diện                              FR-22
│   └── 7.3 Thông báo trong app                                      FR-23, FR-54
├── 8. Giảng dạy (Giảng viên)
│   ├── 8.1 Quản lý khóa của tôi (nháp, sửa, xóa nháp)               FR-39
│   ├── 8.2 Soạn chương trình (chương, bài, video, xem thử)          FR-40
│   ├── 8.3 Gửi duyệt và theo dõi trạng thái                         FR-41
│   ├── 8.4 Sửa khóa đã xuất bản (bản sửa đổi)                       FR-42
│   ├── 8.5 Ẩn và khôi phục khóa                                     FR-43
│   ├── 8.6 AI gợi ý soạn khóa                                       FR-44
│   ├── 8.7 Thống kê khóa                                            FR-45
│   ├── 8.8 Chấm điểm project                                        FR-46
│   ├── 8.9 Trả lời Q&A có huy hiệu, ghim                            FR-47
│   ├── 8.10 Phản hồi đánh giá                                       FR-48
│   └── 8.11 Cập nhật hồ sơ giảng viên                               FR-49
├── 9. Quản trị (Quản trị viên)
│   ├── 9.1 Hàng chờ và duyệt, từ chối khóa                          FR-50
│   ├── 9.2 AI kiểm duyệt sơ bộ                                      FR-51
│   ├── 9.3 Quản lý người dùng (khóa, mở khóa)                       FR-52
│   └── 9.4 Dashboard hệ thống                                       FR-53
└── 10. Cài đặt và nền tảng
    ├── 10.1 Ngôn ngữ vi/en                                          FR-35
    ├── 10.2 Giao diện sáng, tối, theo hệ thống                      FR-36
    ├── 10.3 Web, PWA, bố cục máy tính                               FR-37
    └── 10.4 Màn hình khởi động (intro)                              FR-38
```

Ngoài mười nhóm chức năng người dùng thấy, hệ thống còn có **nhóm chức năng nền (không có giao diện)**: giám sát (`/metrics`, Prometheus, Grafana, Loki), sao lưu cơ sở dữ liệu, CI/CD. Nhóm này thuộc yêu cầu phi chức năng NFR-11 và NFR-12 và được trình bày ở Chương 6.

## 2.4 Chức năng chính

Bảng 2.6 mô tả các chức năng chính theo nhóm, nêu tác nhân sử dụng, ưu tiên và use case tương ứng. Các use case được đặc tả ở mục 2.6.

**Bảng 2.6 – Chức năng chính của hệ thống**

| Nhóm | Chức năng chính | Mô tả ngắn | Tác nhân | Ưu tiên | Use case |
|---|---|---|---|---|---|
| Tài khoản | Đăng ký, xác minh email, đăng nhập, đăng xuất | Đăng ký bằng họ tên, email, mật khẩu (8–72 ký tự, có chữ và số), CAPTCHA, chọn vai trò; xác minh email bằng OTP 6 số hết hạn 10 phút; đăng nhập duy trì phiên bằng access token 15 phút và refresh token 30 ngày | Guest, Learner | Must | UC001, UC002, UC003, UC038 |
| Tài khoản | Bảo mật nâng cao | Quên và đặt lại mật khẩu; 2FA TOTP kèm 10 mã khôi phục; danh sách thiết bị và đăng xuất từ xa; khóa tài khoản 15 phút sau 5 lần sai | Learner | Must | UC039, UC040, UC041 |
| Khám phá | Trang chủ, tìm kiếm, lọc, danh mục | Trang chủ gom nhiều khối trong một request; tìm theo tên khóa, tên giảng viên, tag; cuộn vô hạn; lọc theo danh mục, giá, điểm; sắp xếp | Learner | Must / Should | UC004, UC005, UC006, UC007 |
| Khám phá | Chi tiết khóa và xem thử | Overview, Lessons (bài được khóa hoặc mở theo ghi danh), Review; xem thử bài miễn phí | Learner | Must | UC008, UC009 |
| Khám phá | Lưu khóa, thích và chia sẻ | Lưu khóa (cập nhật lạc quan); thích và chia sẻ qua share sheet | Learner | Must / Could | UC010, UC021 |
| Mua | Giỏ hàng, thanh toán, ghi danh | Thêm, xóa khóa; thanh toán giả lập trong một transaction tạo đơn, ghi danh, xóa giỏ, gửi thông báo; khóa miễn phí ghi danh trực tiếp | Learner, Payment Gateway | Must | UC011, UC012 |
| Học | Khóa học của tôi, học video | Lọc theo tiến độ; phát video YouTube, lưu vị trí mỗi 10 giây và khi rời màn hình, tự hoàn thành khi xem từ 90%, cập nhật phần trăm khóa; xem lại dữ liệu khi mất mạng | Learner, YouTube | Must | UC013, UC014 |
| Tương tác | Đánh giá, hỏi đáp, project | Viết và sửa đánh giá (1–5 sao); đặt câu hỏi, trả lời, thích; xem mô tả project, tải tài liệu, nộp bài (ảnh, pdf, zip tối đa 10 MB), xem bài người khác | Learner | Should | UC015, UC016, UC017 |
| Giảng viên (công khai) | Hồ sơ giảng viên, theo dõi | Thông tin, giờ địa phương, các khóa theo danh mục, đánh giá; nút Follow | Learner | Should | UC018 |
| Hồ sơ | Hồ sơ cá nhân, thông báo | Thống kê Save, On going, Completed; sửa tên, headline, ảnh; danh sách thông báo, đánh dấu đã đọc, huy hiệu chưa đọc | Learner | Must / Should | UC019, UC020 |
| AI | Trợ lý AI cho học viên | Tóm tắt khóa và bài; AI Tutor trả lời theo nội dung khóa (SSE); quiz 5 câu; gợi ý lộ trình có lý do; cache trong DB, hạn mức theo giờ, ngày, hệ thống | Learner, Gemini | Must / Should | UC043, UC044, UC045 |
| Giảng dạy | Soạn và gửi duyệt khóa | Tạo nháp, soạn chương và bài, checklist gửi duyệt (BR-20), bản sửa đổi cho khóa đã xuất bản, ẩn và khôi phục, AI gợi ý soạn khóa | Teacher, Gemini | Must / Should | UC022, UC023, UC024, UC025, UC026, UC031 |
| Giảng dạy | Tương tác sau bán | Thống kê khóa; chấm project (0–100 và nhận xét); Q&A có huy hiệu và ghim; phản hồi đánh giá; hồ sơ giảng viên | Teacher | Must / Should | UC027, UC028, UC029, UC030, UC037 |
| Quản trị | Duyệt khóa, người dùng, dashboard | Hàng chờ, so sánh bản cũ/mới, duyệt hoặc từ chối kèm lý do, AI kiểm duyệt sơ bộ, khóa và mở tài khoản, thống kê tổng quan | Admin, Gemini | Must / Should | UC031…UC035 |
| Thông báo xã hội | Thông báo khóa mới | Người theo dõi giảng viên nhận thông báo khi khóa lần đầu được xuất bản | Learner | Must | UC036 |
| Nền tảng | Ngôn ngữ, giao diện, web | vi/en, sáng/tối, PWA, bố cục máy tính kiểu Netflix | Learner | Must | UC042 |

## 2.5 Mô hình use case

### 2.5.1 Use case tổng quát

Biểu đồ use case tổng quát (Hình 2.3) thể hiện các tác nhân (mục 2.2), các use case của hệ thống và quan hệ giữa chúng. Biểu đồ gồm **45 use case**: 37 use case UC001 đến UC037 theo PLAN.md §6.2 và §2.4.2, cùng 8 use case bổ sung UC038 đến UC045 cho các chức năng giai đoạn 2 của Học viên (xác thực mở rộng, cài đặt, AI). Các use case được nhóm theo gói để dễ đọc: Tài khoản và bảo mật; Khám phá; Mua và học; Tương tác; AI; Giảng dạy; Quản trị; Cài đặt.

![Hình 2.3 – Biểu đồ use case tổng quát của E-Learning App](../../uml/png/UC-overview.png)

*Hình 2.3 – Biểu đồ use case tổng quát của E-Learning App*

**Quy ước khi vẽ:**

- Tác nhân Guest, Learner đặt bên trái; Teacher và Admin đặt bên phải, cạnh gói Giảng dạy và Quản trị (quan hệ tổng quát hóa Teacher → Learner vẽ vòng ngoài khung hệ thống); hệ thống ngoài đặt phía trên và bên phải, nối bằng đường nét đứt. Gói Khám phá gồm cả UC018, UC021; gói Tương tác gồm UC015, UC016, UC017, UC020, UC036.
- Teacher nối với Learner bằng mũi tên tổng quát hóa (Teacher kế thừa Learner), nên không phải vẽ lại các use case của Learner cho Teacher.
- Quan hệ `«include»` dùng cho bước luôn xảy ra; `«extend»` cho bước tùy chọn hoặc theo điều kiện.

### 2.5.2 Danh sách use case

Mã use case trong báo cáo viết **UC001 đến UC045**, tương ứng UC-01 đến UC-37 trong PLAN.md (UC-01 là UC001, v.v.). Tám use case UC038 đến UC045 được đánh số tiếp theo trong báo cáo để thể hiện đầy đủ các chức năng giai đoạn 2; chúng gắn với yêu cầu FR-25 đến FR-36 trong PLAN.md §6.3 (PLAN.md §12.4 đã dự kiến "đánh số tiếp sau UC021 khi viết", nhưng các số UC022 đến UC037 đã dùng cho Giảng viên và Quản trị nên báo cáo dùng UC038 trở đi). Use case có dấu ★ là **use case lõi**: có đặc tả đầy đủ cùng biểu đồ hoạt động ở Chương 2 và biểu đồ tuần tự ở Chương 3; các use case còn lại chỉ có bảng đặc tả.

**Bảng 2.7 – Danh sách use case UC001 đến UC037 (theo PLAN.md)**

| Mã | Tên use case | Tác nhân | FR | Ưu tiên | Lõi |
|---|---|---|---|---|---|
| UC001 | Đăng ký tài khoản | Guest | FR-01, FR-30 | Must | |
| UC002 | Đăng nhập | Guest | FR-02, FR-30 | Must | ★ |
| UC003 | Đăng xuất | Learner | FR-03 | Must | |
| UC004 | Xem trang chủ | Learner | FR-04 | Must | |
| UC005 | Tìm kiếm khóa học | Learner | FR-05 | Must | ★ |
| UC006 | Lọc và sắp xếp kết quả | Learner | FR-06 | Should | |
| UC007 | Duyệt khóa học theo danh mục hoặc nhóm | Learner | FR-07 | Must | |
| UC008 | Xem chi tiết khóa học | Learner | FR-08, FR-09, FR-10 | Must | ★ |
| UC009 | Xem trước bài học miễn phí | Learner | FR-09 | Must | |
| UC010 | Lưu hoặc bỏ lưu khóa học | Learner | FR-12 | Must | |
| UC011 | Quản lý giỏ hàng | Learner | FR-13 | Must | ★ |
| UC012 | Thanh toán và ghi danh | Learner, Payment Gateway | FR-14 | Must | ★ |
| UC013 | Xem khóa học của tôi | Learner | FR-15 | Must | |
| UC014 | Học bài qua video và lưu tiến độ | Learner, YouTube | FR-16 | Must | ★ |
| UC015 | Đánh giá khóa học | Learner | FR-11 | Should | |
| UC016 | Hỏi đáp (Q&A) | Learner | FR-19 | Should | ★ |
| UC017 | Nộp project và tải tài liệu | Learner | FR-18 | Should | ★ |
| UC018 | Xem hồ sơ giảng viên và theo dõi | Learner | FR-20 | Should | |
| UC019 | Xem và chỉnh sửa hồ sơ cá nhân | Learner | FR-21, FR-22 | Must / Should | |
| UC020 | Xem thông báo | Learner | FR-23 | Should | |
| UC021 | Thích hoặc chia sẻ khóa học | Learner | FR-17 | Could | |
| UC022 | Quản lý khóa học của tôi (tạo nháp, sửa, xóa nháp) | Teacher | FR-39 | Must | ★ |
| UC023 | Soạn chương trình học (chương, bài, video YouTube, bài xem thử) | Teacher, YouTube | FR-40 | Must | |
| UC024 | Gửi duyệt khóa học | Teacher | FR-41 | Must | ★ |
| UC025 | Sửa khóa đã xuất bản (bản sửa đổi) | Teacher | FR-42 | Must | |
| UC026 | AI hỗ trợ soạn khóa học | Teacher, Gemini | FR-44 | Should | ★ |
| UC027 | Xem thống kê khóa học | Teacher | FR-45 | Should | |
| UC028 | Chấm điểm và nhận xét project | Teacher | FR-46 | Must | ★ |
| UC029 | Trả lời Q&A với vai trò giảng viên (huy hiệu, ghim) | Teacher | FR-47 | Must | |
| UC030 | Phản hồi đánh giá | Teacher | FR-48 | Should | |
| UC031 | Ẩn hoặc khôi phục khóa học | Teacher, Admin | FR-43 | Must | |
| UC032 | Duyệt hoặc từ chối khóa học | Admin | FR-50 | Must | ★ |
| UC033 | Xem AI kiểm duyệt sơ bộ | Admin, Gemini | FR-51 | Must | ★ |
| UC034 | Quản lý người dùng (khóa, mở tài khoản) | Admin | FR-52 | Should | |
| UC035 | Xem dashboard hệ thống | Admin | FR-53 | Should | |
| UC036 | Nhận thông báo khóa mới của giảng viên đang theo dõi | Learner | FR-54 | Must | |
| UC037 | Cập nhật hồ sơ giảng viên | Teacher | FR-49 | Must | |

Trong đó 14 use case lõi (★) khớp với phạm vi UML đã chốt ngày 27/10/2026 (PLAN.md v2.27): UC002, UC005, UC008, UC011, UC012, UC014, UC016, UC017, UC022, UC024, UC026, UC028, UC032, UC033.

**Bảng 2.8 – Use case bổ sung cho các chức năng giai đoạn 2 của Học viên (UC038 đến UC045)**

| Mã | Tên use case | Tác nhân | FR | Ưu tiên | Ghi chú |
|---|---|---|---|---|---|
| UC038 | Xác minh email bằng OTP | Guest, Brevo SMTP | FR-25 | Must | Mã 6 số hết hạn 10 phút, tối đa 5 lần sai, gửi lại sau 60 giây |
| UC039 | Quên và đặt lại mật khẩu | Guest, Brevo SMTP, reCAPTCHA | FR-26, FR-27 | Must | Không tiết lộ email có tồn tại; đặt lại xong thu hồi mọi phiên |
| UC040 | Bật hoặc tắt 2FA và đăng nhập hai bước | Learner | FR-28 | Must | TOTP, 10 mã khôi phục dùng một lần |
| UC041 | Quản lý phiên và thiết bị | Learner | FR-29 | Must | Danh sách thiết bị, đăng xuất từ xa, cảnh báo thiết bị mới |
| UC042 | Cài đặt ngôn ngữ và giao diện | Learner | FR-35, FR-36 | Must | vi/en; sáng, tối, theo hệ thống |
| UC043 | Hỏi AI Tutor | Learner, Gemini | FR-32 | Must | Chỉ người đã ghi danh; trả lời dạng luồng (SSE) |
| UC044 | Tóm tắt và làm quiz AI | Learner, Gemini | FR-31, FR-33 | Must / Should | Tóm tắt theo quyền xem bài; quiz bắt buộc đã ghi danh |
| UC045 | Xem gợi ý lộ trình AI | Learner, Gemini | FR-34 | Should | Gợi ý khóa chưa học kèm lý do |

Các chức năng FR-24 (xem lại dữ liệu khi mất mạng), FR-37 (web, PWA) và FR-38 (màn hình khởi động) là tính chất xuyên suốt của ứng dụng, không tách thành use case riêng; chúng được đặc tả trong yêu cầu chức năng và phi chức năng (mục 2.7, 2.8).

### 2.5.3 Điều kiện phụ thuộc giữa các use case

Có ba loại phụ thuộc cần hiểu để đọc đúng biểu đồ và để lập kịch bản kiểm thử: (1) quan hệ `include` và `extend` giữa use case; (2) phụ thuộc về trạng thái dữ liệu (phải có ghi danh, khóa phải ở trạng thái đã xuất bản…); (3) phụ thuộc về vai trò. Bảng 2.9 nêu quan hệ giữa các use case, Bảng 2.10 nêu điều kiện về trạng thái và vai trò.

**Bảng 2.9 – Quan hệ giữa các use case**

| Use case | Quan hệ | Use case liên quan | Giải thích |
|---|---|---|---|
| UC001 Đăng ký | include | UC038 Xác minh email | Đăng ký thành công chưa cấp token; phải xác minh OTP rồi mới đăng nhập được (FR-25) |
| UC001, UC039 | dùng | reCAPTCHA (hệ thống ngoài) | CAPTCHA bắt buộc khi đăng ký và quên mật khẩu |
| UC002 Đăng nhập | extend | UC040 (nhánh đăng nhập hai bước) | Chỉ khi tài khoản đã bật 2FA; hệ thống trả thử thách rồi yêu cầu mã TOTP hoặc mã khôi phục |
| UC002 Đăng nhập | extend | UC039 Quên mật khẩu | Khi người dùng không nhớ mật khẩu |
| UC002 Đăng nhập | extend | CAPTCHA | Từ lần sai thứ 3; khóa 15 phút sau 5 lần sai |
| UC005 Tìm kiếm | extend | UC006 Lọc và sắp xếp | Người dùng tùy chọn thu hẹp kết quả |
| UC004, UC005, UC007 | dẫn tới | UC008 Xem chi tiết khóa học | Mọi danh sách khóa đều mở trang chi tiết |
| UC008 Xem chi tiết | extend | UC009 Xem trước bài | Khi bài có cờ xem thử |
| UC008 Xem chi tiết | extend | UC010 Lưu khóa, UC011 Giỏ hàng, UC018 Hồ sơ giảng viên, UC021 Thích hoặc chia sẻ, UC044 Tóm tắt AI | Các thao tác tùy chọn từ trang chi tiết |
| UC011 Giỏ hàng | dẫn tới | UC012 Thanh toán | Thanh toán lấy danh sách khóa từ giỏ; khóa miễn phí đi tắt qua ghi danh trực tiếp từ UC008 |
| UC012 Thanh toán | dùng | Payment Gateway | Kết quả thanh toán thành công hoặc thất bại (mô phỏng) |
| UC012 Thanh toán | dẫn tới | UC013, UC014 | Ghi danh xong khóa xuất hiện trong "Khóa học của tôi" và học được toàn bộ bài |
| UC014 Học bài | extend | UC016 Hỏi đáp, UC017 Nộp project, UC015 Đánh giá, UC043 AI Tutor, UC044 Tóm tắt và quiz | Các tab trong màn Học; mỗi thao tác chỉ dùng được khi đã ghi danh |
| UC014 Học bài | dùng | YouTube | Phát video bài học |
| UC016 Hỏi đáp | extend | UC029 Trả lời Q&A của giảng viên | Giảng viên của khóa trả lời không cần ghi danh, có huy hiệu và ghim |
| UC017 Nộp project | dẫn tới | UC028 Chấm điểm project | Giảng viên chấm bài đã nộp; học viên nhận thông báo điểm |
| UC015 Đánh giá | dẫn tới | UC030 Phản hồi đánh giá | Giảng viên phản hồi sau khi có đánh giá |
| UC022 Quản lý khóa | include | UC023 Soạn chương trình | Khóa phải có chương và bài |
| UC022 Quản lý khóa | extend | UC026 AI hỗ trợ soạn | Teacher chọn dùng gợi ý AI; AI chỉ điền form, người soạn tự lưu (BR-29) |
| UC022, UC023 | dẫn tới | UC024 Gửi duyệt | Gửi duyệt phải qua checklist BR-20 |
| UC025 Sửa khóa đã xuất bản | dẫn tới | UC024 (nhánh gửi duyệt bản sửa đổi) | Trường "lớn" đi qua bản sửa đổi chờ duyệt |
| UC024 Gửi duyệt | dẫn tới | UC032 Duyệt hoặc từ chối | Hàng chờ của Admin |
| UC032 Duyệt hoặc từ chối | extend | UC033 Xem AI kiểm duyệt sơ bộ | Admin xem nhận định của AI trước khi quyết định (chỉ tư vấn) |
| UC032 Duyệt | dẫn tới | UC036 Nhận thông báo khóa mới | Chỉ khi khóa được xuất bản **lần đầu** |
| UC032 Duyệt hoặc từ chối | dẫn tới | Thông báo và email cho Teacher | BR-27 |
| UC031 Ẩn hoặc khôi phục | dẫn tới | UC008, UC005 | Khóa ẩn biến khỏi danh mục và tìm kiếm; học viên đã mua vẫn học |
| UC018 Theo dõi giảng viên | dẫn tới | UC036 | Chỉ người đã theo dõi mới nhận thông báo khóa mới |

**Bảng 2.10 – Điều kiện về trạng thái dữ liệu và vai trò**

| Use case | Điều kiện phụ thuộc |
|---|---|
| Mọi use case trừ UC001, UC002, UC038, UC039 | Phải đăng nhập (vai trò Learner hoặc Teacher); tài khoản không bị khóa (BR-28) |
| UC014, UC016, UC017, UC043, UC044 (quiz) | Phải **đã ghi danh** khóa học (BR-01, BR-09, NFR-06); riêng bài xem thử không cần ghi danh |
| UC015 Đánh giá | Phải đã ghi danh; mỗi người một đánh giá mỗi khóa (BR-08) |
| UC011 Giỏ hàng | Khóa chưa ghi danh (409 `ALREADY_ENROLLED`), chưa có trong giỏ (409 `ALREADY_IN_CART`), không miễn phí (422 `FREE_COURSE`); Teacher không thêm khóa của chính mình (422 `OWN_COURSE`) |
| UC012 Thanh toán | Giỏ không rỗng (422 `CART_EMPTY`); toàn bộ trong một transaction (BR-07) |
| UC005 đến UC009 | Chỉ hiển thị khóa ở trạng thái `PUBLISHED` (BR-13, BR-19); khóa `ARCHIVED` trả 404 với người chưa ghi danh (BR-22) |
| UC022 đến UC030, UC037 | Phải là Teacher và là **chủ khóa** (khóa của người khác trả 404 để không lộ sự tồn tại, BR-23); UC028, UC029, UC030 chỉ cho giảng viên của khóa (BR-24 đến BR-26) |
| UC024 Gửi duyệt | Khóa ở trạng thái `DRAFT` hoặc `REJECTED`, đạt checklist BR-20, nếu không trả 422 `COURSE_INCOMPLETE` |
| UC025 Sửa khóa đã xuất bản | Khóa ở trạng thái `PUBLISHED`; mỗi khóa có tối đa một bản sửa đổi đang mở (BR-21) |
| UC031 Ẩn hoặc khôi phục | Khóa `PUBLISHED` chuyển sang `ARCHIVED` và ngược lại; chuyển trạng thái sai trả 422 `INVALID_COURSE_STATE` (BR-19) |
| UC032 đến UC035 | Phải là Admin (route `/admin/*`, nếu không trả 403); Admin chỉ tạo bằng seed hoặc script, không đăng ký được (BR-30); không khóa chính mình hoặc Admin khác (BR-28) |
| UC026, UC033, UC043 đến UC045 | Phụ thuộc dịch vụ Gemini và hạn mức AI (NFR-14); AI lỗi thì thao tác chính (soạn tay, duyệt) vẫn dùng được (BR-29) |

**Vòng đời khóa học (trạng thái `CourseStatus`, BR-19)** là phụ thuộc quan trọng nhất của nhóm use case Giảng viên và Quản trị:

`DRAFT` → (UC024 Gửi duyệt) → `PENDING_REVIEW` → (UC032 Duyệt) → `PUBLISHED`; (UC032 Từ chối) → `REJECTED` → (sửa, gửi lại) → `PENDING_REVIEW`; Teacher rút lại khi đang chờ: `PENDING_REVIEW` → `DRAFT`; (UC031) `PUBLISHED` ↔ `ARCHIVED`.

**Kịch bản xuyên ba tác nhân (dùng cho demo)**: Teacher soạn khóa có AI gợi ý (UC022, UC023, UC026) → gửi duyệt (UC024) → Admin xem AI kiểm duyệt sơ bộ (UC033) và duyệt (UC032) → người theo dõi nhận thông báo (UC036) → Learner tìm, mua, học, nộp project (UC005, UC008, UC012, UC014, UC017) → Teacher chấm (UC028) → Learner nhận thông báo điểm (UC020).

**Nội dung tiếp theo.** Đặc tả chi tiết từng use case (mô tả, tiền điều kiện, luồng chính, luồng thay thế và ngoại lệ, hậu điều kiện) cùng biểu đồ hoạt động cho 14 use case lõi nằm ở mục 2.6. Yêu cầu chức năng (FR-01 đến FR-54), phi chức năng (NFR-01 đến NFR-14), quy tắc nghiệp vụ (BR-01 đến BR-30) và ma trận truy vết FR – UC – màn hình – API – test nằm ở các mục 2.7 đến 2.10.
