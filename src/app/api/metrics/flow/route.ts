import { NextRequest, NextResponse } from "next/server";
import { jiraFlowService } from "@/services/jira/flow.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const hotfixOnly = searchParams.get("hotfixOnly") === "true";

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Parâmetros startDate e endDate são obrigatórios." },
        { status: 400 }
      );
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      return NextResponse.json(
        { error: "Formato de data inválido. Use YYYY-MM-DD." },
        { status: 400 }
      );
    }

    const payload = await jiraFlowService.getFlowMetrics(startDate, endDate, hotfixOnly);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível carregar os dados de fluxo." },
      { status: 500 }
    );
  }
}
