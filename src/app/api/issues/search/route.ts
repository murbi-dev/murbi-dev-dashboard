import { NextResponse } from "next/server";
import { searchIssues } from "@/services/jira/issue-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  try {
    const payload = await searchIssues(query);

    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "no-store"
      }
    });
  } catch {
    return NextResponse.json(
      { error: "Não foi possível buscar issues" },
      { status: 500 }
    );
  }
}
