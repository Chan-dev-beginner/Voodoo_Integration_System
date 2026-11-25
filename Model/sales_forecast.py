#!/usr/bin/env python3
"""
Sales Forecasting Model for Voodoo eSports Café.
Combines historical ("before") and current ("present") sales data to predict future sales
using least-squares linear regression and day-of-week seasonality weights.
"""

from collections import defaultdict
from datetime import datetime, timedelta
import json
import math
import sys


# Baseline past 14-day daily sales profile (₱) used when recorded history is still sparse.
HISTORICAL_BASELINE = [
    1850.0, 2100.0, 1980.0, 2240.0, 2650.0, 3120.0, 2950.0,
    2050.0, 2220.0, 2180.0, 2410.0, 2890.0, 3340.0, 3100.0,
]


def parse_date(value: str, fallback: datetime) -> datetime:
    if not value:
        return fallback
    cleaned = str(value).strip().replace(" ", "T")
    if cleaned.endswith("Z"):
        cleaned = cleaned[:-1]
    try:
        return datetime.fromisoformat(cleaned[:19])
    except ValueError:
        return fallback


def build_daily_series(orders, saved_shifts, today: datetime):
    today_key = today.strftime("%Y-%m-%d")
    recorded_by_day = defaultdict(lambda: {"sales": 0.0, "orders": 0})
    product_units = defaultdict(int)

    for order in orders or []:
        if not isinstance(order, dict):
            continue
        status = str(order.get("status", "completed")).lower()
        if status not in ("completed", ""):
            continue
        dt = parse_date(order.get("time") or order.get("created_at"), today)
        day_key = dt.strftime("%Y-%m-%d")
        recorded_by_day[day_key]["sales"] += float(order.get("total", 0) or 0)
        recorded_by_day[day_key]["orders"] += 1

        for item in order.get("items") or []:
            if isinstance(item, dict):
                name = str(item.get("name") or "").strip()
                qty = int(item.get("quantity", 0) or 0)
                if name and qty > 0:
                    product_units[name] += qty

    shift_by_day = defaultdict(lambda: {"sales": 0.0, "orders": 0})
    for shift in saved_shifts or []:
        if not isinstance(shift, dict):
            continue
        dt = parse_date(shift.get("logged_out_at") or shift.get("shift_started_at"), today)
        day_key = dt.strftime("%Y-%m-%d")
        shift_by_day[day_key]["sales"] += float(shift.get("total_sales", 0) or 0)
        shift_by_day[day_key]["orders"] += int(shift.get("total_orders", 0) or 0)

    # Merge recorded order totals and shift totals without double-counting the same day.
    merged_recorded = {}
    for day_key in set(recorded_by_day.keys()) | set(shift_by_day.keys()):
        ord_entry = recorded_by_day[day_key]
        shf_entry = shift_by_day[day_key]
        if shf_entry["sales"] > ord_entry["sales"]:
            merged_recorded[day_key] = shf_entry
        else:
            merged_recorded[day_key] = ord_entry

    # Build a 15-day series: past 14 days ("before") + today ("present").
    series = []
    for offset in range(-14, 1):
        day = today + timedelta(days=offset)
        day_key = day.strftime("%Y-%m-%d")
        if day_key in merged_recorded:
            entry = merged_recorded[day_key]
            sales = round(entry["sales"], 2)
            order_count = int(entry["orders"])
            source = "recorded"
        elif offset < 0:
            baseline_sales = HISTORICAL_BASELINE[(offset + 14) % len(HISTORICAL_BASELINE)]
            sales = round(baseline_sales, 2)
            order_count = max(1, round(baseline_sales / 165.0))
            source = "baseline"
        else:
            sales = 0.0
            order_count = 0
            source = "recorded"

        series.append({
            "date": day_key,
            "day": day.strftime("%a"),
            "weekday": day.weekday(),
            "sales": sales,
            "orders": order_count,
            "period": "present" if day_key == today_key else "before",
            "source": source,
        })

    return series, product_units


def linear_regression(values):
    n = len(values)
    if n < 2:
        avg = values[0] if values else 0.0
        return 0.0, avg
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    denom = sum((x - mean_x) ** 2 for x in xs)
    if denom == 0:
        return 0.0, mean_y
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values)) / denom
    intercept = mean_y - slope * mean_x
    return slope, intercept


def forecast_sales(payload):
    today = datetime.now()
    horizon_days = max(1, min(30, int(payload.get("horizonDays", 7) or 7)))
    orders = payload.get("orders") or []
    saved_shifts = payload.get("savedShiftSales") or []
    products = payload.get("products") or []

    series, product_units = build_daily_series(orders, saved_shifts, today)

    # Exclude an empty day-in-progress today from dragging down the regression slope.
    fit_points = [d for d in series if not (d["period"] == "present" and d["sales"] == 0)]
    if not fit_points:
        fit_points = series[:-1]

    fit_values = [d["sales"] for d in fit_points]
    slope, intercept = linear_regression(fit_values)
    overall_avg = sum(fit_values) / len(fit_values) if fit_values else 0.0

    # Day-of-week seasonality multipliers centered around 1.0.
    weekday_totals = defaultdict(list)
    for d in fit_points:
        weekday_totals[d["weekday"]].append(d["sales"])

    weekday_factor = {}
    for wd in range(7):
        if overall_avg > 0 and weekday_totals[wd]:
            raw = (sum(weekday_totals[wd]) / len(weekday_totals[wd])) / overall_avg
            weekday_factor[wd] = max(0.75, min(1.30, raw))
        else:
            weekday_factor[wd] = 1.0

    residuals = [
        d["sales"] - (intercept + slope * idx)
        for idx, d in enumerate(fit_points)
    ]
    std_err = math.sqrt(sum(r * r for r in residuals) / max(1, len(residuals) - 1))

    avg_order_value = 165.0
    total_recorded_sales = sum(d["sales"] for d in series if d["source"] == "recorded")
    total_recorded_orders = sum(d["orders"] for d in series if d["source"] == "recorded")
    if total_recorded_orders > 0 and total_recorded_sales > 0:
        avg_order_value = total_recorded_sales / total_recorded_orders

    predictions = []
    base_index = len(fit_values)
    for step in range(1, horizon_days + 1):
        future_day = today + timedelta(days=step)
        trend_val = max(0.0, intercept + slope * (base_index + step - 1))
        seasonal_val = trend_val * weekday_factor[future_day.weekday()]
        predicted = round(max(0.0, seasonal_val), 2)
        margin = round(1.28 * std_err, 2)
        predictions.append({
            "date": future_day.strftime("%Y-%m-%d"),
            "day": future_day.strftime("%a"),
            "sales": predicted,
            "lowerBound": round(max(0.0, predicted - margin), 2),
            "upperBound": round(predicted + margin, 2),
            "expectedOrders": max(1, round(predicted / max(1.0, avg_order_value))),
        })

    # Project 30-day total consistently using the same trend + seasonality curve.
    next_30_total = 0.0
    for step in range(1, 31):
        future_day = today + timedelta(days=step)
        trend_val = max(0.0, intercept + slope * (base_index + step - 1))
        next_30_total += max(0.0, trend_val * weekday_factor[future_day.weekday()])

    before_days = [d for d in series if d["period"] == "before"]
    present_day = next((d for d in series if d["period"] == "present"), {"sales": 0.0, "orders": 0})
    before_total = round(sum(d["sales"] for d in before_days), 2)
    before_avg = before_total / max(1, len(before_days))
    next_7_total = round(sum(p["sales"] for p in predictions[:7]), 2)
    future_daily_avg = sum(p["sales"] for p in predictions) / max(1, len(predictions))
    growth_pct = ((future_daily_avg - before_avg) / before_avg * 100.0) if before_avg > 0 else 0.0

    if growth_pct >= 3.0:
        trend_label = "Growing"
    elif growth_pct <= -3.0:
        trend_label = "Declining"
    else:
        trend_label = "Stable"

    total_units = sum(product_units.values())
    product_forecast = []
    for p in products:
        if not isinstance(p, dict):
            continue
        name = str(p.get("name") or "")
        stock = int(p.get("stock", 0) or 0)
        sold = int(product_units.get(name, 0))
        if total_units > 0:
            share = sold / total_units
            est_orders = sum(x["expectedOrders"] for x in predictions[:7])
            est_demand = max(1, round(share * est_orders * 1.4)) if sold > 0 else 2
        else:
            est_demand = 5
        advice = "Restock soon" if stock < est_demand else "Sufficient"
        product_forecast.append({
            "name": name,
            "sold": sold,
            "predictedDemand": est_demand,
            "currentStock": stock,
            "advice": advice,
        })

    product_forecast.sort(key=lambda item: (item["sold"], item["predictedDemand"]), reverse=True)

    return {
        "ok": True,
        "engine": "python",
        "modelName": "Linear Regression + Day-of-Week Seasonality",
        "horizonDays": horizon_days,
        "summary": {
            "beforeTotal": before_total,
            "beforeDailyAvg": round(before_avg, 2),
            "presentSales": round(present_day["sales"], 2),
            "presentOrders": int(present_day["orders"]),
            "predictedHorizonTotal": round(sum(p["sales"] for p in predictions), 2),
            "predictedNext7Days": next_7_total,
            "predictedNext30Days": round(next_30_total, 2),
            "predictedDailyAvg": round(future_daily_avg, 2),
            "growthPercent": round(growth_pct, 1),
            "trendLabel": trend_label,
        },
        "history": series,
        "predictions": predictions,
        "productForecast": product_forecast[:6],
    }


def main():
    raw = sys.stdin.read()
    payload = json.loads(raw) if raw.strip() else {}
    result = forecast_sales(payload)
    sys.stdout.write(json.dumps(result))


if __name__ == "__main__":
    main()
