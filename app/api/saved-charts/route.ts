import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth/server";
import { getSessionUser } from "@/lib/auth/get-session";
import { getUserProfileByAuthId, getUserSavedCharts, saveChart, deleteSavedChart } from "@/lib/db";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getUserProfileByAuthId(sessionUser.id);
    if (!profile) return NextResponse.json({ charts: [] });

    const charts = await getUserSavedCharts(profile.id);
    return NextResponse.json({ charts });
  } catch (error) {
    console.error("[Charts GET]", error);
    return NextResponse.json({ error: "Failed to fetch charts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getUserProfileByAuthId(sessionUser.id);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const body = await request.json();
    const { collection_id, chart_type, title, config, insight_text } = body;

    if (!chart_type || !title || !config) {
      return NextResponse.json({ error: "chart_type, title, and config are required" }, { status: 400 });
    }

    const valid_types = ["bar", "pie", "donut", "horizontal_bar", "stat", "distribution", "comparison", "insight"];
    if (!valid_types.includes(chart_type)) {
      return NextResponse.json({ error: "Invalid chart_type" }, { status: 400 });
    }

    const chart = await saveChart({
      user_profile_id: profile.id,
      collection_id: collection_id ?? null,
      chart_type,
      title,
      config,
      insight_text: insight_text ?? null,
    });

    return NextResponse.json({ success: true, chart });
  } catch (error) {
    console.error("[Charts POST]", error);
    return NextResponse.json({ error: "Failed to save chart" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const profile = await getUserProfileByAuthId(sessionUser.id);
    if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const chartId = searchParams.get("id");
    if (!chartId) return NextResponse.json({ error: "id is required" }, { status: 400 });

    await deleteSavedChart(chartId, profile.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Charts DELETE]", error);
    return NextResponse.json({ error: "Failed to delete chart" }, { status: 500 });
  }
}
