# E-Learning — Mobile (Expo)

App di động của đồ án **E-Learning (Đề tài số 5)**: React Native + Expo + TypeScript (`strict`) + Expo Router.
Kế hoạch, đặc tả và design gốc nằm trong tài liệu nội bộ của nhóm (`PLAN.md`, `CLAUDE.md`, `design/` — không đưa lên repo).

## Phiên bản (đã chốt — mọi thành viên dùng đúng bộ này)

| Thành phần           | Phiên bản                                                             |
| -------------------- | --------------------------------------------------------------------- |
| Expo SDK             | **57** (`expo ~57.0.26`)                                              |
| React Native / React | **0.86.3** / **19.2.3** (New Architecture)                            |
| Expo Router          | `~57.0.24` (file-based; `Stack.Protected` cho auth guard)             |
| TypeScript           | 6.0 (`strict`)                                                        |
| TanStack Query       | 5.104 · Zustand 5.0 · axios 1.20 · zod **4.6** · react-hook-form 7.89 |
| Test                 | jest 29 + jest-expo 57 + `@testing-library/react-native` **14**       |

Cài **Expo Go tương thích SDK 57** trên điện thoại (Android/iOS).

## Cài đặt & chạy

```bash
cd mobile
npm install
cp .env.example .env        # rồi sửa EXPO_PUBLIC_API_URL (xem dưới)
npx expo start              # quét QR bằng Expo Go
```

### Biến môi trường (`mobile/.env`, không commit)

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api/v1
```

- Điện thoại thật: dùng **IP LAN** của máy chạy server (`ipconfig` → IPv4), cùng Wi-Fi với điện thoại. **Không dùng `localhost`.**
- Android Emulator: `http://10.0.2.2:4000/api/v1`.
- Sửa `.env` xong phải khởi động lại Metro: `npx expo start -c`.
- Nếu không đặt biến, app fallback về `http://localhost:4000/api/v1` (chỉ hợp lệ cho web/emulator).

### Không cùng mạng / Wi-Fi chặn kết nối (client isolation)

```bash
npx expo start --tunnel     # đi qua ngrok; chậm hơn nhưng vượt được mạng khác nhau
```

Khi dùng tunnel, API server vẫn phải truy cập được từ điện thoại (dùng IP LAN nếu cùng mạng, hoặc URL deploy Render).

### Scripts

| Lệnh                                 | Việc                                                               |
| ------------------------------------ | ------------------------------------------------------------------ |
| `npm start`                          | `expo start`                                                       |
| `npm run android` / `ios` / `web`    | mở trên nền tảng tương ứng (`web` chỉ để xem nhanh UI)             |
| `npm run typecheck`                  | `tsc --noEmit`                                                     |
| `npm run lint` / `lint:fix`          | ESLint (`--max-warnings 0`) — tự sắp xếp import                    |
| `npm run format` / `format:check`    | Prettier                                                           |
| `npm test` / `test:watch`            | Jest                                                               |
| `npx expo export --platform android` | build thử bundle (kiểm tra import/route); xóa `dist/` sau khi chạy |

Trước khi báo "xong" một task: chạy `typecheck`, `lint`, `test` và báo kết quả thật (CLAUDE.md §11).

## Cấu trúc thư mục

```
mobile/
├── app/                      # CHỈ route (Expo Router) — file mỏng, default export
│   ├── _layout.tsx           # providers + splash + Stack.Protected (auth guard)
│   ├── index.tsx             # Redirect theo trạng thái đăng nhập
│   ├── (auth)/               # login, register
│   ├── (tabs)/               # index(Home) · search · my-courses · profile
│   └── search-filter · course-list · course/[id]/* · learn/[courseId]/* · question/[id]
│       teacher/[id] · teachers · cart · checkout · notifications · profile/edit
├── assets/images/            # icon, splash, adaptive icon, favicon
└── src/
    ├── components/
    │   ├── ui/               # UI kit (AppText, Button, TextField, Chip, Toast, ...)  → import từ '@/components/ui'
    │   ├── course/           # CourseCardVertical/Horizontal, PriceTag, BookmarkButton, skeletons
    │   ├── ErrorBoundary.tsx · AppFrame.tsx · TabBarLabel.tsx
    ├── features/<feature>/   # api.ts → hooks.ts → components/ → screens/*Screen.tsx (+ test)
    ├── hooks/                # useIsOnline, useAppBootstrap
    ├── lib/                  # apiClient, appError, queryClient, persister, queryKeys, secureStorage
    ├── stores/               # authStore, searchFilterStore (Zustand)
    ├── theme/                # colors, typography, spacing, radius, shadows
    ├── constants/            # config.ts (env, STALE_TIME, storage keys), strings.ts
    ├── utils/                # formatPrice, formatDuration, formatRelativeTime, discount
    └── types/api.ts          # DTO dùng chung (khớp PLAN.md §9.3)
```

Alias `@/` → `src/`. Không dùng đường dẫn tương đối quá 2 cấp.

## Quy ước cho thành viên / agent làm tiếp

### 1. Không cài thêm thư viện

Toàn bộ thư viện của PLAN §5.3 đã được cài (xem `package.json`). **Đừng chạy `npm install`/`expo install` thêm.** Nếu thật sự cần, hỏi nhóm rồi ghi vào PLAN.md §22 (CLAUDE.md §11.4). Nếu cần một thư viện _có sẵn_: `expo-video`, `expo-file-system`, `expo-sharing`, `expo-document-picker`, `expo-image-picker`, `@shopify/flash-list`, `dayjs`... đều đã có.

### 2. Thêm / hoàn thiện một màn hình

Mọi route trong PLAN §5.3 **đã tồn tại** và render `PlaceholderScreen` (ghi mã SC). Để làm màn thật:

1. Mở `src/features/<feature>/screens/<Name>Screen.tsx` (đã có sẵn) và **thay thân component** — giữ nguyên tên export và props (`courseId`, `teacherId`, `questionId` do route truyền vào).
2. **Không sửa file trong `app/`** trừ khi thêm route mới (route mỏng: lấy params rồi render Screen).
3. Route mới: tạo file trong `app/`, **và** khai báo `<Stack.Screen name="..." />` trong nhóm `Stack.Protected` ở `app/_layout.tsx` (nếu không, route sẽ không bị auth guard chặn).
4. Luồng dữ liệu: `features/x/api.ts` (gọi HTTP, có kiểu trả về) → `features/x/hooks.ts` (`useQuery`/`useMutation`) → component. Component **không** import axios.

Route/Screen hiện có:

| Route                                               | Screen (`src/features/...`)                                                            | SC          |
| --------------------------------------------------- | -------------------------------------------------------------------------------------- | ----------- |
| `(auth)/login`, `register`                          | `auth/screens/LoginScreen`, `RegisterScreen`                                           | SC-02/03 ✅ |
| `(tabs)/index`                                      | `home/screens/HomeScreen`                                                              | SC-04       |
| `(tabs)/search`                                     | `search/screens/SearchScreen`                                                          | SC-05/06    |
| `search-filter` (modal)                             | `search/screens/SearchFilterScreen`                                                    | SC-07       |
| `course-list`                                       | `course/screens/CourseListScreen`                                                      | SC-08       |
| `course/[id]/index`                                 | `course/screens/CourseDetailScreen` (`courseId`)                                       | SC-09       |
| `course/[id]/reviews` · `write-review` (modal)      | `review/screens/AllReviewsScreen` · `WriteReviewScreen` (`courseId`)                   | SC-10/11    |
| `cart` · `checkout`                                 | `cart/screens/CartScreen` · `CheckoutScreen`                                           | SC-12/13    |
| `(tabs)/my-courses`                                 | `my-courses/screens/MyCoursesScreen`                                                   | SC-14       |
| `learn/[courseId]/index` · `submit-project` (modal) | `learning/screens/LearningScreen` · `project/screens/SubmitProjectScreen` (`courseId`) | SC-15/17    |
| `question/[id]`                                     | `qa/screens/QuestionDetailScreen` (`questionId`)                                       | SC-16       |
| `teacher/[id]` · `teachers`                         | `teacher/screens/TeacherProfileScreen` (`teacherId`) · `TopTeachersScreen`             | SC-18/19    |
| `(tabs)/profile` · `profile/edit`                   | `profile/screens/ProfileScreen` · `EditProfileScreen`                                  | SC-20/21    |
| `notifications`                                     | `notification/screens/NotificationsScreen`                                             | SC-22       |

Query params (vd `course-list?categoryId=&section=`) đọc bằng `useLocalSearchParams` bên trong Screen.

### 3. Query key, cache, staleTime

- **Mọi** query key lấy từ `src/lib/queryKeys.ts` (`queryKeys.course(id)`, `queryKeys.meCourses('ongoing')`, ...). Không viết mảng key rải rác.
- `staleTime` lấy từ `STALE_TIME.*` trong `src/constants/config.ts` (đúng bảng PLAN §10), ví dụ `useQuery({ queryKey, queryFn, staleTime: STALE_TIME.course })`.
- Query nào được persist offline do `isPersistedQueryKey` trong `queryKeys.ts` quyết định (khớp cột "Persist" của §10). Thêm key mới cần persist → sửa hàm đó + test `queryKeys.test.ts`.
- `queryKeys.course(id)` là **prefix** của mọi key `['course', id, ...]`; `queryKeys.me()` là prefix của `['me', ...]` — dùng `{ exact: true }` khi chỉ muốn invalidate đúng một key.
- Infinite list: `useInfiniteQuery` + `api.getPage` (trả `{ data, meta }`); `PAGE_SIZE` = 20.
- Mutation toggle (bookmark/like/follow): optimistic `onMutate` → rollback `onError` + toast → `onSettled` invalidate (CLAUDE.md §7).

### 4. Gọi API

```ts
import { api } from '@/lib/apiClient';
export const courseApi = {
  detail: (id: string) => api.get<CourseDetail>(`/courses/${id}`),
  list: (params: CourseListParams) => api.getPage<CourseSummary>('/courses', params),
  bookmark: (id: string) => api.put(`/courses/${id}/bookmark`), // 204 => undefined
};
```

- `api.get/post/put/patch/delete` trả về `data` đã bóc; `api.getPage` giữ `meta`; `api.getWithMeta` cho endpoint có meta riêng; `api.postForm` để upload (có progress).
- Lỗi luôn là `AppError { status, code, message, details }` (`isNetworkError`, `isUnauthorized`). Dùng `getErrorMessage(error)` để lấy câu thân thiện, `getFieldErrors(error)` cho lỗi từng field.
- Token tự gắn `Authorization: Bearer`; **401 khi đang đăng nhập → tự logout** (xóa token + cache), màn Login hiện toast "session expired".
- Khi offline, mọi request ghi (POST/PUT/PATCH/DELETE) bị chặn với `AppError code='OFFLINE'` → hiển thị toast (`getErrorMessage` đã có câu "You're offline").
- DTO nằm ở `src/types/api.ts` — không tự khai báo lại kiểu của API.

### 5. UI

- Dùng token từ `@/theme` (`colors`, `spacing`, `radius`, `typography`, `shadows`); **không hard-code** màu/cỡ chữ/font. Chuỗi dùng chung đặt ở `constants/strings.ts`.
- Text luôn qua `AppText` (biến thể `h1 h2 h3 title cardTitle bodyLarge body label caption tab micro`). Không tắt font scaling.
- Nút chỉ có icon → `IconButton` (bắt buộc `accessibilityLabel`, tự bù `hitSlop` đủ 48 dp). Thẻ khóa học: `CourseCardVertical` / `CourseCardHorizontal` (props `course`, `onPress`, `isBookmarked?`, `onToggleBookmark?`) — **truyền callback ổn định (`useCallback`)** để `React.memo` có tác dụng.
- Header màn: `ScreenHeader` (đã xử lý safe area, nút back). Màn nằm trong tab thì không cần back.
- Trạng thái bắt buộc cho màn có dữ liệu: **loading** (`Skeleton`, `CourseCard*Skeleton`) · **error** (`ErrorState` với `onRetry`) · **empty** (`EmptyState`) · **success**.
- Toast: `const toast = useToast(); toast.success('Saved')` trong component, hoặc `showToast(msg, { actionLabel: 'Undo', onAction })` ngoài React.
- Ảnh: `expo-image` với `cachePolicy="memory-disk"`. Danh sách > 20 item: `FlashList`.
- **Icon**: import theo từng bộ để bundle nhỏ — `import Feather from '@expo/vector-icons/Feather'` (icon thường) và `import Ionicons from '@expo/vector-icons/Ionicons'` (sao/bookmark **đặc**). Đừng import từ `'@expo/vector-icons'` (kéo cả chục bộ font).
- Status bar mặc định `dark`. Màn có header nền primary (Home) tự thêm `<StatusBar style="light" />`.
- Bàn phím: Android dùng `softwareKeyboardLayoutMode: "pan"` (app.json), iOS dùng `KeyboardAvoidingView behavior="padding"` — xem `features/auth/components/AuthLayout.tsx`.

### 6. Form

`react-hook-form` + `zod` (**zod v4**: dùng `z.email()`, `.pipe()`, tham số lỗi là chuỗi hoặc `{ error }`) + `FormTextField` (`@/components/ui`). Lỗi server đặt lên field bằng `applyAuthError`-style helper (xem `features/auth/authErrors.ts`).

### 7. Test

- Đặt cạnh file nguồn: `xxx.test.ts(x)`; tên mô tả hành vi.
- **RNTL v14 là bất đồng bộ**: `await render(...)`, `await fireEvent.press(...)`, `await screen.findByText(...)`. Matcher `toBeOnTheScreen`, `toBeSelected`, ... đã bật trong `jest.setup.ts`.
- Mock `expo-router` khi test component dùng `router` (xem `ScreenHeader.test.tsx`); mock tầng `api.ts`/`hooks.ts` khi test màn hình (xem `LoginScreen.test.tsx`).
- Dữ liệu mẫu khóa học cho test: `makeCourse()` trong `src/components/course/courseFixtures.ts`.

## Ghi chú kỹ thuật / sai lệch có chủ đích so với template Expo

- Route đặt ở `mobile/app/` (đúng PLAN §5.3), **không** dùng `src/app/` của template.
- `experiments.reactCompiler = false` và `typedRoutes = false`: CLAUDE.md yêu cầu memo thủ công (`React.memo`/`useCallback`); typed routes sinh file trong `.expo/` (gitignore) nên kết quả `typecheck` sẽ khác nhau giữa các máy.
- Tabs dùng `Tabs` từ `expo-router/js-tabs` (bản `Tabs` trong `expo-router` đã deprecated ở SDK 57).
- `StyleSheet.absoluteFillObject` đã bị gỡ ở RN 0.86 → dùng `StyleSheet.absoluteFill` hoặc tự khai báo `position: 'absolute'`.
- `expo-secure-store` không có trên web → chạy `npm run web` sẽ luôn ở trạng thái chưa đăng nhập sau khi reload (chỉ để xem UI; test đăng nhập thật trên Expo Go).
- Font (Epilogue 600/700, Inter 400/500/600) import theo từng trọng lượng (`@expo-google-fonts/inter/400Regular`) để không kéo cả họ font vào bundle.
- Splash giữ tới khi: font xong + restore cache persist + đọc token và gọi `/auth/me` (tối đa 12 s).
