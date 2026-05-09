import { NextResponse } from "next/server";
import { getDashboardData } from "@/services/jira/dashboard";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const payload = await getDashboardData();

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar os dados do painel" },
      { status: 500 }
    );
  }
}
