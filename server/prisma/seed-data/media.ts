/**
 * Ảnh / video / tài liệu dùng trong seed. KHÔNG tải file về repo: chỉ lưu URL công khai đã kiểm tra
 * bằng `curl -I` (HTTP 200). Ảnh Unsplash đã được xem thử bằng mắt để khớp chủ đề.
 */
import { env } from '../../src/config/env';

/** Ảnh Unsplash theo id (đã kiểm tra tồn tại + hợp chủ đề). */
export function unsplash(photoId: string, width = 600): string {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&q=80`;
}

/** Ảnh chân dung công khai của randomuser.me. */
export function portrait(gender: 'men' | 'women', n: number): string {
  return `https://randomuser.me/api/portraits/${gender}/${n}.jpg`;
}

/** Bảng ảnh Unsplash đã chọn (khóa = chủ đề). */
export const PHOTO = {
  codeLaptop: '1517694712202-14dd9538aa97',
  codeJs: '1461749280684-dccba630e2f6',
  codeJava: '1555066931-4365d14bab8c',
  codePython: '1526379095098-d400fd0bf935',
  codePhp: '1599507593499-a3f7d7d97667',
  dataDashboard: '1551288049-bebda4e38f71',
  analytics: '1460925895917-afdab827c52f',
  teamWhiteboard: '1557804506-669a67965ba0',
  teamLaptops: '1522071820081-009f0129c71c',
  tabletWireframe: '1586717791821-3f44a563fa4c',
  sketchWireframe: '1581291518857-4e27b48ff24e',
  monitorDesign: '1559028012-481c04fa702d',
  wireframePaper: '1522542550221-31fd19575a2d',
  laptopDesign: '1507238691740-187a5b1d37b8',
  deskFlatLay: '1497032628192-86f99bcd76bc',
  deskBright: '1593642632559-0c6d3fc62b89',
  phoneApps: '1512941937669-90a1b58e7e9c',
  phoneUi: '1551650975-87deedd944c3',
  phonesFlatLay: '1556656793-08538906a9f8',
  appIcons: '1611162617213-7d7a39e9b1d7',
  paintBrushes: '1513364776144-60967b0f800f',
  abstractPainting: '1541961017774-22349e4a1262',
  swatches: '1561070791-2526d30994b5',
  patternCorridor: '1502691876148-a84978e59af8',
  interiorChair: '1586023492125-27b2c045efd7',
  ribbons: '1607344645866-009c320b63e0',
  toteBag: '1544816155-12df9643f363',
  pencils: '1513542789411-b6a5d4f31634',
  portraitWoman: '1544005313-94ddf0286df2',
  loveToLearn: '1546410531-bb4caa6b424d',
  posters: '1626814026160-2237a95fc5a0',
  fountainPen: '1455390582262-044cdead277a',
  deskCoffee: '1499750310107-5fef28a66643',
  clapperboard: '1485846234645-a62644f84728',
  cinema: '1536440136628-849c177e76a1',
  videoEditing: '1492619375914-88005aa9e8fb',
  timeline: '1574717024653-61fd2cf4d44d',
  friendsTalking: '1543269865-cbf427effbad',
  travelMap: '1488646953014-85cb44e25828',
  lecture: '1524178232363-1fb2b075b655',
  studyDesk: '1501504905252-473c47e087f8',
  openBook: '1589998059171-988d887df646',
} as const;

export type Video = { url: string; durationSec: number; name: string };

/**
 * Clip MP4 mẫu công khai (kiểm tra HTTP 200; thời lượng đọc từ atom `mvhd` trong header MP4).
 * `durationSec` = thời lượng thật để logic hoàn thành 90 % (BR-03) đúng.
 * Nguồn: test-videos.co.uk (Big Buck Bunny / Jellyfish / Sintel, Blender Foundation, CC-BY),
 * MDN interactive-examples (CC0), download.blender.org (Sintel trailer, CC-BY).
 */
export const VIDEOS: readonly Video[] = [
  {
    name: 'Big Buck Bunny',
    url: 'https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/360/Big_Buck_Bunny_360_10s_1MB.mp4',
    durationSec: 10,
  },
  {
    name: 'Jellyfish',
    url: 'https://test-videos.co.uk/vids/jellyfish/mp4/h264/360/Jellyfish_360_10s_1MB.mp4',
    durationSec: 10,
  },
  {
    name: 'Sintel',
    url: 'https://test-videos.co.uk/vids/sintel/mp4/h264/360/Sintel_360_10s_1MB.mp4',
    durationSec: 10,
  },
  {
    name: 'Flower',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    durationSec: 5,
  },
  {
    name: 'Sintel trailer',
    url: 'https://download.blender.org/durian/trailer/sintel_trailer-480p.mp4',
    durationSec: 52,
  },
];

/** URL tuyệt đối của file trong `server/static/` (phục vụ bởi express.static tại /static). */
export function staticUrl(relativePath: string): string {
  const encoded = relativePath
    .split('/')
    .map((part) => encodeURIComponent(part))
    .join('/');
  return `${env.PUBLIC_BASE_URL}/static/${encoded}`;
}
