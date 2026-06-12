// Mock data cho KOC module – sẽ thay bằng Supabase query khi migrate xong.

export type LeadStage =
  | "from_choi"
  | "cho_duyet_lien_he"
  | "da_duyet_lien_he"
  | "cho_duyet_hop_tac"
  | "da_chot_booking";

export type BookingStatus = "WIN" | "HIEU_QUA" | "NUOI" | "TEST" | "DUNG" | "SPAM";

export const STAGE_LABEL: Record<LeadStage, string> = {
  from_choi: "Từ chối",
  cho_duyet_lien_he: "Chờ duyệt liên hệ",
  da_duyet_lien_he: "Đã duyệt – đang liên hệ",
  cho_duyet_hop_tac: "Chờ duyệt hợp tác",
  da_chot_booking: "Đã chốt → Booking",
};

export const STATUS_LABEL: Record<BookingStatus, string> = {
  WIN: "Win",
  HIEU_QUA: "Hiệu quả",
  NUOI: "Nuôi",
  TEST: "Test",
  DUNG: "Dừng",
  SPAM: "Spam",
};

export const overview = {
  periodLabel: "01/01/2025 → 11/06/2026",
  gmv: 848_900_000,
  gmvTargetMonthly: 4_300_000_000,
  gmvDelta: 0.182,
  totalOrders: 6576,
  ordersDelta: 0.094,
  leadsToProcess: 2,
  leadsDelta: -0.5,
  videoWin: 1,
  videoWinDelta: 0,
  gmvByWeek: [
    { w: "T19", v: 32 },
    { w: "T20", v: 38 },
    { w: "T21", v: 36 },
    { w: "T22", v: 54 },
  ],
  gmvByMember: [
    { name: "Phương Anh", value: 612, color: "#ef4444" },
    { name: "Mỹ Duyên", value: 187, color: "#f59e0b" },
    { name: "Khác", value: 49, color: "#94a3b8" },
  ],
  topWin: [
    { rank: 1, koc: "_hoimatngu", product: "Actiso Viet", orders: 254, gmv: 37_917_134, status: "WIN" as BookingStatus },
    { rank: 2, koc: "vlogminhhai", product: "Actiso Viet", orders: 8, gmv: 1_732_616, status: "HIEU_QUA" as BookingStatus },
  ],
};

export const leads: Array<{
  id: string; koc: string; sub: string; product: string; tier: string;
  follow?: string; member: string; stage: LeadStage; cast?: number; video?: number; sample?: string;
}> = [
  { id: "1", koc: "Edrf", sub: "Qssd · Mẹ bé/Gia đình", product: "Laforin Baby", tier: "Nano", member: "Phương Anh", stage: "from_choi" },
  { id: "2", koc: "thaiduideptrai", sub: "Nguyễn Ngọc Thái · Nam giới/Thể thao", product: "Actiso Viet", tier: "Macro", follow: "504.4K", member: "Mỹ Duyên", stage: "da_chot_booking", video: 1, sample: "Duyệt mẫu" },
  { id: "3", koc: "bacsithienthuocthang", sub: "Bác Sĩ Thiện Thuốc Thang", product: "Laforin Formen", tier: "Micro", follow: "11.1K", member: "Phương Anh", stage: "cho_duyet_hop_tac", cast: 250_000, video: 1, sample: "Duyệt mẫu" },
  { id: "4", koc: "congtiep1991", sub: "Công Tiếp · Nam giới/Thể thao", product: "DTP-Omega 3", tier: "Micro", follow: "44.3K", member: "Phương Anh", stage: "cho_duyet_hop_tac", cast: 500_000, video: 1, sample: "Duyệt mẫu" },
  { id: "5", koc: "haygianchong", sub: "Nhà Của Bích · Sale/SLL", product: "Actiso Viet", tier: "Micro", follow: "17.6K", member: "Mỹ Duyên", stage: "da_duyet_lien_he" },
];

export const bookings: Array<{
  id: string; koc: string; sub: string; product: string; tier: string;
  enteredAt: string; approvedAt: string; bookedAt: string; aired: boolean;
  videos: number; orders: number; ordersPerWeek: number; ordersPerVideo: number;
  gmv: number; status: BookingStatus; member: string;
}> = [
  { id: "b1", koc: "meton.nuoiconnl", sub: "Mẹ Tôn Nuôi Con", product: "Laforin Baby_cam", tier: "Nano", enteredAt: "2025-07-22 09:14", approvedAt: "2025-07-22", bookedAt: "2025-07-23", aired: true, videos: 2, orders: 2530, ordersPerWeek: 56.4, ordersPerVideo: 1265, gmv: 256_840_781, status: "HIEU_QUA", member: "Phương Anh" },
  { id: "b2", koc: "_hoimatngu", sub: "", product: "Actiso Viet", tier: "Micro", enteredAt: "2025-08-09 14:02", approvedAt: "2025-08-09", bookedAt: "2025-08-10", aired: true, videos: 7, orders: 3061, ordersPerWeek: 70.7, ordersPerVideo: 437.3, gmv: 483_316_429, status: "HIEU_QUA", member: "Phương Anh" },
  { id: "b3", koc: "mebinh.fulltime", sub: "My Little Babies", product: "Laforin Baby_đào", tier: "Nano", enteredAt: "2025-07-31 10:20", approvedAt: "2025-07-31", bookedAt: "2025-08-01", aired: true, videos: 7, orders: 896, ordersPerWeek: 20.4, ordersPerVideo: 128, gmv: 99_359_274, status: "NUOI", member: "Phương Anh" },
  { id: "b4", koc: "meton.nuoiconnl", sub: "", product: "Laforin Baby_cam", tier: "Nano", enteredAt: "2025-07-15 16:40", approvedAt: "2025-07-15", bookedAt: "2025-07-16", aired: true, videos: 1, orders: 31, ordersPerWeek: 0.7, ordersPerVideo: 31, gmv: 3_640_977, status: "DUNG", member: "Phương Anh" },
  { id: "b5", koc: "vlogminhhai9x", sub: "", product: "Laforin Baby_cam", tier: "Micro", enteredAt: "2025-06-18 11:05", approvedAt: "2025-06-18", bookedAt: "2025-06-19", aired: true, videos: 1, orders: 58, ordersPerWeek: 1.2, ordersPerVideo: 58, gmv: 5_700_235, status: "TEST", member: "Phương Anh" },
];

export const formatVnd = (v: number) => v.toLocaleString("vi-VN") + "đ";
export const formatMillions = (v: number) => (v / 1_000_000).toLocaleString("vi-VN", { maximumFractionDigits: 1 }) + " triệu";
export const formatPct = (v: number) => (v >= 0 ? "+" : "") + (v * 100).toFixed(1) + "%";
