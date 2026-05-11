import {
  getGuideDashboardData,
  getGuideSchedules,
  getCurrentToursByGuide,
  getGuideCustomers,
  getGuideIncomeData,
  getGuideProfileData
} from "../models/guideModel.js";

const GUIDE_ID = 1;

function mapScheduleType(tour) {
  const now = new Date();
  const start = tour.start_date ? new Date(tour.start_date) : null;
  const end = tour.end_date ? new Date(tour.end_date) : null;

  if (tour.status === "archived") {
    return {
      type: "done",
      statusText: "Đã xong"
    };
  }

  if (
    start &&
    end &&
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    now >= start &&
    now <= end
  ) {
    return {
      type: "running",
      statusText: "Đang diễn ra"
    };
  }

  if (end && !Number.isNaN(end.getTime()) && now > end) {
    return {
      type: "done",
      statusText: "Đã xong"
    };
  }

  return {
    type: "upcoming",
    statusText: "Sắp diễn ra"
  };
}

function mapTourStatusText(status) {
  const map = {
    active: "Đang hoạt động",
    paused: "Tạm dừng",
    full: "Đã đủ khách",
    archived: "Đã xong",
    draft: "Nháp"
  };

  return map[status] || status || "Không xác định";
}

function mapIncomeStatusText(status) {
  const map = {
    active: "Đã phân công",
    full: "Đã đủ khách",
    archived: "Đã thanh toán"
  };

  return map[status] || "Đã ghi nhận";
}

export async function getGuideDashboardController(req, res) {
  try {
    const dashboard = await getGuideDashboardData(GUIDE_ID);

    return res.status(200).json({
      message: "Lấy dashboard guide thành công",
      data: {
        stats: {
          activeTours: Number(dashboard?.stats?.activeTours || 0),
          totalCustomers: Number(dashboard?.stats?.totalCustomers || 0),
          monthlyIncome: Number(dashboard?.stats?.monthlyIncome || 0),
          monthlyIncomeText: `${(
            Number(dashboard?.stats?.monthlyIncome || 0) / 1000000
          ).toFixed(1)}M`,
          completedTours: Number(dashboard?.stats?.completedTours || 0)
        },
        upcomingTours: Array.isArray(dashboard?.upcomingTours)
          ? dashboard.upcomingTours
          : []
      }
    });
  } catch (err) {
    console.error("❌ GUIDE DASHBOARD ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy dashboard guide",
      error: err.sqlMessage || err.message
    });
  }
}

export async function getGuideSchedulesController(req, res) {
  try {
    const filter = String(req.query.filter || "all").trim();
    const allowedFilters = ["all", "upcoming", "running", "done"];

    if (!allowedFilters.includes(filter)) {
      return res.status(400).json({
        message: "Bộ lọc không hợp lệ"
      });
    }

    const schedules = await getGuideSchedules(GUIDE_ID, filter);

    const data = schedules.map((tour) => {
      const mapped = mapScheduleType(tour);

      return {
        id: Number(tour.id),
        tourName: tour.title || "Chưa có tên tour",
        startDate: tour.start_date || null,
        endDate: tour.end_date || null,
        location: tour.location || "Chưa cập nhật",
        customers: Number(tour.max_capacity || 0),
        type: mapped.type,
        status: mapped.statusText
      };
    });

    return res.status(200).json({
      message: "Lấy lịch trình guide thành công",
      data
    });
  } catch (err) {
    console.error("❌ GUIDE SCHEDULE ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy lịch trình guide",
      error: err.sqlMessage || err.message
    });
  }
}

export async function getCurrentToursController(req, res) {
  try {
    const keyword = String(req.query.keyword || "").trim();

    const tours = await getCurrentToursByGuide(GUIDE_ID, keyword);

    const data = tours.map((tour) => ({
      id: Number(tour.id),
      name: tour.title || "Chưa có tên tour",
      customers: Number(tour.max_capacity || 0),
      startDate: tour.start_date || null,
      endDate: tour.end_date || null,
      duration: tour.duration_text || "Chưa cập nhật",
      location: tour.location || "Chưa cập nhật",
      status: tour.status || "active",
      statusText: mapTourStatusText(tour.status)
    }));

    return res.status(200).json({
      message: "Lấy danh sách tour đang dẫn thành công",
      data
    });
  } catch (err) {
    console.error("❌ GUIDE CURRENT TOURS ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy danh sách tour đang dẫn",
      error: err.sqlMessage || err.message
    });
  }
}

export async function getGuideCustomersController(req, res) {
  try {
    const keyword = String(req.query.keyword || "").trim();
    const tourFilter = String(req.query.tour || "all").trim();
    const tourIdRaw = req.query.tourId;
    const tourIdParsed =
      tourIdRaw != null && String(tourIdRaw).trim() !== ""
        ? Number(tourIdRaw)
        : NaN;
    const tourIdFilter = Number.isNaN(tourIdParsed) ? null : tourIdParsed;

    const customers = await getGuideCustomers(
      GUIDE_ID,
      keyword,
      tourFilter,
      tourIdFilter
    );

    const data = customers.map((customer) => {
      const phoneTrim =
        customer.phone == null ? "" : String(customer.phone).trim();
      return {
      id: Number(customer.id),
      tourId: Number(customer.tour_id),
      name: customer.customer_name || "Chưa có tên",
      phone: phoneTrim || null,
      email: customer.email || "Chưa cập nhật",
      tour: customer.tour_name || "Chưa có tour",
      tourDate: customer.tour_date || null
      };
    });

    return res.status(200).json({
      message: "Lấy danh sách khách hàng của guide thành công",
      data
    });
  } catch (err) {
    console.error("❌ GUIDE CUSTOMERS ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy danh sách khách hàng",
      error: err.sqlMessage || err.message
    });
  }
}

export async function getGuideIncomeController(req, res) {
  try {
    const range = Number(req.query.range || 6);
    const safeRange = [3, 6, 12].includes(range) ? range : 6;

    const incomeData = await getGuideIncomeData(GUIDE_ID, safeRange);

    return res.status(200).json({
      message: "Lấy dữ liệu thu nhập guide thành công",
      data: {
        stats: {
          totalIncome: Number(incomeData?.stats?.totalIncome || 0),
          monthlyIncome: Number(incomeData?.stats?.monthlyIncome || 0),
          averageIncomePerTour: Number(incomeData?.stats?.averageIncomePerTour || 0),
          completedTours: Number(incomeData?.stats?.completedTours || 0)
        },
        monthlyIncome: Array.isArray(incomeData?.monthlyIncome)
          ? incomeData.monthlyIncome
          : [],
        recentTransactions: Array.isArray(incomeData?.recentTransactions)
          ? incomeData.recentTransactions.map((item) => ({
              id: Number(item.id),
              tour: item.tour || "Chưa có tên tour",
              date: item.date || null,
              amount: Number(item.amount || 0),
              status: mapIncomeStatusText(item.status)
            }))
          : []
      }
    });
  } catch (err) {
    console.error("❌ GUIDE INCOME ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy dữ liệu thu nhập",
      error: err.sqlMessage || err.message
    });
  }
}
export async function getGuideProfileController(req, res) {
  try {
    const profile = await getGuideProfileData(GUIDE_ID);

    if (!profile) {
      return res.status(404).json({
        message: "Không tìm thấy hồ sơ hướng dẫn viên"
      });
    }

    return res.status(200).json({
      message: "Lấy hồ sơ guide thành công",
      data: profile
    });
  } catch (err) {
    console.error("❌ GUIDE PROFILE ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy hồ sơ guide",
      error: err.sqlMessage || err.message
    });
  }
}