import { NextResponse } from "next/server";
import { jiraIssueSearchService } from "@/services/jira/issue-search.service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";

  try {
    const payload = await jiraIssueSearchService.searchIssues(query);

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
