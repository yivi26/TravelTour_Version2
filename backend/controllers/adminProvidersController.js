import { getProviderStats, listProviders, updateProviderStatus } from "../models/adminProvidersModel.js";

export async function getAdminProvidersController(req, res) {
  try {
    const page = req.query.page ?? 1;
    const pageSize = req.query.pageSize ?? 7;
    const q = req.query.q ?? "";

    const [stats, list] = await Promise.all([
      getProviderStats(),
      listProviders({ page, pageSize, q })
    ]);

    res.json({
      stats,
      suppliers: list.suppliers,
      paging: list.paging
    });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Không tải được danh sách nhà cung cấp"
    });
  }
}

export async function patchAdminProviderStatusController(req, res) {
  try {
    const providerId = req.params.id;
    const status = req.body?.status;

    const updated = await updateProviderStatus(providerId, status);
    res.json({ item: updated });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Cập nhật trạng thái nhà cung cấp thất bại"
    });
  }
}

