# E-Learning — Mobile (Expo)

App di động của đồ án **E-Learning (Đề tài số 5)**: React Native + Expo + TypeScript (`strict`) + Expo Router.
Triển khai production (API, bản web, giám sát, CI/CD): xem [../deploy/README.md](../deploy/README.md). Chạy API local: [../server/README.md](../server/README.md).

## Phiên bản (mọi thành viên dùng đúng bộ này)

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

Mẫu đầy đủ: [.env.example](.env.example).

```
EXPO_PUBLIC_API_URL=http://192.168.1.10:4000/api/v1
```

| Biến                             | Ý nghĩa                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `EXPO_PUBLIC_API_URL`            | URL gốc của API (`.../api/v1`)                                                                                                 |
| `EXPO_PUBLIC_CAPTCHA_PROVIDER`   | `turnstile` (mặc định) hoặc `recaptcha_v2`; phải khớp `CAPTCHA_PROVIDER` ở server                                              |
| `EXPO_PUBLIC_RECAPTCHA_SITE_KEY` | site key reCAPTCHA v2 (công khai). Để trống: chỉ build dev dùng key thử của Google                                             |
| `EXPO_PUBLIC_RECAPTCHA_BASE_URL` | hostname mà WebView CAPTCHA (native) giả làm nguồn phục vụ, vd. `https://app.example.com`; phải nằm trong danh sách của widget |
| `EXPO_PUBLIC_TURNSTILE_SITE_KEY` | site key Turnstile (công khai). Để trống: dùng key thử của Cloudflare (luôn qua, chỉ cho dev)                                  |
| `EXPO_PUBLIC_TURNSTILE_BASE_URL` | như trên, cho Turnstile                                                                                                        |

Chỉ **site key** (công khai) nằm ở phía app; secret key của CAPTCHA chỉ thuộc cấu hình server. Biến `EXPO_PUBLIC_*` được nhúng vào bundle lúc build, nên sửa xong phải khởi động lại Metro (hoặc build lại APK/web). Xác nhận biến hiện diện chưa chứng minh CAPTCHA thật hoạt động: cần thử đăng ký trên bản chạy thật.

- Điện thoại thật: dùng **IP LAN** của máy chạy server (`ipconfig` → IPv4), cùng Wi-Fi với điện thoại. **Không dùng `localhost`.**
- Android Emulator: `http://10.0.2.2:4000/api/v1`.
- Sửa `.env` xong phải khởi động lại Metro: `npx expo start -c`.
- Nếu không đặt biến, app fallback về `http://localhost:4000/api/v1` (chỉ hợp lệ cho web/emulator).

### Không cùng mạng / Wi-Fi chặn kết nối (client isolation)

```bash
npx expo start --tunnel     # đi qua ngrok; chậm hơn nhưng vượt được mạng khác nhau
```

Khi dùng tunnel, API server vẫn phải truy cập được từ điện thoại (dùng IP LAN nếu cùng mạng, hoặc URL của API đã deploy, xem [../deploy/README.md](../deploy/README.md)).

### Scripts

| Lệnh                                 | Việc                                                               |
| ------------------------------------ | ------------------------------------------------------------------ |
| `npm start`                          | `expo start`                                                       |
| `npm run android` / `ios` / `web`    | mở trên nền tảng tương ứng (`web` chỉ để xem nhanh UI)             |
| `npm run typecheck`                  | `tsc --noEmit`                                                     |
| `npm run lint` / `lint:fix`          | ESLint (`--max-warnings 0`) — tự sắp xếp import                    |
| `npm run format` / `format:check`    | Prettier                                                           |
| `npm run check:contrast`             | kiểm tra tương phản WCAG light/dark (cũng được chạy trên CI)       |
| `npm test` / `test:watch`            | Jest                                                               |
| `npx expo export --platform android` | build thử bundle (kiểm tra import/route); xóa `dist/` sau khi chạy |

CI chạy `format:check` và `check:contrast` cùng typecheck, lint, test.

### APK & cập nhật OTA (EAS Update)

- Build APK: `npx eas-cli build -p android --profile preview` (biến môi trường lấy từ `env` của profile trong `eas.json`: API production, reCAPTCHA v2).
- Deploy server/web **không** cập nhật APK đã cài. Thay đổi chỉ ở JS/ảnh thì phát hành OTA:
  `npm run update:preview -- "Mô tả thay đổi"` (hoặc `update:production`). Script lấy `env` của profile cùng tên, tắt đọc `.env` và xóa cache Metro, nên bản cập nhật gọi đúng API production. App tải bản mới khi mở và áp dụng ở **lần mở sau**.
- Thêm thư viện native / nâng SDK → phải build APK mới **và** tăng `version` trong `app.json` (runtime version theo `appVersion`, APK cũ sẽ không nhận bản cập nhật không tương thích).

Trước khi tạo PR: chạy `typecheck`, `lint`, `format:check`, `test` và đảm bảo đều xanh.

## Cấu trúc thư mục

```
mobile/
├── app/                      # CHỈ route (Expo Router) — file mỏng, default export
│   ├── _layout.tsx           # providers + splash + Stack.Protected (auth guard)
│   ├── index.tsx             # Redirect theo trạng thái đăng nhập
│   ├── (auth)/               # login · register · verify-email · forgot/reset-password · two-factor
│   ├── (tabs)/               # index(Home) · search · my-courses · profile
│   └── search-filter · course-list · course/[id]/* · learn/[courseId]/* · question/[id]
│       teacher/[id] · teachers · cart · checkout · notifications · profile/edit · settings/*
├── assets/images/            # icon, splash, adaptive icon, favicon
└── src/
    ├── components/
    │   ├── ui/               # UI kit (AppText, Button, TextField, Chip, Toast, ...)  → import từ '@/components/ui'
    │   ├── course/           # CourseCardVertical/Horizontal, PriceTag, BookmarkButton, skeletons
    │   ├── ErrorBoundary.tsx · AppFrame.tsx · FloatingTabBar.tsx
    ├── features/<feature>/   # api.ts → hooks.ts → components/ → screens/*Screen.tsx (+ test)
    ├── hooks/                # useIsOnline, useAppBootstrap
    ├── lib/                  # apiClient, appError, queryClient, persister, queryKeys, secureStorage
    ├── stores/               # authStore, searchFilterStore (Zustand)
    ├── theme/                # colors, typography, spacing, radius, shadows
    ├── constants/            # config.ts (env, STALE_TIME, storage keys)
    ├── utils/                # formatPrice, formatDuration, formatRelativeTime, discount
    └── types/api.ts          # DTO dùng chung, khớp response của API
```

Alias `@/` → `src/`. Không dùng đường dẫn tương đối quá 2 cấp.

## Quy ước cho người đóng góp

### 1. Thư viện

Các thư viện cần thiết đã có trong `package.json` (`expo-video`, `expo-file-system`, `expo-sharing`, `expo-document-picker`, `expo-image-picker`, `@shopify/flash-list`, `dayjs`...). Hãy tái dùng chúng trước khi thêm thư viện mới. Khi cần cài, **luôn dùng `npx expo install <package>`** (đúng phiên bản theo Expo SDK 57) và nêu lý do trong PR.

### 2. Thêm một màn hình

1. Màn hình nằm ở `src/features/<feature>/screens/<Name>Screen.tsx`; route trong `app/` chỉ lấy params (`courseId`, `teacherId`, `questionId`...) rồi render Screen (**route mỏng**).
2. Route mới: tạo file trong `app/`, **và** khai báo `<Stack.Screen name="..." />` trong nhóm `Stack.Protected` ở `app/_layout.tsx` (nếu không, route sẽ không bị auth guard chặn).
3. Luồng dữ liệu: `features/x/api.ts` (gọi HTTP, có kiểu trả về) → `features/x/hooks.ts` (`useQuery`/`useMutation`) → component. Component **không** import axios.

Route/Screen chính (`src/features/...`):

| Route                                               | Screen                                                                                  |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `(auth)/login`, `register`, `verify-email`, ...     | `auth/screens/LoginScreen`, `RegisterScreen`, `VerifyEmailScreen`, `TwoFactorScreen`... |
| `(tabs)/index`                                      | `home/screens/HomeScreen`                                                               |
| `(tabs)/search`                                     | `search/screens/SearchScreen`                                                           |
| `search-filter` (modal)                             | `search/screens/SearchFilterScreen`                                                     |
| `course-list`                                       | `course/screens/CourseListScreen`                                                       |
| `course/[id]/index`                                 | `course/screens/CourseDetailScreen` (`courseId`)                                        |
| `course/[id]/reviews` · `write-review` (modal)      | `review/screens/AllReviewsScreen` · `WriteReviewScreen` (`courseId`)                    |
| `cart` · `checkout`                                 | `cart/screens/CartScreen` · `CheckoutScreen`                                            |
| `(tabs)/my-courses`                                 | `my-courses/screens/MyCoursesScreen`                                                    |
| `learn/[courseId]/index` · `submit-project` (modal) | `learning/screens/LearningScreen` · `project/screens/SubmitProjectScreen` (`courseId`)  |
| `question/[id]`                                     | `qa/screens/QuestionDetailScreen` (`questionId`)                                        |
| `teacher/[id]` · `teachers`                         | `teacher/screens/TeacherProfileScreen` (`teacherId`) · `TopTeachersScreen`              |
| `(tabs)/profile` · `profile/edit`                   | `profile/screens/ProfileScreen` · `EditProfileScreen`                                   |
| `notifications`                                     | `notification/screens/NotificationsScreen`                                              |
| `settings/*`                                        | `settings/screens/*` (ngôn ngữ, giao diện, bảo mật, 2FA)                                |

Query params (vd `course-list?categoryId=&section=`) đọc bằng `useLocalSearchParams` bên trong Screen.

### 3. Query key, cache, staleTime

- **Mọi** query key lấy từ `src/lib/queryKeys.ts` (`queryKeys.course(id)`, `queryKeys.meCourses('ongoing')`, ...). Không viết mảng key rải rác.
- `staleTime` lấy từ `STALE_TIME.*` trong `src/constants/config.ts` (bảng thời gian cache theo loại dữ liệu), ví dụ `useQuery({ queryKey, queryFn, staleTime: STALE_TIME.course })`.
- Query nào được persist offline do `isPersistedQueryKey` trong `queryKeys.ts` quyết định (chỉ dữ liệu cần xem lại khi mất mạng mới được lưu). Thêm key mới cần persist → sửa hàm đó + test `queryKeys.test.ts`.
- `queryKeys.course(id)` là **prefix** của mọi key `['course', id, ...]`; `queryKeys.me()` là prefix của `['me', ...]` — dùng `{ exact: true }` khi chỉ muốn invalidate đúng một key.
- Infinite list: `useInfiniteQuery` + `api.getPage` (trả `{ data, meta }`); `PAGE_SIZE` = 20.
- Mutation toggle (bookmark/like/follow): optimistic `onMutate` → rollback `onError` + toast → `onSettled` invalidate.

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

- Dùng token từ `@/theme` (`spacing`, `radius`, `typography`, `shadows`); **màu lấy qua `useTheme()` / `makeStyles`**, chuỗi qua i18n — xem mục **Quy ước giai đoạn 2** bên dưới. **Không hard-code** màu/cỡ chữ/font/chuỗi.
- Text luôn qua `AppText` (biến thể `h1 h2 h3 title cardTitle bodyLarge body label caption tab micro`). Không tắt font scaling.
- Nút chỉ có icon → `IconButton` (bắt buộc `accessibilityLabel`, tự bù `hitSlop` đủ 48 dp). Thẻ khóa học: `CourseCardVertical` / `CourseCardHorizontal` (props `course`, `onPress`, `isBookmarked?`, `onToggleBookmark?`) — **truyền callback ổn định (`useCallback`)** để `React.memo` có tác dụng.
- Header màn: `ScreenHeader` (đã xử lý safe area, nút back). Màn nằm trong tab thì không cần back.
- Trạng thái bắt buộc cho màn có dữ liệu: **loading** (`Skeleton`, `CourseCard*Skeleton`) · **error** (`ErrorState` với `onRetry`) · **empty** (`EmptyState`) · **success**.
- Toast: `const toast = useToast(); toast.success('Saved')` trong component, hoặc `showToast(msg, { actionLabel: 'Undo', onAction })` ngoài React.
- Ảnh: `expo-image` với `cachePolicy="memory-disk"`. Danh sách > 20 item: `FlashList`.
- **Icon**: import theo từng bộ để bundle nhỏ — `import Feather from '@expo/vector-icons/Feather'` (icon thường) và `import Ionicons from '@expo/vector-icons/Ionicons'` (sao/bookmark **đặc**). Đừng import từ `'@expo/vector-icons'` (kéo cả chục bộ font).
- Status bar do `app/_layout.tsx` đặt theo theme (`useTheme().statusBarStyle`); màn có header nền primary tự thêm `<StatusBar style="light" />`.
- Bàn phím: Android dùng `softwareKeyboardLayoutMode: "resize"` (app.json), iOS dùng `KeyboardAvoidingView behavior="padding"` — xem `features/auth/components/AuthLayout.tsx`.

### 6. Form

`react-hook-form` + `zod` (**zod v4**: dùng `z.email()`, `.pipe()`, tham số lỗi là chuỗi hoặc `{ error }`) + `FormTextField` (`@/components/ui`). Lỗi server đặt lên field bằng `applyAuthError`-style helper (xem `features/auth/authErrors.ts`).

### 7. Test

- Đặt cạnh file nguồn: `xxx.test.ts(x)`; tên mô tả hành vi.
- **RNTL v14 là bất đồng bộ**: `await render(...)`, `await fireEvent.press(...)`, `await screen.findByText(...)`. Matcher `toBeOnTheScreen`, `toBeSelected`, ... đã bật trong `jest.setup.ts`.
- Mock `expo-router` khi test component dùng `router` (xem `ScreenHeader.test.tsx`); mock tầng `api.ts`/`hooks.ts` khi test màn hình (xem `LoginScreen.test.tsx`).
- Dữ liệu mẫu khóa học cho test: `makeCourse()` trong `src/components/course/courseFixtures.ts`.

## Quy ước giai đoạn 2 (theme · i18n · Settings · web)

Từ 03/10/2026 app có **dark mode**, **tiếng Việt / English** và bản **web**. Màn hình mới (và màn nào được sửa) phải theo các quy ước sau. Token và cặp màu chữ/nền nằm ở `src/theme/palettes.ts` và `src/theme/contrast.ts`.

### Màu & theme

- Màu luôn lấy từ `useTheme()` hoặc `makeStyles` (`@/theme`), **không** dùng `colors` tĩnh cũ (đã `@deprecated`) và **không** viết hex/`rgba` trong component:

  ```tsx
  const useStyles = makeStyles((t) => ({
    card: { backgroundColor: t.colors.card, borderColor: t.colors.border },
  }));

  function Card() {
    const styles = useStyles(); // dựng lại khi đổi theme, memo theo theme
    const { colors, isDark } = useTheme(); // cho giá trị truyền qua prop (màu icon, ActivityIndicator...)
    return <View style={styles.card} />;
  }
  ```

- Token ngữ nghĩa nằm ở `src/theme/palettes.ts` (`lightPalette` + `darkPalette` **cùng khóa**). Chữ phải đạt WCAG AA ≥ 4,5:1 ở **cả hai**: thêm cặp chữ/nền mới vào `src/theme/contrast.ts`, rồi chạy `npm run check:contrast` (test `palettes.test.ts` cũng kiểm). Chữ dùng `text/textSecondary/textMuted/primaryText/dangerText/onXxx`; **không** dùng `primary`, `danger`, `star`, `border` làm màu chữ.
- Chế độ theo hệ thống / sáng / tối lưu bằng `preferencesStore`; `StyleSheet.create` ở module scope chỉ cho giá trị tĩnh (spacing, radius...).

### Chuỗi & ngôn ngữ

- **Không hard-code chuỗi hiển thị.** Thêm key vào **cả** `src/i18n/locales/vi/<ns>.json` và `en/<ns>.json` (test `locales.test.ts` bắt thiếu key hoặc sai `{{biến}}`). Mỗi feature có một namespace (`common`, `errors`, `auth`, `home`, `search`, `course`, `cart`, `learning`, `qa`, `review`, `project`, `teacher`, `profile`, `notification`, `myCourses`, `settings`, `ai`); namespace mới = tạo 2 file JSON + khai báo trong `src/i18n/resources.ts`.
- Dùng trong component: `const { t } = useTranslation('profile'); t('stats.saved')` (key được kiểm kiểu theo JSON tiếng Anh). Nhiều namespace: `useTranslation(['profile', 'common'])` rồi `t('common:actions.save')`. Số nhiều: `count_one` / `count_other` (tiếng Việt chỉ cần `_other`). Ngoài component: `i18n.t('ns:key')` ở **thời điểm gọi** (đừng giữ kết quả ở module scope); key chỉ biết lúc chạy (mã lỗi server) → `getErrorMessage(error)` / `tr(key)`. Message zod: `{ error: () => i18n.t('...') }` (lazy).
- Số, ngày, giá theo ngôn ngữ: `formatNumber` / `formatFixed` / `formatDate` (`@/i18n/format`), `formatPrice` (luôn USD, chỉ đổi dấu phân cách: `$1,020` ↔ `$1.020`), `formatDuration`, `formatRelativeTime`. Component hiển thị chúng phải gọi `useTranslation()` hoặc `useLanguage()` để render lại khi đổi ngôn ngữ.
- Dữ liệu mẫu từ server (tên khóa, nội dung bài) giữ tiếng Anh; `apiClient` gửi header `Accept-Language` theo ngôn ngữ đang chọn (AI trả lời theo đó).

### Settings

- Màn `/settings` (`features/settings`, mở từ Hồ sơ → ⋮ → Cài đặt): ngôn ngữ (theo hệ thống / Tiếng Việt / English), giao diện (theo hệ thống / sáng / tối), thông tin app, đăng xuất có xác nhận. Lưu ở AsyncStorage (`elearning.pref.language`, `elearning.pref.theme-mode`) và áp lại trước khi splash tắt.
- Hộp xác nhận dùng `confirmAction` (`@/utils/confirmAction`): `Alert.alert` **không chạy trên web**, nên web dùng `window.confirm`. Đăng xuất: `useConfirmLogout()` (dùng chung Settings và menu Hồ sơ).

### Chạy trên web

- Dev: `npx expo start --web` (thêm `--port 8091` nếu cổng bận). API phải cho phép CORS từ origin của web. Build tĩnh (SPA): `npx expo export --platform web --output-dir dist` — máy chủ phải trả `index.html` cho mọi đường dẫn không phải file (xem `Dockerfile.web`).
- Token đăng nhập: SecureStore không có trên web nên `lib/secureStorage.ts` lưu vào `localStorage` (mọi script cùng origin đọc được — chấp nhận cho đồ án, đã ghi trong code); tải lại trang vẫn đăng nhập, trình duyệt chặn `localStorage` thì coi như chưa đăng nhập.
- Layout: `AppFrame` giới hạn cột nội dung `MAX_CONTENT_WIDTH` (520 dp) và căn giữa; nền ngoài cột theo theme.
- PWA: `public/manifest.json`, `public/icons/*` (sinh từ `assets/images/icon.png`) và `public/index.html` (mẫu HTML tùy biến: link manifest, meta, tô nền trước khi JS chạy để dark mode không nháy trắng); `app.json` → `web` (name, themeColor, display…). Chưa có service worker (không chạy offline), nhưng cài được qua "Install app" của Chrome/Edge.
- API chỉ có trên native phải có nhánh `Platform.OS === 'web'` hoặc fallback (đã làm: `Alert` → `confirmAction`, SecureStore → `localStorage`).

### Test

- `renderWithProviders(ui, { theme?, language?, client?, insets? })` và `renderHookWithProviders` (`@/test/renderWithProviders`) bọc đủ SafeArea + Theme + i18n (+ QueryClient): mặc định **English + light** để câu chữ ổn định, truyền `language: 'vi'` / `theme: 'dark'` để thử bản khác. `renderWithClient` (`features/search/testUtils`) đã dùng nó. `jest.setup.ts` trả ngôn ngữ về `en` sau mỗi test; test đổi theme nên gọi `resetTestPreferences()` ở `beforeEach`.
- Chế độ `system`: mock `react-native/Libraries/Utilities/useColorScheme` (mẫu `src/theme/ThemeProvider.test.tsx`).

## Ghi chú kỹ thuật / sai lệch có chủ đích so với template Expo

- Route đặt ở `mobile/app/`, **không** dùng `src/app/` của template.
- `experiments.reactCompiler = false` và `typedRoutes = false`: dự án memo thủ công (`React.memo`/`useCallback`); typed routes sinh file trong `.expo/` (gitignore) nên kết quả `typecheck` sẽ khác nhau giữa các máy.
- Tabs dùng `Tabs` từ `expo-router/js-tabs` (bản `Tabs` trong `expo-router` đã deprecated ở SDK 57).
- `StyleSheet.absoluteFillObject` đã bị gỡ ở RN 0.86 → dùng `StyleSheet.absoluteFill` hoặc tự khai báo `position: 'absolute'`.
- `expo-secure-store` không có trên web → token được lưu ở `localStorage` (xem **Web** ở mục giai đoạn 2); trên native vẫn là SecureStore.
- Font (Playfair Display cho tiêu đề lớn, Be Vietnam Pro cho nội dung) import theo từng trọng lượng (vd. `@expo-google-fonts/be-vietnam-pro/400Regular`, xem `src/theme/typography.ts`) để không kéo cả họ font vào bundle.
- Splash giữ tới khi: font xong + restore cache persist + đọc token và gọi `/auth/me` (tối đa 12 s).
