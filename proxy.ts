import { NextRequest, NextResponse } from "next/server";
import { extractSkrLabelFromHost } from "@/app/lib/host";

export function proxy(request: NextRequest) {
  const label = extractSkrLabelFromHost(request.headers.get("host"));
  if (!label) return NextResponse.next();

  const url = request.nextUrl.clone();
  if (url.pathname === "/" || url.pathname === "") {
    url.pathname = `/resolve/${label}`;
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|seeker).*)"],
};
