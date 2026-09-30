# Coding Standard — Chuẩn code (D-08)

> **Tài liệu:** `docs/03-implementation/coding-standard.md` · **Task:** D-08 · **Owner:** B (Nguyễn Văn Sỹ)
> **Nền tảng:** mở rộng [CLAUDE.md](../../CLAUDE.md) §6–§10 (quy ước chung, mobile, backend, test, Git) thành chuẩn chi tiết có **ví dụ đúng/sai**. Khi mâu thuẫn, thứ tự ưu tiên: design gốc + tokens → [PLAN.md](../../PLAN.md) → CLAUDE.md → tài liệu này.
> Liên quan: [SDS.md](../02-design/SDS.md) · [api-spec.md](../02-design/api-spec.md) · [ui-design.md](../02-design/ui-design.md) · [database.md](../02-design/database.md).

**Ký hiệu:** ✅ đúng · ❌ sai · **[bắt buộc]** = có ESLint/CI bắt hoặc là quy tắc CLAUDE.md · **[nên]** = khuyến nghị, review có thể yêu cầu sửa.

## Mục lục

1. [Nguyên tắc chung](#1-nguyên-tắc-chung)
2. [TypeScript](#2-typescript)
3. [React Native: component, hook, style](#3-react-native-component-hook-style)
4. [TanStack Query và Zustand](#4-tanstack-query-và-zustand)
5. [Backend: phân lớp](#5-backend-phân-lớp)
6. [zod và validate](#6-zod-và-validate)
7. [Xử lý lỗi và logging](#7-xử-lý-lỗi-và-logging)
8. [Kiểm thử](#8-kiểm-thử)
9. [Git, commit, Pull Request](#9-git-commit-pull-request)
10. [Cấu hình ESLint, Prettier, TypeScript](#10-cấu-hình-eslint-prettier-typescript)
11. [Checklist review PR](#11-checklist-review-pr)

---

## 1. Nguyên tắc chung

1. **Đơn giản, dễ giải thích** — đây là đồ án môn học và phải thuyết trình được (CLAUDE.md §11.9).
2. **Bám thiết kế:** kiến trúc theo [SDS.md](../02-design/SDS.md), API theo [api-spec.md](../02-design/api-spec.md), UI theo `design/screens/*.png` và tokens. Muốn khác thì hỏi nhóm, sửa tài liệu rồi mới code.
3. **Đúng phạm vi task:** làm đúng task ID trong PLAN.md, không tự mở rộng tính năng.
4. **Nhất quán hơn sáng tạo:** theo mẫu có sẵn trong repo trước khi tạo kiểu mới.
5. **Ngôn ngữ:** tên biến/hàm/file/commit **tiếng Anh**; comment tiếng Việt *hoặc* tiếng Anh nhưng thống nhất trong một file; chuỗi hiển thị trong app **tiếng Anh** và đặt ở `mobile/src/constants/strings.ts`; tài liệu tiếng Việt.
6. **Không hard-code** secret, URL, màu, cỡ chữ, khoảng cách — lấy từ env, `theme`, `constants`.
7. **Không để lại** `console.log`, code chết, dữ liệu giả, `// TODO` trong code commit (việc cần làm sau thì tạo issue).

### 1.1 Quy ước đặt tên

| Đối tượng | Quy tắc | Ví dụ |
|---|---|---|
| Component, Screen | `PascalCase`, file trùng tên | `CourseCard.tsx`, `HomeScreen.tsx` |
| Hook | `useXxx`, file `camelCase` | `useCourseDetail.ts` (hoặc gom trong `hooks.ts` của feature) |
| Hàm, biến | `camelCase` | `formatPrice`, `courseList` |
| Hằng số toàn cục | `UPPER_SNAKE_CASE` | `MAX_UPLOAD_BYTES` |
| Type, interface | `PascalCase`, **không** tiền tố `I` | `CourseSummary`, không `ICourse` |
| Boolean | Bắt đầu bằng `is/has/can/should` | `isBookmarked`, `hasNextPage` |
| File tiện ích (không phải component) | `camelCase.ts` | `formatDuration.ts` |
| File route Expo Router | `kebab-case` hoặc `[param].tsx` | `search-filter.tsx`, `[id].tsx` |
| File test | cạnh file nguồn | `formatPrice.test.ts` |
| Module server | `<module>.routes.ts`, `.controller.ts`, `.service.ts`, `.schema.ts` | `cart.service.ts` |
| Nhánh Git | `feature/<task-id>-<mô-tả>` | `feature/M-07-login-screen` |
| Mã lỗi API | `UPPER_SNAKE_CASE` | `COURSE_NOT_FOUND` |

### 1.2 Cấu trúc file và kích thước

- Hàm ≤ ~50 dòng, component ≤ ~200 dòng — dài hơn thì tách (hook riêng, component con, hàm helper).
- Mỗi file một trách nhiệm chính; file `api.ts` chỉ chứa hàm gọi HTTP, `hooks.ts` chỉ chứa hook.
- Không dùng đường dẫn tương đối quá 2 cấp; dùng alias `@/` (`mobile/src/`, `server/src/`).

---

## 2. TypeScript

### 2.1 `strict` và cấm `any`

`strict: true`. **Cấm `any`** — dùng `unknown` rồi thu hẹp kiểu. Cấm `// @ts-ignore`; nếu bắt buộc thì `// @ts-expect-error <lý do>`.

```ts
// ❌ any làm mất kiểm tra kiểu
function parseUser(json: any) {
  return json.user.name.toUpperCase();
}

// ✅ unknown + thu hẹp bằng kiểu/zod
function parseUser(json: unknown): string {
  const result = userResponseSchema.safeParse(json);
  if (!result.success) throw new Error('Invalid user payload');
  return result.data.user.name.toUpperCase();
}
```

```ts
// ❌ ép kiểu không kiểm chứng
const course = response.data as CourseDetail;

// ✅ khai báo kiểu trả về ở tầng api.ts, kiểu DTO lấy từ @/types/api
export async function fetchCourseDetail(id: string): Promise<CourseDetail> {
  const res = await apiClient.get<{ data: CourseDetail }>(`/courses/${id}`);
  return res.data.data;
}
```

```ts
// ❌ vô hiệu hóa lỗi kiểu
// @ts-ignore
button.press();

// ✅ nếu thật sự cần, ghi lý do
// @ts-expect-error expo-router chưa khai báo kiểu cho typed routes ở SDK này
router.push('/course/[id]');
```

### 2.2 `type`, `interface`, union, enum

- Dùng `type` cho union/kết hợp/DTO; `interface` chỉ khi cần `extends`/khai báo mở rộng. **Không** dùng `enum` — dùng union literal + `as const`.
- Trạng thái có nhiều dạng dùng **discriminated union**.

```ts
// ❌ enum và cờ boolean rời rạc
enum LessonStatus { Completed, Locked }
type State = { isLoading: boolean; isError: boolean; data?: Course };

// ✅ union literal và union phân biệt
type LessonStatus = 'COMPLETED' | 'IN_PROGRESS' | 'UNLOCKED' | 'LOCKED';
type State =
  | { status: 'loading' }
  | { status: 'error'; error: AppError }
  | { status: 'success'; data: Course };
```

```ts
// ✅ hằng và kiểu suy ra từ dữ liệu
export const PAYMENT_METHODS = ['MOCK_CARD', 'MOCK_EWALLET'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];
```

### 2.3 null, undefined, tùy chọn

```ts
// ❌ bỏ qua khả năng null
const name = course.teacher.avatarUrl.trim();

// ✅ xử lý rõ ràng
const avatarUri = course.teacher.avatarUrl ?? undefined;
```

- API trả `null` cho "không có giá trị" (`headline: string | null`); trong TypeScript không tự đổi thành chuỗi rỗng.
- Dùng `??` thay `||` khi `0`, `''`, `false` là giá trị hợp lệ:

```ts
// ❌ 0 (giá miễn phí) bị coi là "không có giá"
const price = course.priceCents || DEFAULT_PRICE;
// ✅
const price = course.priceCents ?? DEFAULT_PRICE;
```

### 2.4 Export và import

- **Chỉ named export**, trừ file route trong `mobile/app/` (Expo Router yêu cầu `default export`).
- Thứ tự import: thư viện ngoài → alias `@/` → tương đối; ESLint (`simple-import-sort`) tự sắp xếp. Dùng `import type` cho kiểu.

```ts
// ❌ default export ngoài app/, đường dẫn tương đối dài, lộn thứ tự
import { formatPrice } from '../../../utils/formatPrice';
import React from 'react';
import { CourseSummary } from '@/types/api';
export default function CourseCard() {
  return null;
}

// ✅
import { useCallback } from 'react';
import { View } from 'react-native';

import { formatPrice } from '@/utils/formatPrice';
import type { CourseSummary } from '@/types/api';

import { styles } from './CourseCard.styles';

export function CourseCard({ course, onPress }: CourseCardProps) {
  return <CourseCardHorizontal course={course} onPress={onPress} />;
}
```

```tsx
// ✅ file route trong app/ là ngoại lệ duy nhất - default export và MỎNG
// app/course/[id]/index.tsx
import { useLocalSearchParams } from 'expo-router';

import { CourseDetailScreen } from '@/features/course/screens/CourseDetailScreen';

export default function CourseDetailRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CourseDetailScreen courseId={id} />;
}
```

### 2.5 Hàm, async, magic number

```ts
// ❌ magic number, then-chain lồng nhau, nuốt lỗi
api.get('/x').then((r) => { setTimeout(() => save(r), 10000); }).catch(() => {});

// ✅ hằng có tên, async/await, lỗi được xử lý ở tầng phù hợp
const PROGRESS_SAVE_INTERVAL_MS = 10_000;

async function loadAndSchedule(): Promise<void> {
  const data = await fetchX();
  scheduleSave(data, PROGRESS_SAVE_INTERVAL_MS);
}
```

- Hàm thuần cho logic có thể test (`formatPrice`, `formatDuration`, `discountPercent`) đặt ở `utils/`, có unit test.
- Tham số object khi > 3 tham số: `fn({ a, b, c, d })`.
- Promise không `await` phải có `void`/`.catch` rõ ràng (`no-floating-promises`).

### 2.6 Comment

Chỉ comment **vì sao**, không comment lại **cái gì** code đã nói. Không để code bị comment-out.

```ts
// ❌
// tăng i lên 1
i += 1;

// ✅ giải thích lý do nghiệp vụ
// Chỉ tính lại % khóa khi bài vừa chuyển sang hoàn thành (BR-03/BR-04) để tránh đếm mỗi 10 giây
if (!wasCompleted && isCompleted) { await recalculateProgress(tx, userId, courseId); }
```

---

## 3. React Native: component, hook, style

### 3.1 Route mỏng, màn hình ở `features`

Route trong `app/` chỉ lấy params và render Screen (ví dụ ở 2.4). Logic, hook, state của màn hình nằm trong `features/<x>/screens/`.

```tsx
// ❌ route chứa dữ liệu và UI
export default function Page() {
  const [course, setCourse] = useState(null);
  useEffect(() => { axios.get('/courses/1').then((r) => setCourse(r.data)); }, []);
  return <Text>{course?.title}</Text>;
}
```

### 3.2 Cấu trúc một component

Thứ tự trong file: import → kiểu props → component → `StyleSheet` (hoặc file `.styles.ts` nếu dài). Props có kiểu tường minh; không truyền cả object DTO nếu chỉ dùng 2 trường trong component chung.

```tsx
// ✅ CourseCardHorizontal (rút gọn)
import { memo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';

import { AppText } from '@/components/ui/AppText';
import { colors, radius, spacing } from '@/theme';
import type { CourseSummary } from '@/types/api';
import { formatPrice } from '@/utils/formatPrice';

type Props = {
  course: CourseSummary;
  onPress: (id: string) => void;
};

function CourseCardHorizontalBase({ course, onPress }: Props) {
  const handlePress = useCallback(() => onPress(course.id), [onPress, course.id]);
  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${course.title}, ${formatPrice(course.priceCents)}`}
      style={styles.card}
    >
      <Image source={course.thumbnailUrl} cachePolicy="memory-disk" style={styles.thumb} />
      <View style={styles.body}>
        <AppText variant="title" numberOfLines={2}>{course.title}</AppText>
        <AppText variant="caption" color="textMuted">{course.teacher.fullName}</AppText>
        <AppText variant="title" weight="bold" color="primary">{formatPrice(course.priceCents)}</AppText>
      </View>
    </Pressable>
  );
}

export const CourseCardHorizontal = memo(CourseCardHorizontalBase);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  thumb: { width: 96, height: 96, borderRadius: radius.md },
  body: { flex: 1, gap: spacing.xs },
});
```

### 3.3 Style và token

- `StyleSheet.create` + token từ `src/theme`. **Không** inline style trừ giá trị động. Không hard-code màu/cỡ chữ/spacing.
- Chữ luôn qua `AppText`; không dùng `<Text>` trần trong màn hình.

```tsx
// ❌ hard-code, inline, Text trần
<Text style={{ color: '#00BDD6', fontSize: 14, marginTop: 13 }}>View more</Text>

// ✅ token + AppText
<AppText variant="body" weight="medium" color="primary" style={styles.viewMore}>
  {STRINGS.common.viewMore}
</AppText>
// styles.viewMore = { marginTop: spacing.md }
```

```tsx
// ❌ chuỗi hiển thị rải rác
<Button label="Add to cart" />
// ✅ tập trung ở constants/strings.ts
<Button label={STRINGS.course.addToCart} />
```

### 3.4 Hook và effect

- Hook chỉ gọi ở cấp cao nhất của component/hook; tên `useXxx`.
- **Không** dùng `useEffect` để fetch dữ liệu — dùng TanStack Query. `useEffect` chỉ cho đồng bộ với hệ thống ngoài (AppState, NetInfo, timer) và **luôn dọn dẹp**.
- Dependency array đầy đủ (`react-hooks/exhaustive-deps` = error).

```tsx
// ❌ fetch trong effect, thiếu cleanup, thiếu dependency
useEffect(() => {
  fetchCourse(id).then(setCourse);
}, []);

// ✅ hook truy vấn
const { data, isLoading, isError, refetch } = useCourseDetail(courseId);

// ✅ effect với hệ thống ngoài có cleanup
useEffect(() => {
  const sub = AppState.addEventListener('change', (state) => {
    if (state !== 'active') flushProgress();
  });
  return () => sub.remove();
}, [flushProgress]);
```

- Giá trị tính từ props/state thì tính trực tiếp hoặc `useMemo`, không copy vào state rồi đồng bộ bằng effect.

### 3.5 Đủ 4 trạng thái (loading, error, empty, success)

Mọi màn có dữ liệu xử lý đủ 4 trạng thái; skeleton **cùng hình dạng** với nội dung thật; lỗi có nút Retry.

```tsx
// ❌ chỉ xử lý success
function CartScreen() {
  const { data } = useCart();
  return <CartList items={data.items} />; // crash khi data undefined
}

// ✅
function CartScreen() {
  const { data, isLoading, isError, error, refetch } = useCart();

  if (isLoading) return <CartSkeleton />;
  if (isError) return <ErrorState error={error} onRetry={refetch} />;
  if (data.items.length === 0) {
    return <EmptyState icon="shopping-cart" title={STRINGS.cart.empty} actionLabel={STRINGS.common.exploreCourses} onAction={goExplore} />;
  }
  return <CartList items={data.items} total={data.totalCents} />;
}
```

### 3.6 Danh sách và ảnh

- Danh sách > 20 item dùng `FlashList` (`estimatedItemSize`, `keyExtractor` ổn định theo `id`); `renderItem` bọc `useCallback`, item bọc `React.memo`.
- Ảnh luôn `expo-image` với `cachePolicy="memory-disk"`, có `placeholder`/`transition`.

```tsx
// ❌ FlatList, key theo index, render inline, Image của RN
<FlatList data={items} renderItem={({ item }) => <Card course={item} />} keyExtractor={(_, i) => String(i)} />

// ✅
const renderItem = useCallback(
  ({ item }: ListRenderItemInfo<CourseSummary>) => (
    <CourseCardHorizontal course={item} onPress={openCourse} />
  ),
  [openCourse],
);
<FlashList
  data={courses}
  renderItem={renderItem}
  keyExtractor={keyExtractor}
  estimatedItemSize={136}
  onEndReached={hasNextPage ? fetchNextPage : undefined}
/>
```

### 3.7 Bảo đảm hệ thống và trợ năng

| Quy tắc | Cách làm |
|---|---|
| Touch target ≥ 48 dp / 44 pt | Icon 24 → `hitSlop={12}`; nút `sm` 36 → `hitSlop` dọc 6 |
| Nhãn cho nút chỉ có icon | `accessibilityLabel` bắt buộc |
| Vai trò, trạng thái | `accessibilityRole`, `accessibilityState={{ selected }}` (tab, chip, radio) |
| Safe area | `react-native-safe-area-context` (`SafeAreaView`/`useSafeAreaInsets`) |
| Bàn phím | `KeyboardAvoidingView`/`KeyboardAwareScrollView`, `returnKeyType`, `autoComplete` |
| Cỡ chữ hệ thống | Không tắt `allowFontScaling`; dùng `minHeight` thay `height` cố định cho nút/hàng |
| Back hệ thống | Không chặn Back trừ khi đang xử lý thanh toán |

```tsx
// ❌ icon nhỏ, không nhãn
<Pressable onPress={onRemove}><Feather name="trash-2" size={16} /></Pressable>

// ✅
<IconButton icon="trash-2" size={24} accessibilityLabel={`Remove ${title} from cart`} onPress={onRemove} />
```

### 3.8 Form (react-hook-form + zod)

```tsx
const schema = z
  .object({
    fullName: z.string().trim().min(2).max(60),
    email: z.string().trim().email(),
    password: z.string().min(8).regex(/[A-Za-z]/).regex(/\d/),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match',
  });
type RegisterForm = z.infer<typeof schema>;

const { control, handleSubmit, setError } = useForm<RegisterForm>({ resolver: zodResolver(schema) });
```

- Lỗi hiển thị **dưới từng field**; nút disable + spinner khi đang gửi; lỗi server ánh xạ vào field bằng `details[].field`:

```ts
function applyServerErrors(error: AppError, setError: UseFormSetError<RegisterForm>) {
  if (error.code === 'EMAIL_TAKEN') setError('email', { message: STRINGS.auth.emailTaken });
  error.fieldErrors().forEach(({ field, message }) => setError(field as keyof RegisterForm, { message }));
}
```

---

## 4. TanStack Query và Zustand

### 4.1 Luồng bắt buộc: `api.ts` → `hooks.ts` → component

Component **không** gọi axios; hàm HTTP nằm ở `api.ts`; `useQuery/useMutation` nằm ở `hooks.ts`; key lấy từ `queryKeys.ts` (factory).

```ts
// ❌ component gọi axios, key viết tay rải rác
const { data } = useQuery({ queryKey: ['course', id], queryFn: () => axios.get(`${BASE}/courses/${id}`) });

// ✅ features/course/api.ts
export async function fetchCourseDetail(id: string): Promise<CourseDetail> {
  const res = await apiClient.get<{ data: CourseDetail }>(`/courses/${id}`);
  return res.data.data;
}
// ✅ features/course/hooks.ts
export function useCourseDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.course(id),
    queryFn: () => fetchCourseDetail(id),
    staleTime: 5 * 60 * 1000,
    meta: { persist: true },
  });
}
```

- `staleTime`, `meta.persist` theo bảng ở [SDS §4.5](../02-design/SDS.md#45-state-và-cache).
- `enabled` khi phụ thuộc điều kiện (`enabled: Boolean(courseId)`).
- Truyền `signal` vào request để huỷ khi key đổi (tìm kiếm).

### 4.2 Danh sách vô hạn

```ts
export function useCourseSearch(params: CourseListParams) {
  return useInfiniteQuery({
    queryKey: queryKeys.coursesList(params),
    queryFn: ({ pageParam, signal }) => fetchCourses({ ...params, page: pageParam, limit: 20 }, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined),
    staleTime: 2 * 60 * 1000,
  });
}
```

### 4.3 Mutation thường và invalidate

```ts
// ❌ quên đồng bộ cache sau khi ghi
const addToCart = useMutation({ mutationFn: (id: string) => postCartItem(id) });

// ✅ cập nhật cache liên quan
export function useAddToCart() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: postCartItem,
    onSuccess: (cart, courseId) => {
      queryClient.setQueryData(queryKeys.cart(), cart);
      void queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId) });
    },
  });
}
```

Lưu ý khớp **tiền tố**: `invalidateQueries({ queryKey: ['me'] })` cũng làm mới `['me','courses',…]`; dùng `exact: true` khi chỉ cần một key.

### 4.4 Optimistic update và rollback (bookmark)

Mutation dạng toggle (bookmark, like, follow) **bắt buộc** optimistic + rollback khi lỗi (CLAUDE.md §7).

```ts
// ❌ chờ server mới đổi icon; hoặc đổi UI nhưng không rollback
const toggle = useMutation({ mutationFn: (c: Course) => c.isBookmarked ? removeBookmark(c.id) : addBookmark(c.id) });

// ✅ features/course/hooks.ts
type ToggleBookmarkInput = { courseId: string; isBookmarked: boolean }; // trạng thái HIỆN TẠI

export function useToggleBookmark() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ courseId, isBookmarked }: ToggleBookmarkInput) =>
      isBookmarked ? removeBookmark(courseId) : addBookmark(courseId),

    onMutate: async ({ courseId, isBookmarked }) => {
      // 1. Hủy refetch đang chạy để không ghi đè giá trị lạc quan
      await queryClient.cancelQueries({ queryKey: ['courses'] });
      await queryClient.cancelQueries({ queryKey: queryKeys.home() });
      await queryClient.cancelQueries({ queryKey: queryKeys.course(courseId) });

      // 2. Chụp snapshot mọi cache sẽ sửa
      const snapshots = [
        ...queryClient.getQueriesData({ queryKey: ['courses'] }),
        ...queryClient.getQueriesData({ queryKey: queryKeys.home() }),
        ...queryClient.getQueriesData({ queryKey: queryKeys.course(courseId) }),
      ];

      // 3. Cập nhật lạc quan trên MỌI cache chứa khóa này
      patchBookmarkEverywhere(queryClient, courseId, !isBookmarked);
      return { snapshots };
    },

    onError: (_error, _vars, context) => {
      // Khôi phục snapshot rồi báo lỗi
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data));
      showToast({ message: STRINGS.common.saveFailed, tone: 'error' });
    },

    onSettled: (_data, _error, { courseId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.meStats() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.meBookmarks() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.course(courseId) });
    },
  });
}
```

- Offline: `onlineManager` chặn mutation ghi kèm toast "You're offline" (ngoại lệ duy nhất: tiến độ video — [SDS ADR-16](../02-design/SDS.md#adr-16-bổ-sung--ngoại-lệ-offline-cho-tiến-độ-video)).
- Hook toggle dùng chung do C viết một lần; màn hình khác **không** tự viết lại.

### 4.5 Zustand: chỉ client state

- Chỉ giữ **client state**: phiên đăng nhập (`authStore`), bộ lọc tìm kiếm tạm (`searchFilterStore`). **Không** copy dữ liệu API vào store.
- Dùng selector, không lấy cả store (tránh render thừa). Action nằm trong store. Token lưu **SecureStore**, không AsyncStorage.

```ts
// ❌ copy dữ liệu server vào Zustand; lấy cả store
const useStore = create((set) => ({ courses: [], fetchCourses: async () => set({ courses: await api.get('/courses') }) }));
const { courses, user, cart } = useStore();

// ✅ store nhỏ, selector, đọc ngoài React bằng getState()
type AuthState = {
  status: 'loading' | 'authenticated' | 'unauthenticated';
  token: string | null;
  user: UserDto | null;
  login: (token: string, user: UserDto) => Promise<void>;
  logout: () => Promise<void>;
};
export const useAuthStore = create<AuthState>()((set) => ({
  status: 'loading',
  token: null,
  user: null,
  login: async (token, user) => { await secureStorage.setToken(token); set({ token, user, status: 'authenticated' }); },
  logout: async () => { await secureStorage.clearToken(); queryClient.clear(); set({ token: null, user: null, status: 'unauthenticated' }); },
}));

const isLoggedIn = useAuthStore((s) => s.status === 'authenticated'); // selector
const token = useAuthStore.getState().token;                            // trong interceptor
```

---
## 5. Backend: phân lớp

### 5.1 Quy tắc bắt buộc (CLAUDE.md §8)

| Tầng | Được làm | Không được làm |
|---|---|---|
| **routes** (`*.routes.ts`) | Khai báo path + chuỗi middleware + gọi controller | Logic nghiệp vụ, truy cập Prisma |
| **controller** (`*.controller.ts`) | Đọc `req` (đã validate), gọi **một** service, trả `res` (`{ data, meta }`) | Truy cập Prisma, quy tắc nghiệp vụ, try/catch che lỗi |
| **service** (`*.service.ts`) | Quy tắc nghiệp vụ, **dùng Prisma**, transaction, cache, ném `ApiError` | Dùng `req/res/next` |
| **schema** (`*.schema.ts`) | Schema zod cho body/query/params, kiểu suy ra | Logic khác |

REST: danh từ số nhiều, kebab-case (`/courses/:id/reviews`); mã trạng thái theo [api-spec §1.6](../02-design/api-spec.md#16-status-code); thành công `{ "data": …, "meta"?: … }`; lỗi `{ "error": { "code", "message", "details"? } }`.

### 5.2 Ví dụ: thêm khóa vào giỏ

```ts
// ❌ controller làm hết mọi việc: validate tay, Prisma, mã lỗi tự chế, trả chuỗi
export async function addItem(req: Request, res: Response) {
  if (!req.body.courseId) return res.status(400).send('missing courseId');
  const course = await prisma.course.findUnique({ where: { id: req.body.courseId } });
  if (!course) return res.status(404).json({ message: 'not found' });
  if (course.priceCents === 0) return res.status(400).json({ message: 'free' });
  await prisma.cartItem.create({ data: { userId: req.user.id, courseId: course.id } });
  res.send('ok');
}
```

```ts
// ✅ cart.routes.ts - chỉ khai báo
export const cartRouter = Router();
cartRouter.post('/items', requireAuth, validate({ body: addItemSchema }), cartController.addItem);

// ✅ cart.schema.ts
export const addItemSchema = z.object({ courseId: z.string().min(1).max(50) });
export type AddItemInput = z.infer<typeof addItemSchema>;

// ✅ cart.controller.ts - mỏng
export const cartController = {
  addItem: async (req: Request, res: Response) => {
    const { courseId } = req.validated.body as AddItemInput;
    const cart = await cartService.add(getUserId(req), courseId);
    res.status(201).json({ data: cart });
  },
};

// ✅ cart.service.ts - nghiệp vụ + Prisma + ApiError
export async function add(userId: string, courseId: string): Promise<CartDto> {
  const course = await prisma.course.findFirst({
    where: { id: courseId, isPublished: true },
    select: { id: true, priceCents: true },
  });
  if (!course) throw new ApiError(404, 'COURSE_NOT_FOUND', 'Course not found');
  await enrollmentService.assertNotEnrolled(userId, courseId);       // 409 ALREADY_ENROLLED (BR-06)
  if (course.priceCents === 0) {
    throw new ApiError(422, 'FREE_COURSE', 'Free courses cannot be added to the cart');
  }
  try {
    await prisma.cartItem.create({ data: { userId, courseId } });
  } catch (error) {
    if (isUniqueViolation(error)) throw new ApiError(409, 'ALREADY_IN_CART', 'Course is already in your cart');
    throw error;
  }
  return getCart(userId);
}
```

Express 5 tự chuyển lỗi của handler `async` sang `errorHandler`; nếu dùng Express 4 phải bọc `asyncHandler`. `getUserId(req)` là helper trả `req.user.id` hoặc ném `ApiError(401, 'UNAUTHORIZED')` (tránh dùng `req.user!`).

### 5.3 Prisma: truy vấn

```ts
// ❌ lấy cả bản ghi, N+1 truy vấn khi kiểm tra bookmark
const courses = await prisma.course.findMany({ where });
for (const c of courses) {
  c.isBookmarked = !!(await prisma.bookmark.findUnique({ where: { userId_courseId: { userId, courseId: c.id } } }));
}

// ✅ select đủ dùng + một truy vấn ghép cho cả trang
const courses = await prisma.course.findMany({ where, select: courseSummarySelect, orderBy, skip, take });
const bookmarked = userId
  ? await prisma.bookmark.findMany({ where: { userId, courseId: { in: courses.map((c) => c.id) } }, select: { courseId: true } })
  : [];
const bookmarkedIds = new Set(bookmarked.map((b) => b.courseId));
return courses.map((c) => toCourseSummary(c, bookmarkedIds.has(c.id)));
```

- **Chỉ service** import `prisma` (`@/lib/prisma`); ESLint chặn import trong controller/routes/middleware (trừ `requireEnrolled` gọi qua `EnrollmentService`).
- Dùng `select`/`include` có chủ đích; không trả `passwordHash`; DTO đi qua `mappers.ts`.
- Sắp xếp luôn kèm khóa phụ `id` để phân trang ổn định. `limit` tối đa 50.
- Tiền là `priceCents` (Int), thời lượng `durationSec` (Int), ID `cuid()`, thời gian ISO 8601 UTC.

### 5.4 Transaction và bộ đếm denormalize

Thao tác ghi nhiều bảng dùng `prisma.$transaction`; bộ đếm cập nhật **trong cùng transaction** bằng phép tăng nguyên tử; xóa cache **sau khi commit**.

```ts
// ❌ ghi rời rạc: lỗi giữa chừng để lại đơn nửa vời; đọc-rồi-ghi gây race condition
const order = await prisma.order.create({ data: { userId, totalCents } });
const course = await prisma.course.findUnique({ where: { id } });
await prisma.course.update({ where: { id }, data: { enrollmentCount: course!.enrollmentCount + 1 } });

// ✅ một transaction, increment nguyên tử, notify dùng cùng tx
const result = await prisma.$transaction(async (tx) => {
  const order = await tx.order.create({ data: { userId, totalCents, status: 'PAID', paymentMethod, paidAt: new Date() } });
  await tx.enrollment.createMany({ data: courseIds.map((courseId) => ({ userId, courseId })) });
  await tx.course.updateMany({ where: { id: { in: courseIds } }, data: { enrollmentCount: { increment: 1 } } });
  await tx.cartItem.deleteMany({ where: { userId } });
  await notificationService.notify(tx, userId, 'ORDER_PAID', { courseId: courseIds[0] });
  return order;
});
cache.del('home:public'); // sau khi commit
```

Toggle idempotent: chỉ đổi bộ đếm khi dòng quan hệ **thực sự** thay đổi.

```ts
const created = await tx.bookmark.createMany({ data: [{ userId, courseId }], skipDuplicates: true });
// created.count === 0 nghĩa là đã tồn tại -> không đổi gì thêm
```

### 5.5 Thay đổi CSDL

- Chỉ qua `npx prisma migrate dev --name <ten_migration>`; **không sửa DB tay**; commit thư mục `migrations/`; **1 migration / PR**; người sửa `schema.prisma` báo A.
- Đổi schema/endpoint thì cập nhật [database.md](../02-design/database.md) và [api-spec.md](../02-design/api-spec.md) **trong cùng PR** (CLAUDE.md §8, §13).
- Seed idempotent (xóa đúng thứ tự phụ thuộc rồi tạo lại), tính lại mọi cột denormalize.

---

## 6. zod và validate

Mọi input (body, query, params) validate bằng **zod** qua middleware `validate(schema)`. Không kiểm tra thủ công `if (!req.body.x)`. Thông điệp lỗi bằng tiếng Anh, ngắn gọn.

```ts
// ❌ validate tay, ép kiểu, không chuẩn hóa
const page = parseInt(req.query.page as string) || 1;
const limit = Math.min(Number(req.query.limit) || 20, 50);
const isFree = req.query.isFree === 'true' ? true : req.query.isFree === 'false' ? false : undefined;
```

```ts
// ✅ course.schema.ts
import { z } from 'zod';
import { paginationQuery } from '@/lib/pagination';

export const listCoursesQuery = paginationQuery
  .extend({
    q: z.string().trim().min(1).max(100).optional(),
    categoryId: z
      .string()
      .transform((value) => value.split(',').filter(Boolean))
      .pipe(z.array(z.string().min(1)).max(6))
      .optional(),
    isFree: z.enum(['true', 'false']).transform((value) => value === 'true').optional(),
    minPrice: z.coerce.number().int().min(0).optional(),   // cent
    maxPrice: z.coerce.number().int().min(0).optional(),   // cent
    minRating: z.coerce.number().min(0).max(5).optional(),
    sort: z.enum(['popular', 'rating', 'newest', 'price_asc', 'price_desc']).default('popular'),
    section: z.enum(['popular', 'recommended', 'inspires']).optional(),
  })
  .refine((v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice, {
    path: ['maxPrice'],
    message: 'maxPrice must be greater than or equal to minPrice',
  });
export type ListCoursesQuery = z.infer<typeof listCoursesQuery>;

// ✅ course.routes.ts
courseRouter.get('/', optionalAuth, validate({ query: listCoursesQuery }), courseController.list);
```

Quy tắc:

- `z.coerce` cho query/params dạng chuỗi; boolean query là `'true' | 'false'` rồi `transform`.
- Chuẩn hóa: `trim()` cho chuỗi, `toLowerCase()` cho email; giới hạn `max()` cho mọi chuỗi và mảng.
- Kiểu request suy từ schema bằng `z.infer` — không khai báo kiểu tay song song với schema.
- Schema dùng chung (`paginationQuery`, `idParam`) đặt ở `lib/`; dùng lại, không copy.
- Phía mobile: schema form ở cùng feature, cùng luật với server (mật khẩu ≥ 8 ký tự có chữ và số...); thông điệp lỗi hiển thị dưới field.
- Kích thước tệp upload kiểm tra ở **cả** client (thông báo sớm) và server (multer `limits`).

---

## 7. Xử lý lỗi và logging

### 7.1 Server: `ApiError` tập trung

- Service/middleware **ném** `new ApiError(status, code, message, details?)`; `errorHandler` (cuối chuỗi) biến thành `{ error: { code, message, details } }`; **không** trả stack trace.
- Dùng mã trong [api-spec §5](../02-design/api-spec.md#5-mã-lỗi); mã mới phải thêm vào api-spec (và PLAN §9.4).
- `catch` chỉ khi có việc cụ thể (map lỗi Prisma `P2002` sang `ALREADY_IN_CART`...) và **ném lại** phần còn lại.

```ts
// ❌ nuốt lỗi; ném Error thường (thành 500); trả stack; mã trạng thái tự chế
try {
  await service.doIt();
} catch (e) {
  res.status(500).json({ message: (e as Error).message, stack: (e as Error).stack });
}
throw new Error('course not found');

// ✅ ném ApiError đúng mã; để errorHandler xử lý
throw new ApiError(404, 'COURSE_NOT_FOUND', 'Course not found');
throw new ApiError(403, 'NOT_ENROLLED', 'Enroll to access this content');
```

```ts
// ✅ errorHandler (rút gọn)
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  if (err instanceof ApiError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  req.log.error({ err }, 'Unhandled error');
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' } });
};
```

### 7.2 Mobile: `AppError` và hiển thị

- `apiClient` chuẩn hóa mọi lỗi thành `AppError { code, status, message, details }`; UI rẽ nhánh theo **`code`**, không theo `message`.
- Truy vấn lỗi → `ErrorState` + Retry; mutation lỗi → `Toast` hoặc lỗi dưới field; 401 → đăng xuất tự động.
- Trong `catch` luôn `error: unknown` rồi thu hẹp.

```ts
// ❌ any, alert, nuốt lỗi im lặng
try { await login(values); } catch (e: any) { alert(e.message); }
try { await save(); } catch {}

// ✅ thu hẹp kiểu, phản hồi đúng ngữ cảnh
try {
  await login(values);
} catch (error: unknown) {
  if (error instanceof AppError && error.code === 'INVALID_CREDENTIALS') {
    setFormError(STRINGS.auth.invalidCredentials);
    return;
  }
  showToast({ message: getErrorMessage(error), tone: 'error' });
}
```

- Không hiện mã lỗi kỹ thuật cho người dùng; thông điệp thân thiện tiếng Anh ở `constants/strings.ts` (bảng ở [SDS §4.6](../02-design/SDS.md#46-xử-lý-lỗi)).
- `ErrorBoundary` ở root bắt lỗi render.

### 7.3 Logging

| Nơi | Quy tắc |
|---|---|
| Server | Dùng `logger` (pino) và `pino-http`; **không** `console.log`; không log password/token/body đăng nhập; lỗi 5xx ghi mức `error` kèm `req.id` |
| Mobile | Không `console.log` trong code commit; cần thì `if (__DEV__) console.warn(…)`; không log token, dữ liệu cá nhân |

```ts
// ❌
console.log('login', email, password, token);
// ✅ (server)
logger.info({ userId: user.id }, 'User logged in');
```

---

## 8. Kiểm thử

### 8.1 Quy ước

| Hạng mục | Quy tắc |
|---|---|
| Vị trí | Test cạnh file nguồn `xxx.test.ts(x)`; integration server ở `server/tests/integration/` |
| Tên test | Mô tả hành vi: `it('returns 403 when user is not enrolled')` |
| Cấu trúc | Arrange – Act – Assert; mỗi test một hành vi; không phụ thuộc thứ tự |
| Mã truy vết | Test case thủ công có ID `TC-<MODULE>-<số>` map về `FR-xx` (`docs/04-testing/test-cases.md`); test tự động ghi chú `TC-…` nếu có |
| Server | Mỗi service có unit test; mỗi endpoint chính có integration test (happy path + ≥ 1 lỗi); DB test riêng, `--runInBand` |
| Mobile | Test utils, hooks, component UI kit, logic màn quan trọng; **mock tầng `api.ts`**, không gọi mạng thật |
| Chỉ tiêu | Coverage services server ≥ 70 %; utils/hooks mobile ≥ 60 %; ≥ 30 test server; ≥ 15 test mobile |
| Merge | **Không merge khi test đỏ** |

### 8.2 Ví dụ

```ts
// ❌ tên mơ hồ, nhiều hành vi, phụ thuộc dữ liệu ngẫu nhiên
it('works', async () => {
  const r = await request(app).get('/api/v1/lessons/abc');
  expect(r.status).toBeDefined();
});

// ✅ integration (Supertest) - TC-SEC-01
describe('GET /api/v1/lessons/:id', () => {
  it('returns 403 NOT_ENROLLED and no videoUrl when the user is not enrolled', async () => {
    const { token } = await createUserAndLogin();
    const lesson = await createLesson({ isPreview: false });

    const res = await request(app)
      .get(`/api/v1/lessons/${lesson.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NOT_ENROLLED');
    expect(JSON.stringify(res.body)).not.toContain('videoUrl');
  });

  it('returns the lesson with videoUrl when it is a preview', async () => {
    const { token } = await createUserAndLogin();
    const lesson = await createLesson({ isPreview: true });

    const res = await request(app)
      .get(`/api/v1/lessons/${lesson.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.videoUrl).toMatch(/^https?:\/\//);
  });
});
```

```ts
// ✅ unit test hàm thuần (BR-10)
describe('discountPercent', () => {
  it('returns 20 when price is 80% of the original price', () => {
    expect(discountPercent({ priceCents: 5900, originalPriceCents: 7375 })).toBe(20);
  });
  it('returns null when there is no original price', () => {
    expect(discountPercent({ priceCents: 5900, originalPriceCents: null })).toBeNull();
  });
});
```

```tsx
// ✅ hook mobile với QueryClient thật + mock api.ts (TC-LRN-01, ...)
jest.mock('./api');

function makeWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}

it('rolls back the optimistic bookmark when the request fails', async () => {
  (addBookmark as jest.Mock).mockRejectedValue(new AppError({ code: 'INTERNAL_ERROR', status: 500, message: 'x' }));
  const client = createTestQueryClient();
  client.setQueryData(queryKeys.course('c1'), { ...courseFixture, isBookmarked: false });

  const { result } = renderHook(() => useToggleBookmark(), { wrapper: makeWrapper(client) });
  await act(async () => { await result.current.mutateAsync({ courseId: 'c1', isBookmarked: false }).catch(() => undefined); });

  expect(client.getQueryData<CourseDetail>(queryKeys.course('c1'))?.isBookmarked).toBe(false);
});
```

- Dữ liệu test dựng bằng factory (`server/tests/helpers/factories.ts`), không phụ thuộc seed.
- Không `it.skip`/`it.only` trong code commit. Test phải xác định (không phụ thuộc giờ, mạng, ngẫu nhiên — dùng fake timers khi cần).

---

## 9. Git, commit, Pull Request

### 9.1 Nhánh

`main` (bản ổn định/nộp) ← `develop` (tích hợp) ← `feature/<task-id>-<mô-tả-ngắn>`, `fix/…`, `docs/…`, `test/…`. Ví dụ: `feature/M-07-login-screen`, `docs/D-03-class-diagram`, `fix/BUG-012-cart-badge`. Rebase `develop` hằng ngày để giảm xung đột; PR nhỏ (1 task hoặc nhóm task nhỏ liên quan). Bảo vệ `main` và `develop`: cần PR + ≥ 1 review.

### 9.2 Commit (Conventional Commits)

Định dạng: `type(scope): subject` — tiếng Anh, thức mệnh lệnh, chữ thường, không dấu chấm cuối, ≤ 72 ký tự. `type` ∈ `feat`, `fix`, `docs`, `refactor`, `perf`, `test`, `chore`, `build`, `ci`, `style`; `scope` ∈ `mobile`, `server`, `docs`.

```text
# ❌
update
fixed bug
Added cart stuff!!!
feat: everything for sprint 3

# ✅
feat(mobile): add course card component
fix(server): return 404 for missing course
docs: add ERD and data dictionary
test(server): cover 403 NOT_ENROLLED on lesson access
refactor(mobile): extract useToggleBookmark from CourseCard
```

- Thân commit (tùy chọn) giải thích **vì sao**; footer ghi task: `Refs: M-07`.
- Commit có sự hỗ trợ của Claude giữ nguyên dòng `Co-Authored-By` do công cụ thêm.
- **Không commit:** `node_modules/`, `.env*` (trừ `.env.example`), `uploads/`, `SubProjects.tar`, build output, `*.apk`, `.claude/settings.local.json`, secret. **Có commit:** `.claude/skills/`, `PRODUCT.md`, `DESIGN.md`, `prisma/migrations/`.
- Không commit/push khi chưa được yêu cầu (áp dụng cho Claude); không `git push --force` lên `main`/`develop`.

### 9.3 Pull Request

- **Một PR = một task** (hoặc nhóm task nhỏ liên quan); tiêu đề `type(scope): mô tả (TASK-ID)`; ghi task ID từ PLAN.md; liên kết issue (`Closes #n`).
- Có UI → đính **ảnh chụp màn hình thiết bị thật** (cạnh ảnh design nếu là polish).
- Review chéo (PLAN §3.1): PR server → A review (PR server của A → C); PR mobile → B review (PR mobile của B → C); PR tài liệu → một trong hai người còn lại. Review trong **24 giờ**, người review chạy thử nếu là UI, nhận xét cụ thể và lịch sự.
- Merge vào `develop` bằng **squash and merge** (giữ lịch sử gọn); `develop` → `main` khi phát hành; tick `[x]` task trong PLAN.md sau khi merge.

```markdown
<!-- .github/pull_request_template.md -->
## Task
<!-- ID trong PLAN.md, ví dụ M-07. Closes #n -->

## Thay đổi
<!-- Tóm tắt ngắn: làm gì, vì sao -->

## Ảnh chụp / video (nếu có UI)

## Checklist (Definition of Done - CLAUDE.md §13)
- [ ] Đúng chức năng và tiêu chí chấp nhận trong PLAN.md / SRS
- [ ] UI khớp design (màu, font, khoảng cách, icon); đủ trạng thái loading / empty / error
- [ ] (Có màn hình) đã chạy `/impeccable audit <màn>` 1 vòng, không còn lỗi P0/P1
- [ ] `typecheck` + `lint` sạch; test liên quan viết mới và pass (kèm kết quả)
- [ ] Đã chạy thử trên Expo Go (Android; iOS nếu có máy)
- [ ] Đã cập nhật tài liệu liên quan (api-spec, database, test cases)
- [ ] Không có secret, `console.log`, code chết
```

---

## 10. Cấu hình ESLint, Prettier, TypeScript

> Cấu hình **đề xuất** cho M-01 (mobile) và S-01 (server); điều chỉnh theo phiên bản ESLint/Expo/Prisma cài thực tế. ESLint ≥ 9 dùng *flat config* (`eslint.config.js`); PLAN nêu `.eslintrc.*` (ESLint 8) — nội dung quy tắc tương đương. Các gói dev cần thêm ngoài danh sách PLAN: `eslint-plugin-simple-import-sort` (CLAUDE.md §6 yêu cầu ESLint tự sắp xếp import), `typescript-eslint`, `eslint-config-prettier`, (server) `tsc-alias` để alias `@/` chạy được sau `tsc` — ghi lý do vào PLAN khi cài (CLAUDE.md §11.4).

### 10.1 Prettier, EditorConfig (dùng chung mobile và server)

```json
// .prettierrc
{
  "tabWidth": 2,
  "useTabs": false,
  "singleQuote": true,
  "semi": true,
  "printWidth": 100,
  "trailingComma": "all",
  "endOfLine": "lf"
}
```

```ini
# .editorconfig
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true

[*.md]
trim_trailing_whitespace = false
```

```text
# .prettierignore
node_modules
dist
.expo
coverage
prisma/migrations
```

Repo có `.gitattributes` với `* text=auto eol=lf` để giữ LF trên Windows.

### 10.2 ESLint - mobile

```js
// mobile/eslint.config.js
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const tseslint = require('typescript-eslint');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const prettier = require('eslint-config-prettier/flat');

module.exports = defineConfig([
  expoConfig,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: __dirname } },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      // TypeScript
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/naming-convention': [
        'warn',
        { selector: 'typeLike', format: ['PascalCase'] },
        { selector: 'interface', format: ['PascalCase'], custom: { regex: '^I[A-Z]', match: false } },
        { selector: 'variable', types: ['boolean'], format: ['PascalCase'], prefix: ['is', 'has', 'can', 'should'] },
      ],
      // Import
      'simple-import-sort/imports': ['error', { groups: [['^\\u0000'], ['^react', '^expo', '^@?\\w'], ['^@/'], ['^\\.']] }],
      'simple-import-sort/exports': 'error',
      'no-restricted-imports': ['error', { patterns: [{ group: ['../../../*'], message: 'Dùng alias @/ thay cho đường dẫn tương đối quá 2 cấp' }] }],
      // React
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      // Chung
      'no-console': ['error', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always'],
      'prefer-const': 'error',
      'no-var': 'error',
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Component: <= ~200 dòng
    files: ['src/**/*.tsx'],
    rules: {
      'max-lines': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['warn', { max: 200, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Chỉ named export, trừ file route trong app/
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': ['error', { selector: 'ExportDefaultDeclaration', message: 'Dùng named export (chỉ file route trong app/ được default export)' }],
    },
  },
  {
    // Component không gọi axios trực tiếp: chỉ apiClient
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/lib/apiClient.ts'],
    rules: { 'no-restricted-imports': ['error', { paths: [{ name: 'axios', message: 'Gọi API qua features/<x>/api.ts (dùng lib/apiClient)' }] }] },
  },
  {
    files: ['**/*.test.{ts,tsx}'],
    rules: { 'max-lines-per-function': 'off', '@typescript-eslint/no-unsafe-assignment': 'off' },
  },
  prettier,
]);
```

### 10.3 ESLint - server

```js
// server/eslint.config.mjs
import tseslint from 'typescript-eslint';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import prettier from 'eslint-config-prettier/flat';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'prisma/migrations'] },
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    plugins: { 'simple-import-sort': simpleImportSort },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/ban-ts-comment': ['error', { 'ts-ignore': true, 'ts-expect-error': 'allow-with-description' }],
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      'simple-import-sort/imports': ['error', { groups: [['^\\u0000'], ['^@?\\w'], ['^@/'], ['^\\.']] }],
      'no-console': 'error', // dùng logger (pino)
      eqeqeq: ['error', 'always'],
      'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // Chỉ service (và lib/prisma, seed, tests) được dùng Prisma
    files: ['src/modules/**/*.{controller,routes,schema}.ts', 'src/middlewares/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: [{ name: '@/lib/prisma', message: 'Chỉ service được dùng Prisma. Gọi qua service' }] }],
    },
  },
  {
    files: ['**/*.test.ts', 'tests/**/*.ts', 'prisma/seed.ts'],
    rules: { 'max-lines-per-function': 'off', 'no-console': 'off' },
  },
  prettier,
);
```

### 10.4 tsconfig

```jsonc
// mobile/tsconfig.json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["**/*.ts", "**/*.tsx", ".expo/types/**/*.ts", "expo-env.d.ts"]
}
```

```jsonc
// server/tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "moduleResolution": "Node",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": ".",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "prisma/seed.ts", "tests"]
}
```

`npm run build` (server): `tsc -p tsconfig.build.json && tsc-alias -p tsconfig.build.json` (`tsconfig.build.json` chỉ include `src`) để `node dist/server.js` phân giải được alias `@/`. Jest: `moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' }`.

### 10.5 Scripts và VS Code

```jsonc
// package.json (mobile và server)
{
  "scripts": {
    "typecheck": "tsc --noEmit",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "test": "jest"
  }
}
```

```jsonc
// .vscode/settings.json (đề xuất, có thể commit)
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": { "source.fixAll.eslint": "explicit" },
  "files.eol": "\n",
  "typescript.preferences.importModuleSpecifier": "non-relative"
}
```

Chưa thêm `husky`/`lint-staged` vì ngoài danh sách công nghệ (CLAUDE.md §3); nếu nhóm muốn chạy `lint`/`typecheck` trước khi commit hoặc CI (GitHub Actions - PLAN §16.3) thì ghi lý do vào PLAN §22 trước.

---

## 11. Checklist review PR

**Người tạo PR tự kiểm trước khi xin review; người review kiểm lại:**

- [ ] **Phạm vi:** đúng task ID, không kèm thay đổi ngoài phạm vi; PR nhỏ.
- [ ] **Kiến trúc:** đúng phân lớp (mobile: screen → hook → api → apiClient; server: routes → controller → service → Prisma); Prisma chỉ ở service; route mobile mỏng.
- [ ] **Kiểu:** không `any`, không `@ts-ignore`; DTO khớp `api-spec.md`; `import type` cho kiểu.
- [ ] **Quy ước:** đặt tên đúng; named export; alias `@/`; hàm ≤ ~50 dòng, component ≤ ~200 dòng; không `console.log`; không hard-code màu/cỡ chữ/URL/secret.
- [ ] **Dữ liệu:** query key từ `queryKeys.ts`; toggle có optimistic + rollback; invalidate đủ key liên quan; không copy dữ liệu API vào Zustand.
- [ ] **UI:** khớp design (màu, font, khoảng cách, icon); đủ loading / error(Retry) / empty / success; touch target ≥ 48 dp; safe area; `accessibilityLabel`; chữ scale được.
- [ ] **Server:** mọi input qua `validate(zod)`; lỗi ném `ApiError` đúng mã; thao tác ghi nhiều bảng trong transaction; bộ đếm cập nhật cùng transaction; kiểm tra ghi danh ở server; không lộ stack/`passwordHash`.
- [ ] **CSDL:** thay đổi qua migration (1 migration/PR); đã cập nhật `database.md`; seed vẫn chạy lại được.
- [ ] **Test:** test mới cho logic mới (happy path + ≥ 1 lỗi); tên test mô tả hành vi; `typecheck`, `lint`, `test` đều xanh (đính kết quả thật).
- [ ] **Tài liệu:** đã cập nhật `api-spec.md` / `database.md` / test cases khi đụng API/DB; task đã tick trong PLAN.md sau merge.
- [ ] **Git:** commit theo Conventional Commits; không commit `.env`, `uploads/`, `*.apk`, `node_modules/`.
