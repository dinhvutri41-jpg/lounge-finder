import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DisclaimerModal({
  open,
  onAccept,
}: {
  open: boolean;
  onAccept: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-fg/40" />
      <div className="relative w-full max-w-lg rounded-lg bg-surface p-6 shadow-card ring-1 ring-border sm:p-8">
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
            <Info className="size-5" />
          </span>
          <h2 className="text-lg font-semibold text-fg">Đôi lời trước khi dùng</h2>
        </div>
        <div className="mt-4 space-y-3 text-justify text-sm leading-relaxed text-muted">
          <p>
            Dữ liệu phòng chờ được lấy từ website LoungeKey (LinkCare VN). Máy chủ tự đồng bộ
            định kỳ với API tìm kiếm của LoungeKey; lần đầu sẽ dùng dữ liệu nền có sẵn.
          </p>
          <p>
            Để đảm bảo thông tin chính xác và cập nhật nhất, khi cần đối chiếu, vui lòng
            nhấn <strong className="text-fg">Xem link gốc</strong> tại phòng chờ tương ứng
            để kiểm tra trực tiếp trên website LoungeKey.
          </p>
          <p>Trân trọng cảm ơn!</p>
        </div>
        <Button className="mt-8 w-full" autoFocus onClick={onAccept}>
          Đồng ý
        </Button>
      </div>
    </div>
  );
}
